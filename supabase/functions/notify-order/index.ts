/**
 * Edge Function `notify-order` — envoie les notifications push d'une commande.
 *
 * Déploiement :
 *   supabase functions deploy notify-order
 *
 * ⚠️ SANS `--no-verify-jwt` : le déclencheur SQL envoie déjà la clé service_role
 * en en-tête Authorization, donc Supabase peut vérifier l'appelant. Désactiver
 * la vérification rendrait cette URL publiquement appelable — n'importe qui
 * pourrait déclencher des notifications sur une commande dont il devine l'id.
 *
 * Appelée par le trigger `orders_notify_change` (supabase_notifications.sql) :
 *   - INSERT  → prévenir le RESTAURANT qu'une commande arrive
 *   - UPDATE  → prévenir le CLIENT que son statut a changé
 *
 * C'est cette fonction qui rend le produit utilisable dans la vraie vie : sans
 * elle, personne n'apprend rien tant que l'app n'est pas ouverte — un restaurant
 * ne voit pas la commande, un client ne sait pas qu'elle est acceptée.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { pushLiveActivity, apnsConfigured, type LiveActivityContentState } from './apns.ts';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/**
 * Doit rester aligné sur STATUS_META (src/lib/orderStatus.ts) : `headline` et
 * `progress` alimentent aussi la Live Activity, où un écart se verrait
 * directement sur l'écran verrouillé.
 */
const STATUS_COPY: Record<string, { title: string; body: string; progress: number }> = {
    ACCEPTED: { title: 'Commande validée', body: 'Le restaurant a accepté votre commande.', progress: 0.25 },
    PREPARING: { title: 'En cuisine', body: 'Vos plats sont en préparation.', progress: 0.45 },
    READY: { title: 'Commande prête', body: 'Votre commande est prête, en attente de départ.', progress: 0.65 },
    OUT_FOR_DELIVERY: { title: 'En route vers vous', body: 'Le restaurant vous livre en ce moment.', progress: 0.85 },
    DELIVERED: { title: 'Livrée · Bon appétit !', body: 'Merci pour votre commande.', progress: 1 },
    CANCELLED: { title: 'Commande annulée', body: 'Votre commande a été annulée.', progress: 0 },
};

/** Doit rester aligné sur CANCELLATION_COPY (src/lib/orderStatus.ts). */
const CANCELLATION_BODY: Record<string, string> = {
    OUT_OF_STOCK: "Un plat de votre commande n'est plus disponible.",
    CLOSED: 'Le restaurant est exceptionnellement fermé.',
    ADDRESS_NOT_SERVED: "Le restaurant ne livre pas à cette adresse.",
    CUSTOMER_UNREACHABLE: "Le restaurant n'a pas réussi à vous joindre pour la livraison.",
    CUSTOMER: 'Vous avez annulé cette commande.',
    NO_RESPONSE: "Le restaurant n'a pas confirmé à temps. Aucun montant ne vous sera demandé.",
    ABANDONED: "Cette commande n'a pas été clôturée par le restaurant.",
    OTHER: "Le restaurant a dû annuler. Contactez l'assistance pour en savoir plus.",
};

/** Push copy for a status, with the cancellation reason spelled out. */
function copyFor(record: { status: string; cancellation_reason?: string | null }) {
    const copy = STATUS_COPY[record.status];
    if (!copy) return copy;
    if (record.status !== 'CANCELLED') return copy;
    return { ...copy, body: CANCELLATION_BODY[record.cancellation_reason ?? ''] ?? copy.body };
}

const TERMINAL = new Set(['DELIVERED', 'CANCELLED']);

// Le Tchad est à UTC+1 toute l'année : pas d'heure d'été à gérer. L'app calcule
// la même heure d'arrivée avec l'horloge locale de l'appareil (src/lib/eta.ts).
const CHAD_UTC_OFFSET_HOURS = 1;

interface OrderRow {
    id: string;
    status: string;
    customer_id: string | null;
    restaurant_id: string | null;
    customer_name: string | null;
    restaurant_name: string | null;
    delivery_zone: string | null;
    total_xaf: number | null;
    created_at: string | null;
    eta_minutes: number | null;
    updated_at: string | null;
    cancellation_reason?: string | null;
    accepted_at?: string | null;
}

/** « 19h45 » — même règle que arrivalTimeLabel côté app. */
function arrivalLabel(createdAt: string | null, etaMinutes: number | null): string {
    if (!createdAt || !etaMinutes) return 'Bientôt';
    const placed = new Date(createdAt).getTime();
    if (Number.isNaN(placed)) return 'Bientôt';
    const arrival = new Date(placed + etaMinutes * 60_000 + CHAD_UTC_OFFSET_HOURS * 3_600_000);
    return `${arrival.getUTCHours()}h${String(arrival.getUTCMinutes()).padStart(2, '0')}`;
}

const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

/** Tous les appareils enregistrés pour ces utilisateurs. */
type PushDevice = { token: string; platform: string; progress_version: number };
async function tokensForUsers(userIds: string[]): Promise<PushDevice[]> {
    if (userIds.length === 0) return [];
    const { data, error } = await admin.from('push_tokens').select('token, platform, progress_version').in('user_id', userIds);
    if (error) {
        throw error;
    }
    return (data ?? []) as PushDevice[];
}

/** Les comptes rattachés au restaurant (profiles.restaurant_id). */
async function restaurantUserIds(restaurantId: string): Promise<string[]> {
    const { data, error } = await admin.from('profiles').select('id').eq('restaurant_id', restaurantId);
    if (error) {
        throw error;
    }
    return (data ?? []).map((r: { id: string }) => r.id);
}

/** Refus Expo propres à un appareil ou au message : les réessayer ne change rien. */
const PERMANENT_TICKET_ERRORS = new Set(['InvalidCredentials', 'MessageTooBig', 'MismatchSenderId']);

/**
 * Envoie un push à chaque appareil au plus une fois par événement (hors panne
 * entre l'acceptation Expo et l'écriture du reçu). Renvoie les refus définitifs,
 * qui clôturent l'événement avec leur cause au lieu de le rejouer pendant des
 * heures — et de re-sonner chez tous les autres appareils à chaque reprise.
 */
async function sendPush(
    devices: PushDevice[],
    title: string,
    body: string,
    data: Record<string, unknown>,
    channelId: string,
    eventId: string,
): Promise<string[]> {
    if (devices.length === 0) return [];
    // Appareils déjà acceptés par Expo lors d'une tentative précédente ; un reçu
    // MessageRateExceeded remet volontairement le sien dans la file.
    const { data: served, error: servedError } = await admin.from('order_push_receipts')
        .select('token').eq('event_id', eventId).or('error.is.null,error.neq.MessageRateExceeded');
    if (servedError) throw servedError;
    const already = new Set((served ?? []).map((row: { token: string }) => row.token));
    const tokens = devices.filter(device => !already.has(device.token));
    const permanent: string[] = [];
    // Expo accepte jusqu'à 100 messages par requête.
    for (let i = 0; i < tokens.length; i += 100) {
        const batch = tokens.slice(i, i + 100).map(device => {
            // Older installed binaries retain normal visible pushes until rebuilt.
            if (device.platform === 'android' && device.progress_version >= 1 && data.kind === 'order-status') {
                return { to: device.token, priority: 'high', data: { ...data, statusTitle: title, statusBody: body } };
            }
            return { to: device.token, title, body, data, sound: 'default', priority: 'high', channelId };
        });
        try {
            const response = await fetch(EXPO_PUSH_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch),
            });
            if (!response.ok) throw new Error(`Expo push HTTP ${response.status}`);
            const result = await response.json();
            if (result.errors?.length || !Array.isArray(result.data) || result.data.length !== batch.length) throw new Error('Invalid Expo push response');
            const receipts = [];
            let retry = false;
            for (let j = 0; j < result.data.length; j++) {
                const ticket = result.data[j];
                if (ticket.status === 'ok' && ticket.id) {
                    receipts.push({ id: ticket.id, event_id: eventId, token: batch[j].to });
                } else if (ticket.details?.error === 'DeviceNotRegistered') {
                    const { error } = await admin.from('push_tokens').delete().eq('token', batch[j].to);
                    if (error) throw error;
                } else if (PERMANENT_TICKET_ERRORS.has(ticket.details?.error)) {
                    permanent.push(ticket.details.error);
                } else { retry = true; }
            }
            if (receipts.length) {
                const { error } = await admin.from('order_push_receipts').upsert(receipts, { onConflict: 'id' });
                if (error) throw error;
            }
            if (retry) throw new Error('Expo rejected a push ticket');
        } catch (e) {
            throw e;
        }
    }
    return [...new Set(permanent)];
}

/**
 * Fait avancer la Live Activity de l'iPhone du client.
 *
 * C'est la moitié qui manquait : sans push, l'activité ne bougeait que lorsque
 * l'app tournait — donc jamais au moment où l'on regarde son écran verrouillé.
 * Sur un statut terminal on clôt l'activité (elle reste visible quelques
 * minutes) et on supprime le jeton, devenu inutile.
 */
async function updateLiveActivity(
    order: OrderRow,
    copy: { title: string; progress: number },
): Promise<string | null> {
    const { data, error } = await admin
        .from('live_activity_tokens')
        .select('token')
        .eq('order_id', order.id)
        .maybeSingle();

    if (error) throw error;
    if (!data?.token) return null;
    if (!apnsConfigured()) throw new Error('APNs configuration missing for active token');

    const terminal = TERMINAL.has(order.status);
    const state: LiveActivityContentState = {
        status: copy.title,
        deliveryTime: terminal
            ? (order.status === 'DELIVERED' ? 'Livrée' : '—')
            : arrivalLabel(order.accepted_at ?? order.created_at, order.eta_minutes),
        courierName: terminal
            ? (order.status === 'DELIVERED' ? 'Merci pour votre commande' : '')
            : (order.delivery_zone ? `Vers ${order.delivery_zone}` : 'Livraison par le restaurant'),
        progress: copy.progress,
    };

    const result = await pushLiveActivity(data.token, state, { event: terminal ? 'end' : 'update', timestamp: Math.floor(Date.parse(order.updated_at ?? order.created_at ?? '') / 1000) });
    if (result.outcome === 'retry') throw new Error(`APNs delivery failed: ${result.reason}`);

    // Un jeton révoqué ne servira plus : le garder referait échouer chaque statut.
    if (terminal || result.outcome === 'gone') {
        await admin.from('live_activity_tokens').delete().eq('order_id', order.id);
    }
    return result.outcome === 'rejected' ? `APNs ${result.reason}` : null;
}

async function checkReceipts() {
    const now = new Date().toISOString();
    const { data: pending, error } = await admin.from('order_push_receipts').select('*').is('checked_at', null).lte('check_after', now).limit(1000);
    if (error) throw error;
    if (!pending?.length) return;
    const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: pending.map(row => row.id) }),
    });
    if (!response.ok) throw new Error('Receipt service unavailable');
    const result = await response.json();
    if (!result.data || result.errors?.length) throw new Error('Invalid receipt response');
    for (const row of pending) {
        const receipt = result.data[row.id];
        const expired = Date.now() - Date.parse(row.created_at) > 24 * 3600000;
        if (!receipt && !expired) {
            const { error } = await admin.from('order_push_receipts').update({ check_after: new Date(Date.now()+15*60000).toISOString() }).eq('id', row.id);
            if (error) throw error;
            continue;
        }
        const code = receipt?.status === 'ok' ? null : receipt?.details?.error ?? 'ReceiptUnavailable';
        if (code === 'DeviceNotRegistered') {
            const { error } = await admin.from('push_tokens').delete().eq('token', row.token);
            if (error) throw error;
        }
        if (code === 'MessageRateExceeded') {
            const { error } = await admin.from('order_notification_events').update({ completed_at: null, push_sent: false, next_attempt_at: new Date(Date.now()+60000).toISOString() }).eq('id', row.event_id);
            if (error) throw error;
        }
        const { error } = await admin.from('order_push_receipts').update({ checked_at: now, error: code }).eq('id', row.id);
        if (error) throw error;
    }
}

Deno.serve(async (request) => {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
        return new Response('Unauthorized', { status: 401 });
    }
    let claimed: { id: string; claim_id: string; order_id: string; event_type: string; status: string; order_updated_at: string; push_sent: boolean; activity_sent: boolean } | null = null;
    const save = async (patch: Record<string, unknown>) => {
        if (!claimed) return;
        const { error } = await admin.from('order_notification_events').update(patch).eq('id', claimed.id).eq('claim_id', claimed.claim_id);
        if (error) throw error;
    };
    try {
        const payload = await request.json();
        if (payload?.check_receipts === true) { await checkReceipts(); return new Response('receipts checked'); }
        if (typeof payload?.event_id !== 'string') return new Response('event_id required', { status: 400 });
        const { data: rows, error: claimError } = await admin.rpc('claim_order_notification', { event_id: payload.event_id });
        if (claimError) throw claimError;
        claimed = rows?.[0] ?? null;
        if (!claimed) return new Response('already handled or leased', { status: 200 });
        const { data: record, error } = await admin.from('orders').select('*').eq('id', claimed.order_id).single();
        if (error) throw error;
        // Always tell a restaurant about a still-live order, even if its INSERT
        // event was delayed. Status updates that have been superseded are skipped.
        // An INSERT replayed after the kitchen already answered must not say
        // « attend votre confirmation » again.
        const stale = claimed.event_type === 'UPDATE'
            ? record.status !== claimed.status || Date.parse(record.updated_at) !== Date.parse(claimed.order_updated_at)
            : record.status !== 'PENDING';
        const warnings: string[] = [];
        if (!stale) {
            if (!claimed.push_sent) {
                if (claimed.event_type === 'INSERT' && record.restaurant_id) {
                    const devices = await tokensForUsers(await restaurantUserIds(record.restaurant_id));
                    // Closed with a visible cause: nobody would otherwise notice a
                    // restaurant that never registered a device.
                    if (devices.length === 0) warnings.push('RestaurantWithoutDevice');
                    warnings.push(...await sendPush(devices,
                        'Nouvelle commande', `${record.customer_name ?? 'Un client'} attend votre confirmation.`,
                        { kind: 'new-order', orderId: record.id }, 'new-orders', claimed.id));
                } else {
                    const copy = copyFor(record);
                    if (copy && record.customer_id) warnings.push(...await sendPush(await tokensForUsers([record.customer_id]), copy.title, copy.body,
                        { kind: 'order-status', orderId: record.id, customerId: record.customer_id, status: record.status, updatedAt: record.updated_at }, 'order-updates', claimed.id));
                }
                await save({ push_sent: true });
            }
            if (!claimed.activity_sent) {
                const copy = STATUS_COPY[record.status];
                const warning = claimed.event_type === 'UPDATE' && copy ? await updateLiveActivity(record, copy) : null;
                if (warning) warnings.push(warning);
                await save({ activity_sent: true });
            }
        }
        // Refus définitifs : l'événement est clos, mais sa cause reste consultable.
        await save({ completed_at: new Date().toISOString(), locked_until: null, last_error: warnings.length ? warnings.join(', ') : null });
        return new Response('ok', { status: 200 });
    } catch (error) {
        // next_attempt_at was persisted when claiming, even if this process dies.
        await save({ locked_until: null, last_error: 'notification delivery failed' }).catch(() => {});
        console.error('notify-order failed', error);
        return new Response('retry scheduled', { status: 500 });
    }
});

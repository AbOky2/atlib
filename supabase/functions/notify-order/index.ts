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
    READY: { title: 'Commande prête', body: 'Votre commande part en livraison.', progress: 0.65 },
    OUT_FOR_DELIVERY: { title: 'En route vers vous', body: 'Le restaurant vous livre en ce moment.', progress: 0.85 },
    DELIVERED: { title: 'Livrée · Bon appétit !', body: 'Merci pour votre commande.', progress: 1 },
    CANCELLED: { title: 'Commande annulée', body: 'Votre commande a été annulée.', progress: 0 },
};

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
async function tokensForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const { data, error } = await admin.from('push_tokens').select('token').in('user_id', userIds);
    if (error) {
        console.error('lecture des tokens échouée', error);
        return [];
    }
    return (data ?? []).map((r: { token: string }) => r.token);
}

/** Les comptes rattachés au restaurant (profiles.restaurant_id). */
async function restaurantUserIds(restaurantId: string): Promise<string[]> {
    const { data, error } = await admin.from('profiles').select('id').eq('restaurant_id', restaurantId);
    if (error) {
        console.error('lecture des profils restaurant échouée', error);
        return [];
    }
    return (data ?? []).map((r: { id: string }) => r.id);
}

async function sendPush(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, unknown>,
    channelId: string,
) {
    if (tokens.length === 0) return;
    // Expo accepte jusqu'à 100 messages par requête.
    for (let i = 0; i < tokens.length; i += 100) {
        const batch = tokens.slice(i, i + 100).map((to) => ({
            to,
            title,
            body,
            data,
            sound: 'default',
            priority: 'high',
            channelId,
        }));
        try {
            const response = await fetch(EXPO_PUSH_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch),
            });
            if (!response.ok) console.error('Expo push a répondu', response.status, await response.text());
        } catch (e) {
            console.error('envoi push échoué', e);
        }
    }
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
): Promise<void> {
    if (!apnsConfigured()) return;

    const { data, error } = await admin
        .from('live_activity_tokens')
        .select('token')
        .eq('order_id', order.id)
        .maybeSingle();

    if (error || !data?.token) return;

    const terminal = TERMINAL.has(order.status);
    const state: LiveActivityContentState = {
        status: copy.title,
        deliveryTime: terminal
            ? (order.status === 'DELIVERED' ? 'Livrée' : '—')
            : arrivalLabel(order.created_at, order.eta_minutes),
        courierName: terminal
            ? (order.status === 'DELIVERED' ? 'Merci pour votre commande' : '')
            : (order.delivery_zone ? `Vers ${order.delivery_zone}` : 'Livraison par le restaurant'),
        progress: copy.progress,
    };

    await pushLiveActivity(data.token, state, { event: terminal ? 'end' : 'update' });

    if (terminal) {
        await admin.from('live_activity_tokens').delete().eq('order_id', order.id);
    }
}

Deno.serve(async (request) => {
    try {
        const payload = await request.json();
        const record: OrderRow | undefined = payload?.record;
        const type: string = payload?.type;
        if (!record?.id) return new Response('ignoré', { status: 200 });

        if (type === 'INSERT') {
            // Nouvelle commande → le restaurant, tout de suite.
            if (!record.restaurant_id) return new Response('ok', { status: 200 });
            const userIds = await restaurantUserIds(record.restaurant_id);
            const tokens = await tokensForUsers(userIds);
            await sendPush(
                tokens,
                'Nouvelle commande',
                `${record.customer_name ?? 'Un client'} attend votre confirmation.`,
                { kind: 'new-order', orderId: record.id },
                'new-orders',
            );
            return new Response('ok', { status: 200 });
        }

        // Une UPDATE qui ne change pas le statut n'intéresse personne.
        //
        // Le déclencheur SQL filtre déjà (`AFTER UPDATE OF status`), mais un
        // Database Webhook, lui, se déclenche sur TOUTE modification de la
        // ligne — ne serait-ce que le `updated_at` posé par touch_updated_at().
        // Sans ce garde, le client recevrait la même notification plusieurs
        // fois pour une seule étape.
        const previous = payload?.old_record;
        if (previous && previous.status === record.status) {
            return new Response('statut inchangé', { status: 200 });
        }

        // Changement de statut → le client.
        const copy = STATUS_COPY[record.status];
        if (!copy || !record.customer_id) return new Response('ok', { status: 200 });

        const tokens = await tokensForUsers([record.customer_id]);
        await Promise.all([
            sendPush(tokens, copy.title, copy.body, { kind: 'order-status', orderId: record.id }, 'order-updates'),
            updateLiveActivity(record, copy),
        ]);
        return new Response('ok', { status: 200 });
    } catch (e) {
        console.error('notify-order a échoué', e);
        // On répond 200 : réessayer n'aiderait pas et le trigger ne doit rien bloquer.
        return new Response('erreur consignée', { status: 200 });
    }
});

/**
 * Client APNs minimal — juste ce qu'il faut pour piloter une Live Activity.
 *
 * Apple authentifie par un JWT ES256 signé avec une clé .p8. On le fabrique avec
 * la Web Crypto de Deno : `crypto.subtle` produit une signature ECDSA au format
 * brut r‖s, qui est exactement ce que JOSE attend — aucune conversion DER.
 *
 * Le jeton est valable une heure ; on le garde en mémoire et on le renouvelle
 * bien avant l'expiration (Apple rejette un jeton de plus de 60 min et limite la
 * fréquence de génération).
 *
 * Secrets à définir : supabase secrets set APNS_KEY_ID=... APNS_TEAM_ID=...
 *   APNS_BUNDLE_ID=... APNS_ENV=sandbox|production APNS_PRIVATE_KEY="$(cat AuthKey.p8)"
 */

// ⚠️ Ce qui est entre guillemets est le NOM du secret à lire, pas sa valeur.
// Y mettre l'identifiant lui-même ferait chercher un secret appelé
// « L6797DC5NK », qui n'existe pas — la fonction repartirait avec une chaîne
// vide et cesserait d'envoyer, sans la moindre erreur. Les valeurs se déclarent
// dans Supabase → Edge Functions → Secrets ; ce fichier ne doit pas changer.
const KEY_ID = Deno.env.get('APNS_KEY_ID') ?? '';
const TEAM_ID = Deno.env.get('APNS_TEAM_ID') ?? '';
const BUNDLE_ID = Deno.env.get('APNS_BUNDLE_ID') ?? '';
const PRIVATE_KEY_PEM = Deno.env.get('APNS_PRIVATE_KEY') ?? '';
// Un build de développement parle au bac à sable, un build App Store à la prod.
// Se tromper d'hôte donne un 400 « BadDeviceToken » parfaitement muet.
const HOST =
    (Deno.env.get('APNS_ENV') ?? 'production') === 'sandbox'
        ? 'https://api.sandbox.push.apple.com'
        : 'https://api.push.apple.com';

export const apnsConfigured = () => !!(KEY_ID && TEAM_ID && BUNDLE_ID && PRIVATE_KEY_PEM);

const base64url = (input: ArrayBuffer | string): string => {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Décode le corps base64 d'un fichier .p8 en DER PKCS#8. */
function pemToDer(pem: string): Uint8Array {
    const body = pem
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s+/g, '');
    const binary = atob(body);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

let cachedKey: CryptoKey | null = null;
let cachedToken: { value: string; issuedAt: number } | null = null;

async function signingKey(): Promise<CryptoKey> {
    if (cachedKey) return cachedKey;
    cachedKey = await crypto.subtle.importKey(
        'pkcs8',
        pemToDer(PRIVATE_KEY_PEM),
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign'],
    );
    return cachedKey;
}

async function authToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    // Renouvellement à 50 min : large marge sous la limite d'une heure.
    if (cachedToken && now - cachedToken.issuedAt < 3000) return cachedToken.value;

    const header = base64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID }));
    const payload = base64url(JSON.stringify({ iss: TEAM_ID, iat: now }));
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        await signingKey(),
        new TextEncoder().encode(`${header}.${payload}`),
    );

    const value = `${header}.${payload}.${base64url(signature)}`;
    cachedToken = { value, issuedAt: now };
    return value;
}

/** L'état exact attendu par ChadDeliveryAttributes.ContentState (Swift). */
export interface LiveActivityContentState {
    status: string;
    deliveryTime: string;
    courierName: string;
    progress: number;
}

/**
 * Issue d'un envoi, classée pour la file : seul `retry` justifie de réessayer.
 * `gone` : Apple a révoqué le jeton (410) ; `rejected` : refus définitif (4xx) —
 * réessayer ne ferait que répéter le refus pendant des heures.
 */
export type ApnsResult = { outcome: 'sent' | 'retry' | 'gone' | 'rejected'; reason: string };

/**
 * Pousse un nouvel état vers une Live Activity.
 *
 * `event: 'end'` clôt l'activité ; `dismissal-date` la laisse visible quelques
 * minutes pour que la commande se termine sur un écran plutôt que de disparaître.
 */
export async function pushLiveActivity(
    token: string,
    state: LiveActivityContentState,
    options: { event: 'update' | 'end'; alert?: { title: string; body: string }; dismissInSeconds?: number; timestamp?: number },
): Promise<ApnsResult> {
    if (!apnsConfigured()) return { outcome: 'retry', reason: 'APNs non configuré' };

    const now = Math.floor(Date.now() / 1000);
    const aps: Record<string, unknown> = {
        timestamp: Number.isFinite(options.timestamp) ? options.timestamp : now,
        event: options.event,
        'content-state': state,
    };
    if (options.alert) aps.alert = options.alert;
    if (options.event === 'end') {
        aps['dismissal-date'] = now + (options.dismissInSeconds ?? 240);
    }

    try {
        const response = await fetch(`${HOST}/3/device/${token}`, {
            method: 'POST',
            headers: {
                authorization: `bearer ${await authToken()}`,
                // Le canal Live Activity a son propre sujet, dérivé du bundle id.
                'apns-topic': `${BUNDLE_ID}.push-type.liveactivity`,
                'apns-push-type': 'liveactivity',
                'apns-priority': '10',
                'content-type': 'application/json',
            },
            body: JSON.stringify({ aps }),
        });

        if (response.ok) return { outcome: 'sent', reason: '' };
        const body = await response.text();
        let reason = `HTTP ${response.status}`;
        try { reason = JSON.parse(body).reason ?? reason; } catch { /* corps non JSON */ }
        console.error('APNs a refusé la mise à jour', response.status, reason);
        if (response.status === 410) return { outcome: 'gone', reason };
        // 403 couvre aussi le JWT expiré ; 429 et 5xx sont transitoires.
        if (response.status === 403 || response.status === 429 || response.status >= 500) return { outcome: 'retry', reason };
        return { outcome: 'rejected', reason };
    } catch (e) {
        console.error('envoi APNs impossible', e);
        return { outcome: 'retry', reason: 'réseau APNs indisponible' };
    }
}

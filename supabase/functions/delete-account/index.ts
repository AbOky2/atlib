/**
 * Edge Function `delete-account` — supprime le compte de l'appelant.
 *
 * Déploiement :
 *   supabase functions deploy delete-account
 *
 * ⚠️ SANS `--no-verify-jwt` : la passerelle vérifie le jeton de l'utilisateur ;
 * la fonction relit ensuite l'identité depuis ce même jeton, jamais depuis le
 * corps de la requête. Personne ne peut donc supprimer un autre compte.
 *
 * Ordre volontaire, pour qu'une panne au milieu laisse un état rattrapable :
 *   1. erase_customer_data(uid)   — SQL, service_role : refuse s'il reste une
 *      commande en cours ou si le compte est un compte restaurant/admin,
 *      sinon anonymise les commandes et supprime jetons + profil.
 *   2. auth.admin.deleteUser(uid) — retire l'identité.
 * Si 2 échoue, l'utilisateur existe encore avec des données déjà effacées et
 * peut relancer : 1 est idempotent.
 *
 * Réponses : 200 {ok:true} · 401 · 409 {error:'ACTIVE_ORDER'} ·
 * 403 {error:'STAFF_ACCOUNT'} · 500 {error:'DELETE_FAILED'}.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BLOCKERS: Record<string, number> = { ACTIVE_ORDER: 409, STAFF_ACCOUNT: 403 };

function json(status: number, body: Record<string, unknown>): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });
    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) return json(401, { error: 'UNAUTHENTICATED' });

    // Identity comes from the verified token, never from the payload.
    const asCaller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await asCaller.auth.getUser();
    if (userError || !user) return json(401, { error: 'UNAUTHENTICATED' });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { error: eraseError } = await admin.rpc('erase_customer_data', { p_user: user.id });
    if (eraseError) {
        const status = BLOCKERS[eraseError.message] ?? 500;
        if (status === 500) console.error('erase_customer_data', user.id, eraseError.message);
        return json(status, { error: status === 500 ? 'DELETE_FAILED' : eraseError.message });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
        console.error('auth.admin.deleteUser', user.id, deleteError.message);
        return json(500, { error: 'DELETE_FAILED' });
    }
    return json(200, { ok: true });
});

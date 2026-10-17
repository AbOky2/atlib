#!/usr/bin/env node
/**
 * Restaurant automatique — fait avancer les commandes d'un ou plusieurs comptes
 * de démonstration comme le ferait un gérant devant son dashboard : acceptée,
 * en cuisine, prête, en route, livrée. Chaque étape déclenche la notification
 * au client, exactement comme en production.
 *
 * Pourquoi : pendant une revue (App Store, Google Play) ou un test, personne ne
 * veille sur le dashboard ; sans ce script, une commande de l'examinateur reste
 * « en attente » puis expire au bout de 20 minutes, et il ne voit jamais le suivi.
 *
 * Il se connecte avec un compte GÉRANT (profiles.role = 'restaurant', rattaché
 * à un restaurant) : la base n'autorise ces transitions à personne d'autre. Il
 * ne touche qu'aux commandes des clients listés — jamais à celles d'un vrai
 * client — et refuse de démarrer si le compte n'est rattaché à aucun restaurant.
 *
 * Usage :
 *   AUTO_RESTAURANT_EMAIL=gerant@… AUTO_RESTAURANT_PASSWORD=… \
 *   AUTO_RESTAURANT_CUSTOMERS=testadmin@test.td:test1234 \
 *   node scripts/auto-restaurant.cjs [--dry-run] [--once] [--pace=45]
 *
 * AUTO_RESTAURANT_CUSTOMERS liste les comptes de démonstration surveillés,
 * « email:motdepasse » séparés par des virgules : les commandes ne portent que
 * l'identifiant du client, et le script l'obtient en se connectant une fois à
 * chaque compte (jamais stocké, jamais affiché). Un vrai client n'est donc
 * jamais touché. --pace : secondes entre deux étapes (45 par défaut) ; --once
 * traite ce qui attend puis s'arrête ; sinon il scrute toutes les 15 s.
 * Les variables peuvent aussi venir de .env / .env.local.
 */
try { process.env.NODE_ENV = process.env.NODE_ENV || 'production'; require('@expo/env').load(require('node:path').resolve(__dirname, '..'), { silent: true }); } catch { /* sans Expo */ }
const { createClient } = require('@supabase/supabase-js');

const arg = (name, fallback) => { const hit = process.argv.find((a) => a.startsWith(`--${name}=`)); return hit ? hit.slice(name.length + 3) : fallback; };
const has = (name) => process.argv.includes(`--${name}`);

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://myonaycuggsbielvdzjc.supabase.co';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15b25heWN1Z2dzYmllbHZkempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODcxOTUsImV4cCI6MjA4ODU2MzE5NX0.RYSXIvHNtmYotjrjuSO3PcU1tRzSRFtZCdnO95FQzGk';
const EMAIL = process.env.AUTO_RESTAURANT_EMAIL;
const PASSWORD = process.env.AUTO_RESTAURANT_PASSWORD;
const CUSTOMERS = (process.env.AUTO_RESTAURANT_CUSTOMERS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    .map((pair) => { const i = pair.indexOf(':'); return { email: pair.slice(0, i).toLowerCase(), password: pair.slice(i + 1) }; });
const PACE_MS = Number(arg('pace', '45')) * 1000;
const POLL_MS = 15_000;
const DRY = has('dry-run');
const ONCE = has('once');

/** Le chemin d'une commande, dans l'ordre où le client le voit. */
const FLOW = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const NEXT = Object.fromEntries(FLOW.map((s, i) => [s, FLOW[i + 1]]));

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    if (!EMAIL || !PASSWORD) {
        console.error('AUTO_RESTAURANT_EMAIL et AUTO_RESTAURANT_PASSWORD sont requis (compte gérant).');
        process.exit(2);
    }
    const supabase = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: true } });
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    if (authError) { console.error('Connexion refusée :', authError.message); process.exit(2); }

    const { data: restaurantId, error: ridError } = await supabase.rpc('my_restaurant_id');
    if (ridError || !restaurantId) {
        console.error(`Le compte ${EMAIL} n'est rattaché à aucun restaurant : exécutez supabase_test_users.sql (SQL Editor) pour le promouvoir.`);
        process.exit(2);
    }
    const { data: resto } = await supabase.from('restaurants').select('name, is_accepting_orders').eq('id', restaurantId).single();
    log(`connecté comme ${EMAIL} → restaurant « ${resto?.name ?? restaurantId} »${resto?.is_accepting_orders === false ? ' (FERMÉ : ouvrez-le dans le dashboard)' : ''}`);

    if (!CUSTOMERS.length || CUSTOMERS.some((c) => !c.email || !c.password)) {
        console.error('AUTO_RESTAURANT_CUSTOMERS est requis : « email:motdepasse,… » des comptes de démonstration.');
        process.exit(2);
    }
    // Une commande ne porte que customer_id : chaque compte surveillé est résolu
    // par une connexion éphémère (client séparé, session non conservée).
    const customerIds = new Map();
    for (const c of CUSTOMERS) {
        const probe = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data, error } = await probe.auth.signInWithPassword({ email: c.email, password: c.password });
        if (error || !data.user) { console.error(`Compte de démonstration ${c.email} : connexion refusée (${error?.message ?? 'inconnu'}).`); process.exit(2); }
        customerIds.set(data.user.id, c.email);
        await probe.auth.signOut();
    }
    log(`clients surveillés : ${[...customerIds.values()].join(', ')}${DRY ? ' — mode à blanc, aucune écriture' : ''}`);

    const handled = new Map(); // orderId → dernier passage
    do {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, status, customer_id, created_at')
            .eq('restaurant_id', restaurantId)
            .in('customer_id', [...customerIds.keys()])
            .in('status', FLOW.slice(0, -1))
            .order('created_at', { ascending: true });
        if (error) { log('lecture impossible :', error.message); if (ONCE) break; await sleep(POLL_MS); continue; }
        const mine = orders ?? [];
        for (const o of mine) {
            const last = handled.get(o.id) ?? 0;
            if (Date.now() - last < PACE_MS) continue;            // on laisse chaque étape visible un moment
            const to = NEXT[o.status];
            if (!to) continue;
            if (DRY) { log(`[à blanc] ${o.id.slice(0, 8)} (${customerIds.get(o.customer_id)}) ${o.status} → ${to}`); handled.set(o.id, Date.now()); continue; }
            const { data, error: upErr } = await supabase.from('orders').update({ status: to }).eq('id', o.id).eq('status', o.status).select('id');
            if (upErr) log(`${o.id.slice(0, 8)} ${o.status} → ${to} : refusé (${upErr.message})`);
            else if (!data?.length) log(`${o.id.slice(0, 8)} a changé entre-temps (annulée par le client ?)`);
            else log(`${o.id.slice(0, 8)} (${customerIds.get(o.customer_id)}) ${o.status} → ${to}`);
            handled.set(o.id, Date.now());
        }
        if (ONCE) { if (!mine.length) log('rien en attente'); break; }
        await sleep(POLL_MS);
    } while (true);
    await supabase.auth.signOut();
}

main().catch((e) => { console.error(e); process.exit(1); });

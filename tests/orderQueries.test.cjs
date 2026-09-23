// Reproductions locales : aucune connexion réseau, aucune donnée réelle.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const mobile = path.resolve(__dirname, '..');
let account = 'restaurant-A';
const ts = require(path.join(mobile, 'node_modules/typescript'));
const { QueryClient } = require(path.join(mobile, 'node_modules/@tanstack/react-query'));
const status = require(path.join(mobile, '.test-build/lib/orderStatus.js'));

function loadSource(relative, supabase) {
  const source = fs.readFileSync(path.join(mobile, relative), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  const mocks = {
    'react': { useEffect: () => {} },
    '@tanstack/react-query': { useQuery: options => options, useQueryClient: () => ({}) },
    '../store/authStore': { useAuthStore: selector => selector({ user: { id: account } }) },
    '../lib/reconcile': require(path.join(mobile, '.test-build/lib/reconcile.js')),
    '../lib/orderErrors': require(path.join(mobile, '.test-build/lib/orderErrors.js')),
    // The real RPC builder is abortable; the simulated one must answer the same API.
    '../lib/supabase': { supabase: supabase.rpc ? { ...supabase, rpc: (...args) => { const call = supabase.rpc(...args); call.abortSignal = () => call; return call; } } : supabase },
    '../lib/orderStatus': status,
    './postgrest': {},
  };
  vm.runInNewContext(js, { exports, require: name => {
    if (!(name in mocks)) throw new Error('Import non simulé : ' + name);
    return mocks[name];
  }, console, Math, AbortController, setTimeout, clearTimeout }, { filename: relative });
  return exports;
}

require('node:test')('les hooks réels protègent le cache, isolent les comptes et interrogent la file vide', async () => {
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  const query = { select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return delayed; } };
  const orders = loadSource('src/data/orders.ts', { from: () => query });
  const options = orders.useUserOrders('client-fictif');
  assert.ok(options.refetchInterval({ state: { data: [] } }) >= 60000, 'une réponse de commande perdue doit pouvoir être redécouverte');
  assert.ok(options.refetchInterval({ state: { data: [{ status: 'PENDING' }] } }) < 40000);
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const pending = cache.fetchQuery(options);
  cache.setQueryData(options.queryKey, [{ id: 'commande-fictive', status: 'ACCEPTED', updated_at: '2026-09-05T12:01:00Z' }]);
  release({ data: [{ id: 'commande-fictive', status: 'PENDING', updated_at: '2026-09-05T12:00:00Z' }], error: null });
  await pending;
  assert.equal(cache.getQueryData(options.queryKey)[0].status, 'ACCEPTED');
  cache.clear();

  account = 'restaurant-A';
  let requests = 0;
  const admin = loadSource('src/data/restaurantAdmin.ts', { rpc: async () => {
    requests++;
    return { data: account, error: null };
  } });
  const identityCache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  assert.equal(await identityCache.fetchQuery(admin.useMyRestaurantId(true)), 'restaurant-A');
  account = 'restaurant-B';
  assert.equal(await identityCache.fetchQuery(admin.useMyRestaurantId(true)), 'restaurant-B');
  assert.equal(requests, 2);
  identityCache.clear();

  const queueOptions = admin.useRestaurantOrders('restaurant-fictif');
  assert.ok(queueOptions.refetchInterval({ state: { data: [] } }) >= 20000);
  assert.ok(queueOptions.refetchInterval({ state: { data: [{ status: 'DELIVERED' }] } }) >= 20000);
});

require('node:test')('la création refuse une réponse vide ou étrangère sans annoncer un succès', async () => {
  let response = null;
  const orders = loadSource('src/data/orders.ts', { rpc: async () => ({ data: response, error: null }) });
  for (const value of [null, {}, { id: 'a', customer_id: 'autre-client' }]) {
    response = value;
    await assert.rejects(orders.createOrder({ customer_id: 'client-fictif' }), /INVALID_RESPONSE/);
  }
  response = { id: 'a', customer_id: 'client-fictif' };
  assert.equal(await orders.createOrder({ customer_id: 'client-fictif' }), response);
});

require('node:test')('les lectures de commandes restent bornées quand l’historique grossit', async () => {
  const queries = [];
  const from = () => {
    const calls = []; queries.push(calls);
    const q = {};
    for (const m of ['select', 'eq', 'in', 'not', 'or', 'order', 'range', 'limit']) q[m] = (...args) => { calls.push([m, ...args]); return q; };
    q.then = resolve => Promise.resolve({ data: [], error: null }).then(resolve);
    return q;
  };
  const bounded = calls => calls.some(([m]) => m === 'limit' || m === 'range')
    || calls.some(([m, ...args]) => m === 'not' && args[0] === 'status');
  const orders = loadSource('src/data/orders.ts', { from });
  await orders.useUserOrders('client-fictif').queryFn();
  const admin = loadSource('src/data/restaurantAdmin.ts', { from });
  await admin.useRestaurantOrders('restaurant-fictif').queryFn();
  assert.ok(queries.length >= 2);
  queries.forEach(calls => assert.ok(bounded(calls), 'lecture proportionnelle à tout l’historique : ' + JSON.stringify(calls)));
});

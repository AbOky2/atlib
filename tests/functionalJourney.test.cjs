// Real Zustand stores, persisted storage and QueryClient; only native/network boundaries are simulated.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { QueryClient } = require('@tanstack/react-query');
const { create } = require('zustand');
function source(file, mocks) {
 const exports = {};
 const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
 vm.runInNewContext(js, { exports, require: key => { assert.ok(key in mocks, key); return mocks[key]; }, console, Date, setTimeout: () => 0 });
 return exports;
}
function fixture(auth = {}) {
 const memory = new Map();
 const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
 let id = 0;
 const cartMocks = { zustand: require('zustand'), 'zustand/middleware': require('zustand/middleware'), '../lib/storage': { zustandStorage: storage }, '../lib/ids': { uuidv4: () => `request-${++id}` }, '../lib/cartLine': require('../.test-build/lib/cartLine') };
 const loadCart = () => source('src/store/cartStore.ts', cartMocks).useCartStore;
 const cart = loadCart();
 const addresses = create(() => ({ savedAddresses: [], selectedAddressId: null, currentAddress: null }));
 const favorites = create(() => ({ favoriteIds: [] }));
 const notifications = create(() => ({ readIds: [], lastSeenAt: null }));
 const cache = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
 const mocks = { zustand: require('zustand'), 'expo-linking': { createURL: (route, { scheme }) => `${scheme}://${route}` },
 '../lib/supabase': { supabase: { auth } }, '../lib/liveActivity': { endDeliveryActivity() {} }, '../lib/notifications': { clearOrderProgress: async () => {} },
 '../lib/queryClient': { queryClient: cache }, '../lib/storage': { zustandStorage: storage }, './cartStore': { useCartStore: cart }, './addressStore': { useAddressStore: addresses },
 './favoritesStore': { useFavoritesStore: favorites }, './notificationStore': { useNotificationStore: notifications },
 '../lib/phoneAuth': require('../.test-build/lib/phoneAuth'), '../lib/phone': require('../.test-build/lib/phone'), '../lib/authFeatures': { PHONE_SIGN_IN_ENABLED: false }, '../data/account': { ACCOUNT_ERRORS: { DELETE_FAILED: 'DELETE_FAILED' }, getAccountDeletionBlocker: async () => null, deleteMyAccount: async () => {} } };
 return { cart, loadCart, addresses, favorites, notifications, cache, storage, authStore: source('src/store/authStore.ts', mocks).useAuthStore };
}
const dish = { id: 'dish-a', name: 'Plat', price: 3000, restaurantId: 'restaurant-a', restaurantName: 'Cuisine A' };

test('panier réel : personnalisations distinctes, total et tentative conservés après redémarrage', () => {
 const f = fixture();
 f.cart.getState().addItem({ ...dish, note: 'Sans piment' });
 f.cart.getState().addItem({ ...dish, note: 'Sauce à part', quantity: 2 });
 assert.equal(f.cart.getState().items.length, 2);
 assert.equal(f.cart.getState().getTotalPrice(), 9000);
 f.cart.getState().setDeliveryAddress({ locality: 'Sabangali', description: 'Portail test', phone: '+23566123456' });
 const fingerprint = JSON.stringify(f.cart.getState().items);
 const request = f.cart.getState().getCheckoutRequestId(fingerprint);
 const restored = f.loadCart();
 assert.equal(restored.getState().items[0].note, 'Sans piment');
 assert.equal(restored.getState().deliveryAddress.locality, 'Sabangali');
 assert.equal(restored.getState().getCheckoutRequestId(fingerprint), request);
 assert.notEqual(restored.getState().getCheckoutRequestId(fingerprint + 'changed'), request);
 restored.getState().clearCart();
 assert.equal(restored.getState().checkoutAttempt, null);
 f.cache.clear();
});

test('panier réel : changer de restaurant attend une confirmation et remplace toutes les lignes', () => {
 const f = fixture();
 f.cart.getState().addItem(dish);
 f.cart.getState().addItem({ ...dish, id: 'dish-b', restaurantId: 'restaurant-b' });
 assert.equal(f.cart.getState().items[0].restaurantId, 'restaurant-a');
 f.cart.getState().dialogConfig.onConfirm();
 assert.equal(f.cart.getState().items.length, 1);
 assert.equal(f.cart.getState().currentRestaurantId, 'restaurant-b');
 f.cache.clear();
});

test('auth réelle : le passage A vers B efface panier, adresse, favoris, notifications et cache', async () => {
 const user = { id: 'B', user_metadata: {} };
 const f = fixture({ signInWithPassword: async () => ({ data: { user, session: { user } }, error: null }) });
 f.storage.setItem('private-data-owner', 'A');
 f.cart.getState().addItem(dish);
 f.cart.getState().setDeliveryAddress({ locality: 'Sabangali', description: 'Privée' });
 f.addresses.setState({ savedAddresses: ['adresse-A'] }); f.favorites.setState({ favoriteIds: ['favori-A'] }); f.notifications.setState({ readIds: ['notification-A'] });
 f.cache.setQueryData(['orders', 'A'], ['commande-A']);
 assert.equal(await f.authStore.getState().signIn('b@example.com', 'password'), 'ok');
 assert.equal(f.authStore.getState().user.id, 'B');
 assert.equal(f.cart.getState().items.length, 0); assert.equal(f.cart.getState().deliveryAddress, null);
 assert.equal(f.addresses.getState().savedAddresses.length, 0); assert.equal(f.favorites.getState().favoriteIds.length, 0); assert.equal(f.notifications.getState().readIds.length, 0);
 assert.equal(f.cache.getQueryCache().getAll().length, 0); assert.equal(f.storage.getItem('private-data-owner'), 'B');
 f.cache.clear();
});

test('auth réelle : une déconnexion refusée conserve le compte et ses données', async () => {
 const f = fixture({ signOut: async () => ({ error: new Error('offline') }) });
 f.authStore.setState({ user: { id: 'A' }, isAuthenticated: true }); f.storage.setItem('private-data-owner', 'A');
 f.cart.getState().addItem(dish);
 await f.authStore.getState().signOut();
 assert.equal(f.authStore.getState().isAuthenticated, true); assert.equal(f.cart.getState().items.length, 1); assert.ok(f.authStore.getState().error);
 f.cache.clear();
});

test('auth réelle : deux initialisations simultanées ne doublent pas les abonnements', async () => {
 let listeners = 0, reads = 0;
 const f = fixture({ getSession: async () => { reads++; return { data: { session: null }, error: null }; }, onAuthStateChange: () => { listeners++; return { data: { subscription: { unsubscribe() {} } } }; } });
 await Promise.all([f.authStore.getState().initialize(), f.authStore.getState().initialize()]);
 assert.equal(listeners, 1); assert.equal(reads, 1);
 f.cache.clear();
});

test('auth réelle : une restauration tardive ne remplace pas une session plus récente', async () => {
 let resolveSession, listener;
 const f = fixture({ getSession: () => new Promise(resolve => resolveSession = resolve), onAuthStateChange: callback => { listener = callback; return { data: { subscription: { unsubscribe() {} } } }; } });
 const pending = f.authStore.getState().initialize();
 assert.equal(typeof listener, 'function', 'écouter les changements avant la lecture asynchrone');
 listener('SIGNED_IN', { user: { id: 'B' } });
 resolveSession({ data: { session: { user: { id: 'A' } } }, error: null });
 await pending;
 assert.equal(f.authStore.getState().user.id, 'B');
 f.cache.clear();
});

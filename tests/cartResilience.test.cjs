// Real Zustand stores; only storage and identifiers are simulated.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { create } = require('zustand');
const { QueryClient } = require('@tanstack/react-query');

function source(file, mocks, context = {}) {
    const exports = {};
    const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInNewContext(js, { exports, require: key => { assert.ok(key in mocks, key); return mocks[key]; }, console, Date, setTimeout: () => 0, ...context });
    return exports;
}
function memoryStorage() {
    const memory = new Map();
    return { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
}
let requestCounter = 0;
function loadCart(storage, clock) {
    return source('src/store/cartStore.ts', {
        zustand: require('zustand'), 'zustand/middleware': require('zustand/middleware'),
        '../lib/storage': { zustandStorage: storage }, '../lib/ids': { uuidv4: () => `request-${++requestCounter}` },
        '../lib/cartLine': require('../.test-build/lib/cartLine'),
    }, { Date: clock }).useCartStore;
}
function fakeClock(start) {
    let now = start;
    const Clock = function (...args) { return args.length ? new Date(...args) : new Date(now); };
    Clock.now = () => now;
    Clock.advance = (ms) => { now += ms; };
    return Clock;
}
const dish = { id: 'dish-a', name: 'Plat', price: 3000, restaurantId: 'restaurant-a', restaurantName: 'Cuisine A' };

test('le panier d’un invité survit à sa connexion, mais pas au changement de compte', async () => {
    const storage = memoryStorage();
    const cart = loadCart(storage, Date);
    cart.getState().addItem(dish);
    const addresses = create(() => ({ savedAddresses: [], selectedAddressId: null, currentAddress: null }));
    const favorites = create(() => ({ favoriteIds: ['restaurant-a'] }));
    const notifications = create(() => ({ readIds: [], lastSeenAt: null }));
    const cache = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
    const auth = {
        onAuthStateChange() {}, getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async ({ email }) => ({ data: { session: { user: { id: email } }, user: { id: email } }, error: null }),
        signOut: async () => ({ error: null }),
    };
    const store = source('src/store/authStore.ts', {
        zustand: require('zustand'), 'expo-linking': { createURL: (route, { scheme }) => `${scheme}://${route}` },
        '../lib/supabase': { supabase: { auth } }, '../lib/liveActivity': { endDeliveryActivity() {} }, '../lib/notifications': { clearOrderProgress: async () => {} },
        '../lib/queryClient': { queryClient: cache }, '../lib/storage': { zustandStorage: storage }, './cartStore': { useCartStore: cart },
        './addressStore': { useAddressStore: addresses }, './favoritesStore': { useFavoritesStore: favorites }, './notificationStore': { useNotificationStore: notifications },
        '../lib/phoneAuth': require('../.test-build/lib/phoneAuth'), '../lib/phone': require('../.test-build/lib/phone'), '../lib/authFeatures': { PHONE_SIGN_IN_ENABLED: false },
        '../data/account': { ACCOUNT_ERRORS: { DELETE_FAILED: 'DELETE_FAILED' }, getAccountDeletionBlocker: async () => null, deleteMyAccount: async () => {} },
    }).useAuthStore;

    // Guest → account A: the basket is what they came to order.
    assert.equal(await store.getState().signIn('A', 'secret'), 'ok');
    assert.equal(cart.getState().items.length, 1, 'panier invité effacé à la connexion');
    assert.deepEqual(favorites.getState().favoriteIds, ['restaurant-a']);
    // A → B on the same device: private data must not leak.
    assert.equal(await store.getState().signIn('B', 'secret'), 'ok');
    assert.equal(cart.getState().items.length, 0, 'panier de A visible par B');
    assert.equal(favorites.getState().favoriteIds.length, 0, 'favoris de A visibles par B');
    // B signs out: the next guest starts clean.
    cart.getState().addItem(dish);
    await store.getState().signOut();
    assert.equal(store.getState().user, null);
    assert.equal(cart.getState().items.length, 0, 'panier de B laissé au prochain invité');
});

test('la clé d’idempotence est reprise après une réponse perdue, mais expire au lieu de renvoyer une vieille commande', () => {
    const clock = fakeClock(1_000_000);
    const storage = memoryStorage();
    let cart = loadCart(storage, clock);
    cart.getState().addItem(dish);
    const first = cart.getState().getCheckoutRequestId('basket-1');
    clock.advance(5 * 60 * 1000);
    assert.equal(cart.getState().getCheckoutRequestId('basket-1'), first, 'un nouvel essai 5 min plus tard doit reprendre la même clé');
    // Relaunch: the attempt is persisted with its age.
    cart = loadCart(storage, clock);
    assert.equal(cart.getState().getCheckoutRequestId('basket-1'), first, 'la clé doit survivre au redémarrage');
    clock.advance(31 * 60 * 1000);
    assert.notEqual(cart.getState().getCheckoutRequestId('basket-1'), first, 'une clé de plus de 30 min ne doit plus être reprise');
    assert.notEqual(cart.getState().getCheckoutRequestId('basket-2'), first);
    cart.getState().resetCheckoutAttempt();
    assert.equal(cart.getState().checkoutAttempt, null);
});

test('le billet choisi est persisté avec le panier et effacé avec lui', () => {
    const storage = memoryStorage();
    let cart = loadCart(storage, Date);
    cart.getState().addItem(dish);
    cart.getState().setCashPaidWith(10000);
    cart = loadCart(storage, Date);
    assert.equal(cart.getState().cashPaidWith, 10000);
    cart.getState().clearCart();
    assert.equal(cart.getState().cashPaidWith, null);
    assert.equal(cart.getState().checkoutAttempt, null);
});

test('la resynchronisation avec le menu retire les plats disparus, suit les prix et invalide la tentative', () => {
    const cart = loadCart(memoryStorage(), Date);
    cart.getState().addItem(dish);
    cart.getState().addItem({ ...dish, id: 'dish-b', name: 'Autre', price: 2000 });
    cart.getState().addItem({ ...dish, id: 'dish-c', name: 'Retiré', price: 1500 });
    cart.getState().getCheckoutRequestId('basket');
    const plain = (value) => JSON.parse(JSON.stringify(value));
    const other = plain(cart.getState().reconcileWithMenu('restaurant-z', []));
    assert.deepEqual(other, { removed: [], repriced: [] }, 'un autre restaurant ne touche pas au panier');
    const result = plain(cart.getState().reconcileWithMenu('restaurant-a', [
        { id: 'dish-a', price_xaf: 3500, is_available: true },
        { id: 'dish-b', price_xaf: 2000, is_available: false },
    ]));
    assert.deepEqual(result, { removed: ['Autre', 'Retiré'], repriced: ['Plat'] });
    assert.deepEqual(plain(cart.getState().items.map(i => [i.id, i.price])), [['dish-a', 3500]]);
    assert.equal(cart.getState().checkoutAttempt, null, 'un panier modifié doit repartir sur une nouvelle clé');
    assert.equal(cart.getState().getTotalPrice(), 3500);
    cart.getState().reconcileWithMenu('restaurant-a', []);
    assert.equal(cart.getState().currentRestaurantId, null, 'un panier vidé oublie son restaurant');
});

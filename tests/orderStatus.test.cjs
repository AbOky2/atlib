const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ORDER_STATUSES,
    STATUS_FLOW,
    LEGAL_TRANSITIONS,
    canTransition,
    isOrderStatus,
    isTerminal,
    isLive,
    statusIndex,
    findActiveOrder,
    statusMeta,
    STATUS_META,
} = require('../.test-build/lib/orderStatus');

test('le cycle de vie couvre les 7 statuts canoniques', () => {
    assert.equal(ORDER_STATUSES.length, 7);
    assert.equal(STATUS_FLOW.length, 6);
    assert.ok(!STATUS_FLOW.includes('CANCELLED'), 'CANCELLED est une branche, pas une étape');
});

test('le chemin heureux est traversable de bout en bout', () => {
    for (let i = 0; i < STATUS_FLOW.length - 1; i++) {
        assert.ok(
            canTransition(STATUS_FLOW[i], STATUS_FLOW[i + 1]),
            `${STATUS_FLOW[i]} → ${STATUS_FLOW[i + 1]} doit être légal`,
        );
    }
});

test('aucune transition ne quitte un état terminal', () => {
    assert.deepEqual(LEGAL_TRANSITIONS.DELIVERED, []);
    assert.deepEqual(LEGAL_TRANSITIONS.CANCELLED, []);
});

test('les retours en arrière sont illégaux', () => {
    assert.equal(canTransition('PREPARING', 'PENDING'), false);
    assert.equal(canTransition('OUT_FOR_DELIVERY', 'READY'), false);
    assert.equal(canTransition('DELIVERED', 'PENDING'), false);
});

test('on ne peut plus annuler une commande en cours de livraison', () => {
    assert.equal(canTransition('OUT_FOR_DELIVERY', 'CANCELLED'), false);
    assert.equal(canTransition('PENDING', 'CANCELLED'), true);
});

test('isOrderStatus filtre les valeurs inconnues', () => {
    assert.equal(isOrderStatus('PENDING'), true);
    assert.equal(isOrderStatus('pending'), false);
    assert.equal(isOrderStatus(''), false);
    assert.equal(isOrderStatus(null), false);
    assert.equal(isOrderStatus(42), false);
});

test('terminal vs live', () => {
    assert.equal(isTerminal('DELIVERED'), true);
    assert.equal(isTerminal('CANCELLED'), true);
    assert.equal(isTerminal('PREPARING'), false);
    assert.equal(isLive('OUT_FOR_DELIVERY'), true);
    assert.equal(isLive('DELIVERED'), false);
});

test('statusIndex — position sur le chemin heureux', () => {
    assert.equal(statusIndex('PENDING'), 0);
    assert.equal(statusIndex('DELIVERED'), 5);
    assert.equal(statusIndex('CANCELLED'), -1);
    assert.equal(statusIndex('N_IMPORTE_QUOI'), -1);
});

test('findActiveOrder renvoie la première commande vivante', () => {
    const orders = [
        { id: 'a', status: 'DELIVERED' },
        { id: 'b', status: 'PREPARING' },
        { id: 'c', status: 'PENDING' },
    ];
    assert.equal(findActiveOrder(orders)?.id, 'b');
    assert.equal(findActiveOrder([{ id: 'x', status: 'CANCELLED' }]), undefined);
    assert.equal(findActiveOrder(undefined), undefined);
    assert.equal(findActiveOrder(null), undefined);
});

test('chaque statut a des métadonnées complètes', () => {
    for (const status of ORDER_STATUSES) {
        const meta = STATUS_META[status];
        assert.ok(meta.label.length > 0, `${status}: label`);
        assert.ok(meta.headline.length > 0, `${status}: headline`);
        assert.ok(meta.description.length > 0, `${status}: description`);
        assert.match(meta.color, /^#[0-9A-Fa-f]{6}$/, `${status}: color`);
        assert.ok(meta.progress >= 0 && meta.progress <= 1, `${status}: progress ∈ [0,1]`);
    }
});

test('la progression est strictement croissante sur le chemin heureux', () => {
    for (let i = 0; i < STATUS_FLOW.length - 1; i++) {
        assert.ok(
            STATUS_META[STATUS_FLOW[i]].progress < STATUS_META[STATUS_FLOW[i + 1]].progress,
            `progress(${STATUS_FLOW[i]}) < progress(${STATUS_FLOW[i + 1]})`,
        );
    }
});

test('statusMeta retombe sur PENDING pour un statut inconnu', () => {
    assert.deepEqual(statusMeta('???'), STATUS_META.PENDING);
    assert.deepEqual(statusMeta('DELIVERED'), STATUS_META.DELIVERED);
});

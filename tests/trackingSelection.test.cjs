const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectTrackedOrder } = require('../.test-build/lib/orderStatus');
const orders = [{ id: 'ancienne', status: 'DELIVERED' }, { id: 'active', status: 'PENDING' }];
test('le suivi ouvre exactement la commande demandée, même terminée', () => {
    assert.equal(selectTrackedOrder(orders, 'ancienne'), orders[0]);
    assert.equal(selectTrackedOrder(orders, 'active'), orders[1]);
});
test('une référence absente ne montre jamais une autre commande', () => {
    assert.equal(selectTrackedOrder(orders, 'inconnue'), undefined);
    assert.equal(selectTrackedOrder(orders, ''), undefined);
    assert.equal(selectTrackedOrder(undefined, 'active'), undefined);
});
test('sans référence, le suivi privilégie la commande active puis la plus récente', () => {
    assert.equal(selectTrackedOrder(orders), orders[1]);
    assert.equal(selectTrackedOrder([orders[0]]), orders[0]);
    assert.equal(selectTrackedOrder([]), undefined);
});

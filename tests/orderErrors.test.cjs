const test = require('node:test');
const assert = require('node:assert/strict');
const { ORDER_ERRORS, mapServerOrderError, orderErrorMessage, isMenuRefusal } = require('../.test-build/lib/orderErrors');

test('chaque refus nommé par create_order est reconnu, les autres erreurs ne le sont pas', () => {
    for (const name of ['RESTAURANT_CLOSED', 'ITEM_UNAVAILABLE', 'PRICE_CHANGED', 'INVALID_CHECKOUT', 'INVALID_ZONE', 'INVALID_ITEMS', 'INSUFFICIENT_CASH']) {
        assert.equal(mapServerOrderError({ code: '22023', message: name }), name);
    }
    assert.equal(mapServerOrderError({ code: '42501', message: 'permission denied' }), ORDER_ERRORS.FORBIDDEN);
    assert.equal(mapServerOrderError({ code: 'P0001', message: 'forbidden' }), ORDER_ERRORS.FORBIDDEN);
    assert.equal(mapServerOrderError({ code: '23505', message: 'duplicate key' }), null);
    assert.equal(mapServerOrderError({ message: 'Network request failed' }), null);
});

test('un refus définitif ne propose jamais de réessayer à l’identique', () => {
    for (const name of ['RESTAURANT_CLOSED', 'ITEM_UNAVAILABLE', 'PRICE_CHANGED', 'INVALID_ZONE', 'INVALID_CHECKOUT', 'INVALID_ITEMS', 'INSUFFICIENT_CASH', 'ACTIVE_ORDER_EXISTS', 'FORBIDDEN']) {
        assert.ok(!/réessayez sans modifier|même tentative/i.test(orderErrorMessage(name)), name);
    }
    assert.match(orderErrorMessage('TIMEOUT'), /jamais doublée/);
    assert.match(orderErrorMessage('anything-else'), /Mes commandes/);
});

test('seuls les refus liés au menu déclenchent un rafraîchissement du catalogue', () => {
    assert.ok(isMenuRefusal('PRICE_CHANGED') && isMenuRefusal('ITEM_UNAVAILABLE') && isMenuRefusal('RESTAURANT_CLOSED'));
    assert.ok(!isMenuRefusal('INVALID_ZONE') && !isMenuRefusal('ACTIVE_ORDER_EXISTS'));
});

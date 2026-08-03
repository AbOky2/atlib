const test = require('node:test');
const assert = require('node:assert/strict');

const { makeLineId } = require('../.test-build/lib/cartLine');

test('même plat + même personnalisation → même ligne (fusion des quantités)', () => {
    assert.equal(
        makeLineId('dish-1', 'sans oignon', ['Coca']),
        makeLineId('dish-1', 'sans oignon', ['Coca']),
    );
});

test('une note différente crée une ligne distincte', () => {
    assert.notEqual(makeLineId('dish-1', 'sans oignon'), makeLineId('dish-1', 'bien cuit'));
});

test('des options différentes créent une ligne distincte', () => {
    assert.notEqual(makeLineId('dish-1', undefined, ['Coca']), makeLineId('dish-1', undefined, ['Fanta']));
});

test("l'absence de personnalisation est normalisée (undefined ≡ '' ≡ espaces)", () => {
    assert.equal(makeLineId('dish-1'), makeLineId('dish-1', ''));
    assert.equal(makeLineId('dish-1', '   '), makeLineId('dish-1'));
    assert.equal(makeLineId('dish-1', undefined, []), makeLineId('dish-1'));
});

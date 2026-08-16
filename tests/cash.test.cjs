const test = require('node:test');
const assert = require('node:assert/strict');

const { suggestedCashAmounts, changeToGive } = require('../.test-build/lib/cash');
const { isAcceptingOrders } = require('../.test-build/lib/availability');

test('les montants proposés dépassent toujours le total', () => {
    for (const total of [1500, 7500, 12000, 27000, 33500]) {
        for (const amount of suggestedCashAmounts(total)) {
            assert.ok(amount > total, `${amount} doit dépasser ${total}`);
        }
    }
});

test('les montants proposés sont des coupures rondes et croissantes', () => {
    const amounts = suggestedCashAmounts(27000);
    assert.deepEqual(amounts, [30000, 35000, 40000]);
    amounts.forEach((a) => assert.equal(a % 5000, 0, `${a} doit être un multiple de 5000`));
});

test('un total déjà rond ne se propose pas lui-même (ce serait « appoint exact »)', () => {
    const amounts = suggestedCashAmounts(30000);
    assert.ok(!amounts.includes(30000));
    assert.equal(amounts[0], 35000);
});

test('un panier vide ne propose rien', () => {
    assert.deepEqual(suggestedCashAmounts(0), []);
});

test('la monnaie à rendre est exacte', () => {
    assert.equal(changeToGive(27000, 30000), 3000);
    assert.equal(changeToGive(27000, 27000), 0, "l'appoint exact rend 0");
});

test('un montant insuffisant ou absent ne rend pas de monnaie négative', () => {
    assert.equal(changeToGive(27000, 20000), null);
    assert.equal(changeToGive(27000, null), null);
    assert.equal(changeToGive(27000, undefined), null);
});

test('un restaurant est ouvert par défaut, fermé seulement si explicitement false', () => {
    assert.equal(isAcceptingOrders({ is_accepting_orders: true }), true);
    assert.equal(isAcceptingOrders({ is_accepting_orders: false }), false);
    // Colonne absente en base (déploiement pas encore fait) → ouvert, comme avant.
    assert.equal(isAcceptingOrders({}), true);
    assert.equal(isAcceptingOrders({ is_accepting_orders: null }), true);
    assert.equal(isAcceptingOrders(null), true);
    assert.equal(isAcceptingOrders(undefined), true);
});

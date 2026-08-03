const test = require('node:test');
const assert = require('node:assert/strict');

const { restaurantEtaRange, formatEtaRange } = require('../.test-build/lib/eta');

test("l'ETA est déterministe : même restaurant → même estimation", () => {
    const a1 = restaurantEtaRange('resto-abc-123');
    const a2 = restaurantEtaRange('resto-abc-123');
    assert.deepEqual(a1, a2);
});

test("l'ETA reste dans des bornes réalistes (15–45 min)", () => {
    for (let i = 0; i < 200; i++) {
        const { min, max } = restaurantEtaRange(`restaurant-${i}`);
        assert.ok(min >= 15, `min ${min} >= 15`);
        assert.ok(max <= 45, `max ${max} <= 45`);
        assert.equal(max, min + 10, 'fenêtre fixe de 10 min');
    }
});

test('des restaurants différents obtiennent des estimations variées', () => {
    const mins = new Set();
    for (let i = 0; i < 50; i++) {
        mins.add(restaurantEtaRange(`resto-${i}`).min);
    }
    assert.ok(mins.size > 5, `au moins 6 valeurs distinctes (obtenu : ${mins.size})`);
});

test('formatEtaRange rend un libellé lisible', () => {
    assert.equal(formatEtaRange({ min: 20, max: 30 }), '20–30 min');
});

const test = require('node:test');
const assert = require('node:assert/strict');

const { NDJAMENA_LOCALITIES, getEstimatedDeliveryTime } = require('../.test-build/lib/localities');

test('chaque quartier connu renvoie son temps de base', () => {
    for (const loc of NDJAMENA_LOCALITIES) {
        assert.equal(getEstimatedDeliveryTime(loc.name), loc.baseDeliveryTimeMins, loc.name);
    }
});

test('la correspondance est insensible à la casse et aux inclusions', () => {
    assert.equal(getEstimatedDeliveryTime('moursal'), 20);
    assert.equal(getEstimatedDeliveryTime('Quartier Moursal, près du marché'), 20);
});

test('un quartier inconnu retombe sur 30 minutes', () => {
    assert.equal(getEstimatedDeliveryTime('Atlantide'), 30);
    assert.equal(getEstimatedDeliveryTime(''), 30);
});

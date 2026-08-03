const test = require('node:test');
const assert = require('node:assert/strict');

const {
    DELIVERY_FEE_XAF,
    SERVICE_FEE_XAF,
    computeOrderTotal,
    formatXaf,
} = require('../.test-build/lib/pricing');

// Intl 'fr-FR' sépare les milliers par des espaces insécables (U+202F/U+00A0)
// selon la version ICU — on normalise pour des assertions stables.
const normalize = (s) => s.replace(/[\u202F\u00A0]/g, ' ');

test('les frais sont des constantes positives', () => {
    assert.ok(DELIVERY_FEE_XAF > 0);
    assert.ok(SERVICE_FEE_XAF > 0);
});

test('un panier vide ne paie AUCUN frais', () => {
    assert.equal(computeOrderTotal(0), 0);
    assert.equal(computeOrderTotal(-100), 0);
});

test('le total = sous-total + livraison + service', () => {
    assert.equal(computeOrderTotal(10_000), 10_000 + DELIVERY_FEE_XAF + SERVICE_FEE_XAF);
    assert.equal(computeOrderTotal(1), 1 + DELIVERY_FEE_XAF + SERVICE_FEE_XAF);
});

test('formatXaf groupe les milliers et suffixe F', () => {
    assert.equal(normalize(formatXaf(12500)), '12 500 F');
    assert.equal(normalize(formatXaf(0)), '0 F');
    assert.equal(normalize(formatXaf(1_000_000)), '1 000 000 F');
});

test('formatXaf tolère null/undefined sans planter', () => {
    assert.equal(normalize(formatXaf(undefined)), '0 F');
    assert.equal(normalize(formatXaf(null)), '0 F');
});

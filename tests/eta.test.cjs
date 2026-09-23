const test = require('node:test');
const assert = require('node:assert/strict');
const { arrivalTimeLabel } = require('../.test-build/lib/eta');

test("l'heure d'arrivée est une heure murale de N'Djamena (UTC+1), jamais un compte à rebours", () => {
    // 12:00 UTC + 45 min = 12:45 UTC = 13h45 à N'Djamena.
    assert.equal(arrivalTimeLabel('2026-09-22T12:00:00.000Z', 45), '13h45');
    // Zero-padded minutes, bare hour: « 9h05 ».
    assert.equal(arrivalTimeLabel('2026-09-22T08:00:00.000Z', 5), '9h05');
    // Crossing midnight wraps.
    assert.equal(arrivalTimeLabel('2026-09-22T22:50:00.000Z', 20), '0h10');
});

test('une entrée inutilisable se dégrade en null pour que l’écran écrive « Bientôt »', () => {
    assert.equal(arrivalTimeLabel(null, 15), null);
    assert.equal(arrivalTimeLabel(undefined, 15), null);
    assert.equal(arrivalTimeLabel('pas une date', 15), null);
    assert.equal(arrivalTimeLabel('2026-09-22T12:00:00.000Z', -5), null);
    assert.equal(arrivalTimeLabel('2026-09-22T12:00:00.000Z', Number.NaN), null);
});

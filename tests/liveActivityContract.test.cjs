const test = require('node:test');
const assert = require('node:assert/strict');

const { STATUS_META, STATUS_FLOW } = require('../.test-build/lib/orderStatus');
const { arrivalTimeLabel } = require('../.test-build/lib/eta');

/**
 * The Live Activity widget (targets/widget/LiveActivity.swift) receives ONLY a
 * `progress` float and reverse-engineers the lifecycle step from it to pick an
 * icon and fill the segmented bar. That makes STATUS_META.progress a silent
 * cross-language contract: nudging a value here changes what the Dynamic Island
 * draws, in a file no TypeScript tool can see.
 *
 * These tests mirror the Swift bucket boundaries so any drift fails here — in
 * CI, in seconds — instead of on a customer's lock screen after a native build.
 */
const swiftStepIndex = (progress) => {
    if (progress < 0.2) return 0;
    if (progress < 0.35) return 1;
    if (progress < 0.55) return 2;
    if (progress < 0.75) return 3;
    if (progress < 0.95) return 4;
    return 5;
};

// The step each status MUST land on in the widget.
const EXPECTED_STEP = {
    PENDING: 0,
    ACCEPTED: 1,
    PREPARING: 2,
    READY: 3,
    OUT_FOR_DELIVERY: 4,
    DELIVERED: 5,
};

test('chaque statut tombe dans le bon segment du widget Live Activity', () => {
    for (const [status, expected] of Object.entries(EXPECTED_STEP)) {
        const progress = STATUS_META[status].progress;
        assert.equal(
            swiftStepIndex(progress),
            expected,
            `${status} (progress ${progress}) doit afficher l'étape ${expected} dans le widget`,
        );
    }
});

test('la progression est strictement croissante le long du parcours', () => {
    for (let i = 1; i < STATUS_FLOW.length; i++) {
        const prev = STATUS_META[STATUS_FLOW[i - 1]].progress;
        const curr = STATUS_META[STATUS_FLOW[i]].progress;
        assert.ok(curr > prev, `${STATUS_FLOW[i]} (${curr}) doit dépasser ${STATUS_FLOW[i - 1]} (${prev})`);
    }
});

test('la barre segmentée est pleine une fois la commande livrée', () => {
    // The Swift bar draws 5 capsules filled while `i < stepIndex`.
    assert.equal(swiftStepIndex(STATUS_META.DELIVERED.progress), 5);
});

test("l'heure d'arrivée est une heure murale, stable et indépendante du moment du calcul", () => {
    const placedAt = '2026-08-05T18:20:00.000Z';
    const first = arrivalTimeLabel(placedAt, 25);
    const second = arrivalTimeLabel(placedAt, 25);
    // Same inputs → same label, whenever it is computed: nothing can freeze.
    assert.equal(first, second);
    assert.match(first, /^\d{1,2}h\d{2}$/);
});

test("l'heure d'arrivée avance bien avec l'ETA annoncée", () => {
    const placedAt = '2026-08-05T10:00:00.000Z';
    assert.notEqual(arrivalTimeLabel(placedAt, 15), arrivalTimeLabel(placedAt, 45));
});

test('les minutes sont toujours sur deux chiffres', () => {
    // 10:00 UTC + 3 min → …h03 in any timezone with whole-hour offsets.
    const label = arrivalTimeLabel('2026-08-05T10:00:00.000Z', 3);
    assert.match(label, /h\d{2}$/);
    assert.ok(label.endsWith('03'), `attendu …h03, reçu ${label}`);
});

test('un horodatage inutilisable donne null (le widget affichera « Bientôt »)', () => {
    assert.equal(arrivalTimeLabel(null, 20), null);
    assert.equal(arrivalTimeLabel(undefined, 20), null);
    assert.equal(arrivalTimeLabel('pas-une-date', 20), null);
});

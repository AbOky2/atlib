const test = require('node:test');
const assert = require('node:assert/strict');

const { uuidv4 } = require('../.test-build/lib/ids');

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('uuidv4 produit un UUID v4 bien formé', () => {
    for (let i = 0; i < 100; i++) {
        assert.match(uuidv4(), UUID_V4);
    }
});

test("uuidv4 ne produit pas de collision sur 10 000 tirages (clé d'idempotence)", () => {
    const seen = new Set();
    for (let i = 0; i < 10_000; i++) {
        seen.add(uuidv4());
    }
    assert.equal(seen.size, 10_000);
});

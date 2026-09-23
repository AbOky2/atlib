const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CANCELLATION_REASONS, CANCELLATION_COPY, cancellationMessage, LEGAL_TRANSITIONS } = require('../.test-build/lib/orderStatus');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('les motifs d’annulation de l’app, du SQL et de la fonction push sont les mêmes', () => {
    const sql = read('supabase/migrations/202609230001_order_lifecycle.sql');
    const sqlList = sql.match(/cancellation_reason IN\s*\(([^)]*)\)/)[1].match(/'([A-Z_]+)'/g).map((s) => s.replace(/'/g, ''));
    assert.deepEqual([...sqlList].sort(), [...CANCELLATION_REASONS].sort());
    const edge = read('supabase/functions/notify-order/index.ts');
    const block = edge.slice(edge.indexOf('const CANCELLATION_BODY'), edge.indexOf('};', edge.indexOf('const CANCELLATION_BODY')));
    for (const reason of CANCELLATION_REASONS) {
        const line = block.split('\n').find((l) => l.trim().startsWith(`${reason}:`));
        assert.ok(line, `motif ${reason} absent de notify-order`);
        assert.ok(line.includes(CANCELLATION_COPY[reason].customer), `texte client de ${reason} divergent entre l’app et la fonction push`);
    }
});

test('un motif inconnu ou absent donne une phrase utile, jamais une clé technique', () => {
    assert.equal(cancellationMessage(null), CANCELLATION_COPY.OTHER.customer);
    assert.equal(cancellationMessage('WHATEVER'), CANCELLATION_COPY.OTHER.customer);
    assert.equal(cancellationMessage('CUSTOMER'), 'Vous avez annulé cette commande.');
});

test('les transitions du client et du serveur coïncident', () => {
    const sql = read('supabase/migrations/202609230001_order_lifecycle.sql');
    for (const [from, tos] of Object.entries(LEGAL_TRANSITIONS)) {
        if (tos.length === 0) continue;
        const rule = sql.match(new RegExp(`OLD\\.status = '${from}' AND NEW\\.status (?:IN \\(([^)]*)\\)|= '([A-Z_]+)')`));
        assert.ok(rule, `aucune règle serveur pour ${from}`);
        const serverTos = rule[1] ? rule[1].match(/'([A-Z_]+)'/g).map((s) => s.replace(/'/g, '')) : [rule[2]];
        assert.deepEqual([...serverTos].sort(), [...tos].sort(), `transitions depuis ${from}`);
    }
});

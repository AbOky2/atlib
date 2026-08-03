const test = require('node:test');
const assert = require('node:assert/strict');

const { reconcileOrderRow } = require('../.test-build/lib/reconcile');

const T0 = '2026-07-08T12:00:00Z';
const T1 = '2026-07-08T12:05:00Z';

test('une mise à jour plus récente est appliquée', () => {
    const cached = [{ id: 'o1', status: 'PENDING', updated_at: T0 }];
    const result = reconcileOrderRow(cached, { id: 'o1', status: 'ACCEPTED', updated_at: T1 });
    assert.equal(result[0].status, 'ACCEPTED');
});

test("un poll périmé ne peut PAS écraser un statut plus récent (la course de l'audit)", () => {
    // Le realtime a déjà poussé ACCEPTED@T1 ; un poll parti avant revient avec PENDING@T0.
    const cached = [{ id: 'o1', status: 'ACCEPTED', updated_at: T1 }];
    const result = reconcileOrderRow(cached, { id: 'o1', status: 'PENDING', updated_at: T0 });
    assert.equal(result[0].status, 'ACCEPTED', 'le statut ne revient jamais en arrière');
});

test('une ligne sans updated_at (payload minimal) est traitée comme fraîche', () => {
    const cached = [{ id: 'o1', status: 'PENDING', updated_at: T0 }];
    const result = reconcileOrderRow(cached, { id: 'o1', status: 'PREPARING' });
    assert.equal(result[0].status, 'PREPARING');
});

test('les autres commandes de la liste ne sont pas touchées', () => {
    const cached = [
        { id: 'o1', status: 'PENDING', updated_at: T0 },
        { id: 'o2', status: 'DELIVERED', updated_at: T0 },
    ];
    const result = reconcileOrderRow(cached, { id: 'o1', status: 'ACCEPTED', updated_at: T1 });
    assert.equal(result[1].status, 'DELIVERED');
    assert.equal(result[1], cached[1], 'référence inchangée pour les lignes non concernées');
});

test('un cache non initialisé est renvoyé tel quel', () => {
    assert.equal(reconcileOrderRow(undefined, { id: 'o1', updated_at: T1 }), undefined);
});

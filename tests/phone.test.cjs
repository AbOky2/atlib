const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeChadPhone, isValidChadPhone, formatChadPhone } = require('../.test-build/lib/phone');

test('toutes les façons d\'écrire un numéro donnent la même identité', () => {
    const expected = '+23566123456';
    for (const written of [
        '66123456',
        '66 12 34 56',
        '66-12-34-56',
        '+235 66123456',
        '+23566123456',
        '235 66 12 34 56',
        '0023566123456',
        '066123456',
    ]) {
        assert.equal(normalizeChadPhone(written), expected, `« ${written} » doit normaliser en ${expected}`);
    }
});

test('les préfixes mobiles tchadiens valides sont acceptés', () => {
    assert.ok(isValidChadPhone('66123456'));
    assert.ok(isValidChadPhone('77123456'));
    assert.ok(isValidChadPhone('99123456'));
});

test('un numéro qui ne peut pas être un mobile tchadien est refusé', () => {
    assert.equal(normalizeChadPhone('12345678'), null, 'préfixe invalide');
    assert.equal(normalizeChadPhone('6612345'), null, 'trop court');
    assert.equal(normalizeChadPhone('661234567'), null, 'trop long');
    assert.equal(normalizeChadPhone('00000000'), null, 'ancien numéro bidon du checkout');
    assert.equal(normalizeChadPhone(''), null);
    assert.equal(normalizeChadPhone(null), null);
    assert.equal(normalizeChadPhone(undefined), null);
});

test("l'affichage est lisible et groupé par deux", () => {
    assert.equal(formatChadPhone('66123456'), '+235 66 12 34 56');
    assert.equal(formatChadPhone('+23599887766'), '+235 99 88 77 66');
});

test('un numéro invalide est affiché tel quel plutôt que perdu', () => {
    assert.equal(formatChadPhone('abc'), 'abc');
});

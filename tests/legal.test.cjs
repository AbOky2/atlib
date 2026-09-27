const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Le générateur charge .env avant de lire legal.ts : il doit passer en premier,
// sinon l'éditeur et le contact sont lus vides et la page « dérive ».
const { render, renderFunction } = require('../scripts/build-legal.cjs');
const { PRIVACY_POLICY } = require('../.test-build/lib/legal');

test('la politique de confidentialité couvre ce que les stores exigent', () => {
    const text = PRIVACY_POLICY.map((s) => `${s.title} ${s.paragraphs.join(' ')} ${(s.bullets ?? []).join(' ')}`).join(' ');
    for (const needle of ['email', 'téléphone', 'adresse', 'notification', 'Supprimer mon compte', 'Supabase', 'restaurant', 'majeures']) {
        assert.ok(text.includes(needle), `la politique ne mentionne pas « ${needle} »`);
    }
    assert.ok(!/lorem|TODO|XXX/i.test(text), 'texte provisoire dans la politique');
});

test('la page HTML hébergée est identique à la source de l\'app', () => {
    const file = path.join(__dirname, '..', 'legal', 'privacy.html');
    assert.ok(fs.existsSync(file), 'legal/privacy.html absent — lancez npm run legal:build');
    assert.equal(fs.readFileSync(file, 'utf8'), render(),
        'legal/privacy.html a dérivé de src/lib/legal.ts — relancez npm run legal:build');
});

test('la fonction Edge « privacy » sert exactement la page générée', () => {
    const file = path.join(__dirname, '..', 'supabase', 'functions', 'privacy', 'index.ts');
    assert.ok(fs.existsSync(file), 'supabase/functions/privacy/index.ts absent — lancez npm run legal:build');
    assert.equal(fs.readFileSync(file, 'utf8'), renderFunction(), 'la fonction privacy a dérivé — relancez npm run legal:build');
});

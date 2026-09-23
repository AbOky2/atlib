const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { PRIVACY_POLICY } = require('../.test-build/lib/legal');
const { render } = require('../scripts/build-legal.cjs');

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

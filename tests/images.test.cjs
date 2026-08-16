const test = require('node:test');
const assert = require('node:assert/strict');

const { sizedImageUrl } = require('../.test-build/lib/images');

const SUPABASE_URL =
    'https://myonaycuggsbielvdzjc.supabase.co/storage/v1/object/public/restaurants/hero.jpg';

test('une image Supabase passe par le point de transformation', () => {
    const out = sizedImageUrl(SUPABASE_URL, { width: 400 });
    assert.ok(out.includes('/storage/v1/render/image/public/'));
    assert.ok(!out.includes('/storage/v1/object/public/'));
    assert.ok(out.includes('width=400'));
    assert.ok(out.includes('quality=70'), 'qualité par défaut appliquée');
});

test('la largeur est arrondie (un ratio d\'écran donne des décimales)', () => {
    const out = sizedImageUrl(SUPABASE_URL, { width: 312.5 });
    assert.ok(out.includes('width=313'), out);
});

test('la qualité est paramétrable', () => {
    assert.ok(sizedImageUrl(SUPABASE_URL, { width: 200, quality: 50 }).includes('quality=50'));
});

test('une URL externe est renvoyée intacte', () => {
    const external = 'https://images.example.com/photo.jpg?w=100';
    assert.equal(sizedImageUrl(external, { width: 400 }), external);
});

test('une URL déjà porteuse de paramètres reste valide', () => {
    const out = sizedImageUrl(`${SUPABASE_URL}?v=2`, { width: 400 });
    assert.ok(out.includes('?v=2&width=400'), out);
});

test('une source absente ne produit pas d\'URL', () => {
    assert.equal(sizedImageUrl(null, { width: 400 }), undefined);
    assert.equal(sizedImageUrl(undefined, { width: 400 }), undefined);
    assert.equal(sizedImageUrl('', { width: 400 }), undefined);
});

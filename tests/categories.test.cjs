const test = require('node:test');
const assert = require('node:assert/strict');

const { matchesCategory, ALL_CATEGORY_ID, FOOD_CATEGORIES } = require('../.test-build/lib/categories');

/**
 * Les catégories filtrent `restaurants.genre` par sous-chaîne. Ces tests figent
 * le lien entre les identifiants proposés dans l'interface et les valeurs
 * réellement présentes en base (voir supabase_seed.sql) : ajouter une catégorie
 * qui ne correspond à rien ne se voit qu'à l'écran, sous forme de liste vide.
 */
const GENRES_EN_BASE = [
    'Africain',
    'Burgers',
    'Grillades',
    'Heritage Smash Burger',
    'Pizza',
    'Pizzas',
    'Plats Traditionnels',
    'Traditionnel',
];

test('« Tout » ne filtre rien', () => {
    for (const genre of GENRES_EN_BASE) {
        assert.ok(matchesCategory(genre, ALL_CATEGORY_ID));
    }
    assert.ok(matchesCategory(null, ALL_CATEGORY_ID), 'même un genre absent reste visible');
});

test('chaque catégorie proposée correspond à au moins un genre existant', () => {
    for (const category of FOOD_CATEGORIES) {
        if (category.id === ALL_CATEGORY_ID) continue;
        const hits = GENRES_EN_BASE.filter((g) => matchesCategory(g, category.id));
        assert.ok(hits.length > 0, `« ${category.label} » (${category.id}) ne correspond à aucun genre en base`);
    }
});

test('les variantes singulier/pluriel du même genre sont captées ensemble', () => {
    assert.ok(matchesCategory('Pizza', 'pizza'));
    assert.ok(matchesCategory('Pizzas', 'pizza'));
    assert.ok(matchesCategory('Traditionnel', 'traditionnel'));
    assert.ok(matchesCategory('Plats Traditionnels', 'traditionnel'));
});

test('la correspondance ignore la casse', () => {
    assert.ok(matchesCategory('GRILLADES', 'grillades'));
    assert.ok(matchesCategory('grillades', 'grillades'));
});

test('un genre sans rapport ne remonte pas', () => {
    assert.equal(matchesCategory('Pizza', 'grillades'), false);
    assert.equal(matchesCategory(null, 'pizza'), false);
    assert.equal(matchesCategory(undefined, 'pizza'), false);
});

test('chaque catégorie a un identifiant unique et un libellé', () => {
    const ids = FOOD_CATEGORIES.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, 'identifiants dupliqués');
    FOOD_CATEGORIES.forEach((c) => {
        assert.ok(c.label && c.label.length > 0, `${c.id} sans libellé`);
    });
});

test('chaque catégorie possède un dessin dans CategoryIcon', () => {
    // Le composant associe un dessin à chaque id ; une catégorie ajoutée ici sans
    // dessin retomberait silencieusement sur l'icône générique.
    const src = require('node:fs').readFileSync('src/components/CategoryIcon.tsx', 'utf8');
    FOOD_CATEGORIES.forEach((c) => {
        const key = c.id === ALL_CATEGORY_ID ? '[ALL_CATEGORY_ID]' : c.id;
        assert.ok(src.includes(`${key}:`), `aucun dessin pour « ${c.id} » dans CategoryIcon.tsx`);
    });
});

test('« Tout » ouvre la liste, en première position', () => {
    assert.equal(FOOD_CATEGORIES[0].id, ALL_CATEGORY_ID);
});

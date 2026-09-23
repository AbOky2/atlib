const test = require('node:test');
const assert = require('node:assert/strict');

const { matchesCategory, ALL_CATEGORY_ID, FOOD_CATEGORIES, normalizeGenre } = require('../.test-build/lib/categories');

/**
 * Les catégories filtrent `restaurants.genre` par mots-clés. Ces tests figent le
 * lien entre les filtres proposés et les genres réellement saisis par les
 * restaurants (catalogue du 23 sept. 2026 + variantes historiques) : ajouter une
 * catégorie qui ne correspond à rien ne se voit qu'à l'écran, en liste vide.
 */
const GENRES_EN_BASE = [
    'Fast Food & Grill',
    'Pizza',
    'Africain',
    // Variantes rencontrées ou attendues dans les fiches restaurant.
    'Burgers',
    'Grillades',
    'Pizzas',
    'Plats Traditionnels',
    'Cuisine tchadienne',
    'Brochettes & Rôtisserie',
];

test('« Tout » ne filtre rien', () => {
    for (const genre of GENRES_EN_BASE) assert.ok(matchesCategory(genre, ALL_CATEGORY_ID));
    assert.ok(matchesCategory(null, ALL_CATEGORY_ID), 'même un genre absent reste visible');
});

test('chaque catégorie proposée correspond à au moins un genre existant', () => {
    for (const category of FOOD_CATEGORIES) {
        if (category.id === ALL_CATEGORY_ID) continue;
        const hits = GENRES_EN_BASE.filter((g) => matchesCategory(g, category.id));
        assert.ok(hits.length > 0, `« ${category.label} » (${category.id}) ne correspond à aucun genre en base`);
    }
});

test('les genres réels du catalogue tombent dans la bonne catégorie', () => {
    assert.ok(matchesCategory('Fast Food & Grill', 'grillades'), 'Le Grilladin doit apparaître sous Grillades');
    assert.ok(matchesCategory('Fast Food & Grill', 'burger'), 'un fast-food est aussi un burger');
    assert.ok(matchesCategory('Pizza', 'pizza'));
    assert.ok(matchesCategory('Africain', 'tchadien'), 'la donnée historique « Africain » reste trouvable sous Tchadien');
    assert.ok(matchesCategory('Cuisine tchadienne', 'tchadien'));
    assert.ok(matchesCategory('Plats Traditionnels', 'tchadien'));
    assert.ok(matchesCategory('Brochettes & Rôtisserie', 'grillades'), 'accents ignorés');
});

test('aucune catégorie ne s’appelle « Africain » : on est au Tchad', () => {
    for (const c of FOOD_CATEGORIES) assert.ok(!/afric/i.test(c.label) && c.id !== 'africain', c.id);
});

test('la correspondance ignore la casse et les accents', () => {
    assert.ok(matchesCategory('GRILLADES', 'grillades'));
    assert.equal(normalizeGenre('Rôtisserie Élégante'), 'rotisserie elegante');
});

test('un genre sans rapport ne remonte pas', () => {
    assert.equal(matchesCategory('Pizza', 'grillades'), false);
    assert.equal(matchesCategory(null, 'pizza'), false);
    assert.equal(matchesCategory(undefined, 'pizza'), false);
    assert.equal(matchesCategory('Pizza', 'inconnue'), false);
});

test('chaque catégorie a un identifiant unique et un libellé', () => {
    const ids = FOOD_CATEGORIES.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, 'identifiants dupliqués');
    FOOD_CATEGORIES.forEach((c) => assert.ok(c.label && c.label.length > 0, `${c.id} sans libellé`));
});

test('chaque catégorie possède un dessin dans CategoryIcon', () => {
    const src = require('node:fs').readFileSync('src/components/CategoryIcon.tsx', 'utf8');
    FOOD_CATEGORIES.forEach((c) => {
        const key = c.id === ALL_CATEGORY_ID ? '[ALL_CATEGORY_ID]' : c.id;
        assert.ok(src.includes(`${key}:`), `aucun dessin pour « ${c.id} » dans CategoryIcon.tsx`);
    });
});

test('« Tout » ouvre la liste, en première position', () => {
    assert.equal(FOOD_CATEGORIES[0].id, ALL_CATEGORY_ID);
});

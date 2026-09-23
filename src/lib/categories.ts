/**
 * The cuisine filters, defined once for Home and Explore.
 *
 * Each category owns the KEYWORDS that identify it in `restaurants.genre` — the
 * free text restaurants type in the dashboard. Matching is accent- and
 * case-insensitive on those keywords, so « Fast Food & Grill » is a grill and
 * « Plats Traditionnels » is Chadian cooking. A category whose keywords match no
 * genre in the catalogue only produces an empty screen; tests/categories.test.cjs
 * keeps this list honest against the genres actually in use.
 *
 * We are in Chad: the cooking of the country is simply « Local » — the word
 * people use — never « Africain », an outsider's word for the whole continent,
 * which the first catalogue used and which the keywords still recognise for
 * that legacy data.
 *
 * Deliberately free of any visual: this is the filtering rule, loadable and
 * testable outside React Native. Drawings live in src/components/CategoryIcon.tsx.
 */
export interface FoodCategory {
    id: string;
    label: string;
    /** Lower-case, unaccented stems searched in the genre. */
    keywords: readonly string[];
}

export const ALL_CATEGORY_ID = 'all';

export const FOOD_CATEGORIES: readonly FoodCategory[] = [
    { id: ALL_CATEGORY_ID, label: 'Tout', keywords: [] },
    { id: 'local', label: 'Local', keywords: ['local', 'tchad', 'tradition', 'maison', 'pays', 'africain'] },
    { id: 'grillades', label: 'Grillades', keywords: ['grill', 'braise', 'brochette', 'barbecue', 'bbq', 'roti'] },
    { id: 'pizza', label: 'Pizza', keywords: ['pizza', 'italien'] },
    { id: 'burger', label: 'Burgers', keywords: ['burger', 'fast food', 'fast-food', 'sandwich', 'snack'] },
];

/** Lower-case and strip accents, so « Rôti » and « roti » are the same word. */
export const normalizeGenre = (value: string): string =>
    value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Does this restaurant belong to the selected category? */
export function matchesCategory(genre: string | null | undefined, categoryId: string): boolean {
    if (categoryId === ALL_CATEGORY_ID) return true;
    if (!genre) return false;
    const category = FOOD_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return false;
    const haystack = normalizeGenre(genre);
    return category.keywords.some((keyword) => haystack.includes(keyword));
}

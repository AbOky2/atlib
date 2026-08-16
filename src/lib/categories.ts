/**
 * The cuisine filters, defined once for Home and Explore (they had drifted:
 * different icon sizes, different colours, one screen had a fifth entry).
 *
 * `id` is matched against `restaurants.genre` with a substring test, so each id
 * must be the stem the data actually contains — "traditionnel" catches both
 * "Traditionnel" and "Plats Traditionnels", "pizza" catches "Pizza" and
 * "Pizzas". Adding a category with no matching genre only produces an empty
 * screen, so this list follows the catalogue rather than the other way round;
 * tests/categories.test.cjs holds that line.
 *
 * Deliberately free of any visual: this is the filtering rule, and it stays
 * loadable (and testable) outside React Native. The drawings live with the view,
 * in src/components/CategoryIcon.tsx, keyed by these same ids.
 */
export interface FoodCategory {
    id: string;
    label: string;
}

export const ALL_CATEGORY_ID = 'all';

export const FOOD_CATEGORIES: FoodCategory[] = [
    { id: ALL_CATEGORY_ID, label: 'Tout' },
    { id: 'grillades', label: 'Grillades' },
    { id: 'traditionnel', label: 'Tradition' },
    { id: 'pizza', label: 'Pizza' },
    { id: 'burger', label: 'Burgers' },
    { id: 'africain', label: 'Africain' },
];

/** Does this restaurant belong to the selected category? */
export const matchesCategory = (genre: string | null | undefined, categoryId: string): boolean =>
    categoryId === ALL_CATEGORY_ID || !!genre?.toLowerCase().includes(categoryId.toLowerCase());

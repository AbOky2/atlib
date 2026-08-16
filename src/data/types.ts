import type { Database } from '../lib/database.types';

/**
 * The shapes the app actually reads.
 *
 * The generated types describe TABLES; screens read QUERIES, which carry joins.
 * Because those joined shapes were never declared, every screen fell back to
 * `any` — 52 of them across the app, and each one is a place where a renamed
 * column fails silently at runtime instead of loudly at build time.
 *
 * Declaring the join once, here, moves the single unavoidable cast to the data
 * layer boundary where it belongs.
 */

export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type Dish = Database['public']['Tables']['dishes']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];

/** A dish as the menu screens read it: the row plus the category it belongs to. */
export type MenuDish = Dish & { categories: Pick<Category, 'id' | 'name'> | null };

/** An order as the CUSTOMER reads it — with its lines and the restaurant. */
export type CustomerOrder = Order & {
    restaurants: Pick<Restaurant, 'name' | 'image_url'> | null;
    order_items: OrderItem[];
};

/** An order as the RESTAURANT reads it — the lines, no restaurant join needed. */
export type RestaurantOrder = Order & {
    order_items: OrderItem[];
};

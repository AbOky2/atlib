import { useQuery } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import { isLive } from '../lib/orderStatus';
import { isMissingColumn } from './postgrest';
import type { MenuDish, RestaurantOrder } from './types';

/**
 * The restaurant's own side of the product: the order queue and the menu it
 * controls. Read by the staff dashboard, never by the customer app.
 */

export const AVAILABILITY_ERRORS = { COLUMN_MISSING: 'COLUMN_MISSING' } as const;

const hasLiveOrder = (orders: RestaurantOrder[] | undefined): boolean =>
    Array.isArray(orders) && orders.some((o) => isLive(o.status));

const jittered = (base: number, spread: number) => base + Math.floor(Math.random() * spread);

/**
 * The restaurant id owned by the signed-in account.
 *
 * Returns null for a normal customer, which is exactly how the client app knows
 * whether to offer the staff entry point. `enabled` keeps signed-out users from
 * calling the RPC at all.
 */
export function useMyRestaurantId(enabled = true) {
    return useQuery({
        queryKey: ['my-restaurant-id'],
        queryFn: async (): Promise<string | null> => {
            const { data, error } = await supabase.rpc('my_restaurant_id');
            if (error) throw error;
            return (data as string | null) ?? null;
        },
        enabled,
        staleTime: 1000 * 60 * 10,
    });
}

export function useRestaurantOrders(restaurantId: string | undefined) {
    return useQuery({
        queryKey: ['restaurant-orders', restaurantId],
        queryFn: async (): Promise<RestaurantOrder[]> => {
            if (!restaurantId) return [];
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data ?? []) as RestaurantOrder[];
        },
        enabled: !!restaurantId,
        // Only poll while there is something to act on, so idle dashboards stop
        // scanning the orders table around the clock.
        refetchInterval: (query) =>
            hasLiveOrder(query.state.data as RestaurantOrder[] | undefined) ? jittered(20_000, 8_000) : false,
    });
}

/**
 * The restaurant's FULL menu, including dishes currently switched off.
 *
 * Distinct from `useDishes`, which is the customer's view and shows only what
 * can be ordered — the kitchen needs to see what it hid in order to bring it back.
 */
export function useMenuDishes(restaurantId: string | undefined) {
    return useQuery({
        queryKey: ['menu-dishes', restaurantId],
        queryFn: async (): Promise<MenuDish[]> => {
            const { data, error } = await supabase
                .from('dishes')
                .select('*, categories(id, name)')
                .eq('restaurant_id', restaurantId!)
                .order('name');
            if (error) throw error;
            return (data ?? []) as MenuDish[];
        },
        enabled: !!restaurantId,
        staleTime: 1000 * 60 * 5,
    });
}

/** Switch a dish on or off the menu. */
export async function setDishAvailability(dishId: string, available: boolean): Promise<void> {
    const { error } = await supabase.from('dishes').update({ is_available: available }).eq('id', dishId);
    if (error) throw error;
}

/**
 * Open or close a restaurant to new orders.
 *
 * Throws COLUMN_MISSING when the database hasn't been migrated yet, so the UI
 * can explain the situation instead of pretending the switch worked.
 */
export async function setRestaurantAcceptingOrders(
    restaurantId: string,
    accepting: boolean,
): Promise<void> {
    const { error } = await supabase
        .from('restaurants')
        .update({ is_accepting_orders: accepting })
        .eq('id', restaurantId);
    if (error) {
        if (isMissingColumn(error.code)) throw new Error(AVAILABILITY_ERRORS.COLUMN_MISSING);
        throw error;
    }
}

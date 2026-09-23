import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { reconcileOrderList } from '../lib/reconcile';
import { useQueryClient, useQuery } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import { isMissingColumn } from './postgrest';
import type { MenuDish, RestaurantOrder } from './types';

/**
 * The restaurant's own side of the product: the order queue and the menu it
 * controls. Read by the staff dashboard, never by the customer app.
 */

export const AVAILABILITY_ERRORS = { COLUMN_MISSING: 'COLUMN_MISSING' } as const;

const jittered = (base: number, spread: number) => base + Math.floor(Math.random() * spread);

/** Finished orders shown under the queue. Live orders are never capped: a limit
 *  shared with history could hide an old order still waiting in the kitchen. */
const RECENT_HISTORY = 30;

/**
 * The restaurant id owned by the signed-in account.
 *
 * Returns null for a normal customer, which is exactly how the client app knows
 * whether to offer the staff entry point. `enabled` keeps signed-out users from
 * calling the RPC at all.
 */
export function useMyRestaurantId(enabled = true) {
    const userId = useAuthStore(s => s.user?.id);
    return useQuery({
        queryKey: ['my-restaurant-id', userId],
        queryFn: async (): Promise<string | null> => {
            const { data, error } = await supabase.rpc('my_restaurant_id');
            if (error) throw error;
            return (data as string | null) ?? null;
        },
        enabled: enabled && !!userId,
        staleTime: 1000 * 60 * 10,
    });
}

export function useRestaurantOrders(restaurantId: string | undefined) {
    const client = useQueryClient();
    useEffect(() => {
        if (!restaurantId) return;
        const channel = supabase.channel(`restaurant-orders:${restaurantId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => {
                void client.invalidateQueries({ queryKey: ['restaurant-orders', restaurantId] });
            }).subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [restaurantId, client]);
    return useQuery({
        queryKey: ['restaurant-orders', restaurantId],
        queryFn: async (): Promise<RestaurantOrder[]> => {
            if (!restaurantId) return [];
            // Polled every ~20 s and on each Realtime event: reading the whole
            // history here would grow with every order the restaurant ever took.
            const [live, recent] = await Promise.all([
                supabase.from('orders').select('*, order_items(*)')
                    .eq('restaurant_id', restaurantId)
                    .not('status', 'in', '("DELIVERED","CANCELLED")')
                    .order('created_at', { ascending: false }),
                supabase.from('orders').select('*, order_items(*)')
                    .eq('restaurant_id', restaurantId)
                    .in('status', ['DELIVERED', 'CANCELLED'])
                    .order('created_at', { ascending: false })
                    .limit(RECENT_HISTORY),
            ]);
            if (live.error) throw live.error;
            if (recent.error) throw recent.error;
            return [...(live.data ?? []), ...(recent.data ?? [])]
                .sort((a, b) => Date.parse(b.created_at ?? '') - Date.parse(a.created_at ?? '')) as RestaurantOrder[];
        },
        enabled: !!restaurantId,
        structuralSharing: (old, next) => reconcileOrderList(old as RestaurantOrder[] | undefined, next as RestaurantOrder[]),
        // Empty queues must still discover new orders after a dropped channel.
        refetchInterval: () => jittered(20_000, 8_000),
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
    const { data, error } = await supabase.from('dishes').update({ is_available: available }).eq('id', dishId).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Modification refusée ou plat introuvable.');
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
    const { data, error } = await supabase
        .from('restaurants')
        .update({ is_accepting_orders: accepting })
        .eq('id', restaurantId).select('id').maybeSingle();
    if (error) {
        if (isMissingColumn(error.code)) throw new Error(AVAILABILITY_ERRORS.COLUMN_MISSING);
        throw error;
    }
    if (!data) throw new Error('Modification refusée ou restaurant introuvable.');
}

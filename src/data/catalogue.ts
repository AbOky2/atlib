import { useQuery, type QueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import type { MenuDish, Restaurant } from './types';

/**
 * The catalogue a customer browses: restaurants and their menus.
 *
 * Split out of the former `useSupabase` module, which mixed the catalogue, the
 * order lifecycle and the restaurant back-office in one 382-line file. Those
 * three change for entirely different reasons — a new filter on the menu has
 * nothing to do with how an order is confirmed — so they are three modules.
 */

/**
 * Restaurants, dishes and categories change rarely. Caching them hard means a
 * cold start and every navigation stop hitting the network — a large read
 * reduction at peak, and an app that feels instant on a slow connection.
 */
const NEAR_STATIC = { staleTime: 1000 * 60 * 30, gcTime: 1000 * 60 * 60 * 24 } as const;

// Shared fetchers, so the hooks and the prefetch helper can never drift.
const fetchRestaurants = async (): Promise<Restaurant[]> => {
    const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });
    if (error) throw error;
    return data;
};

const fetchRestaurantById = async (id: string): Promise<Restaurant> => {
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
};

/** The customer's view of a menu: only what can actually be ordered. */
const fetchAvailableDishes = async (restaurantId: string): Promise<MenuDish[]> => {
    const { data, error } = await supabase
        .from('dishes')
        .select('*, categories(id, name)')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true);
    if (error) throw error;
    return (data ?? []) as MenuDish[];
};

export function useRestaurants() {
    return useQuery({ queryKey: ['restaurants'], queryFn: fetchRestaurants, ...NEAR_STATIC });
}

export function useRestaurant(id: string) {
    return useQuery({
        queryKey: ['restaurant', id],
        queryFn: () => fetchRestaurantById(id),
        enabled: !!id,
        ...NEAR_STATIC,
    });
}

export function useDishes(restaurantId: string) {
    return useQuery({
        queryKey: ['dishes', restaurantId],
        queryFn: () => fetchAvailableDishes(restaurantId),
        enabled: !!restaurantId,
        ...NEAR_STATIC,
    });
}

/**
 * Warm a restaurant and its menu so opening the screen is instant.
 *
 * Called from `onPressIn`, which buys the round-trip the time it takes a thumb
 * to lift. When the restaurant is already in the list cache it is seeded
 * directly rather than refetched.
 */
export function prefetchRestaurant(queryClient: QueryClient, id: string) {
    if (!id) return;
    const cached = queryClient.getQueryData<Restaurant[]>(['restaurants'])?.find((r) => r.id === id);
    if (cached) {
        queryClient.setQueryData(['restaurant', id], cached);
    } else {
        queryClient.prefetchQuery({ queryKey: ['restaurant', id], queryFn: () => fetchRestaurantById(id) });
    }
    queryClient.prefetchQuery({ queryKey: ['dishes', id], queryFn: () => fetchAvailableDishes(id) });
}

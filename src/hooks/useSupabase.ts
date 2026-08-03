import { supabase } from '../lib/supabase';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { Database } from '../lib/database.types';
import { canTransition, isLive, type OrderStatus } from '../lib/orderStatus';

export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type Dish = Database['public']['Tables']['dishes']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

// ---- React Query Hooks ----

// Restaurants / dishes / categories change rarely — cache them hard so cold
// starts and navigation don't re-hit the network (huge read reduction at peak).
const NEAR_STATIC = { staleTime: 1000 * 60 * 30, gcTime: 1000 * 60 * 60 * 24 } as const;

/** Fetch all active restaurants */
export function useRestaurants() {
    return useQuery({
        queryKey: ['restaurants'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('restaurants')
                .select('*')
                .eq('is_active', true)
                .order('rating', { ascending: false });
            if (error) throw error;
            return data as Restaurant[];
        },
        ...NEAR_STATIC,
    });
}

// Shared fetchers so the hooks and the prefetch helper stay in sync.
const fetchRestaurantById = async (id: string) => {
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Restaurant;
};

const fetchDishesByRestaurant = async (restaurantId: string) => {
    const { data, error } = await supabase
        .from('dishes')
        .select('*, categories(*)')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true);
    if (error) throw error;
    return data;
};

/** Fetch a single restaurant by ID */
export function useRestaurant(id: string) {
    return useQuery({
        queryKey: ['restaurant', id],
        queryFn: () => fetchRestaurantById(id),
        enabled: !!id,
        ...NEAR_STATIC,
    });
}

/** Fetch dishes for a specific restaurant */
export function useDishes(restaurantId: string) {
    return useQuery({
        queryKey: ['dishes', restaurantId],
        queryFn: () => fetchDishesByRestaurant(restaurantId),
        enabled: !!restaurantId,
        ...NEAR_STATIC,
    });
}

/**
 * Warm the caches for a restaurant + its menu so opening the screen is instant.
 * Call from an onPressIn handler on restaurant cards. Also seeds the single
 * restaurant query from the already-cached restaurants list when possible.
 */
export function prefetchRestaurant(queryClient: QueryClient, id: string) {
    if (!id) return;
    const list = queryClient.getQueryData<Restaurant[]>(['restaurants']);
    const cached = list?.find((r) => r.id === id);
    if (cached) {
        queryClient.setQueryData(['restaurant', id], cached);
    } else {
        queryClient.prefetchQuery({ queryKey: ['restaurant', id], queryFn: () => fetchRestaurantById(id) });
    }
    queryClient.prefetchQuery({ queryKey: ['dishes', id], queryFn: () => fetchDishesByRestaurant(id) });
}

const hasLiveOrder = (data: any): boolean =>
    Array.isArray(data) && data.some((o: any) => isLive(o.status));

/** Fetch orders for the authenticated customer */
export function useUserOrders(customerId: string | undefined) {
    return useQuery({
        queryKey: ['orders', customerId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, restaurants(name, image_url), order_items(*)')
                .eq('customer_id', customerId!)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!customerId,
        // Realtime (GlobalOrderSync) is the primary freshness channel; this poll is a
        // safety net only while an order is live. 30s + jitter so 10k clients don't
        // align into synchronized request spikes (halves steady-state REST load vs 15s).
        refetchInterval: (query) => (hasLiveOrder(query.state.data) ? 30000 + Math.floor(Math.random() * 10000) : false),
    });
}

/** RPC helper: the restaurant id owned by the authenticated (admin) user. */
export function useMyRestaurantId() {
    return useQuery({
        queryKey: ['my-restaurant-id'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('my_restaurant_id');
            if (error) throw error;
            return (data as string | null) ?? null;
        },
    });
}

/** Fetch active order if it exists (SOLID validation layer) */
export async function getActiveOrder(customerId: string) {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .not('status', 'in', '("DELIVERED","CANCELLED")')
        .limit(1)
        .maybeSingle();
        
    if (error && error.code !== 'PGRST116') throw error; // ignore no rows found
    return data;
}

export interface CreateOrderInput {
    customer_id: string;
    customer_name: string;
    customer_phone: string;
    restaurant_id: string;
    restaurant_name: string;
    delivery_address: string;
    delivery_lat?: number;
    delivery_lng?: number;
    subtotal_xaf: number;
    delivery_fee_xaf: number;
    total_xaf: number;
    payment_method: string;
    delivery_zone?: string;
    delivery_note?: string;
    /** Idempotency key: generated ONCE per checkout attempt so a retry after a
     *  lost response returns the SAME order instead of creating a second one. */
    client_request_id?: string;
    items: { dish_id: string; name: string; qty: number; price_xaf: number }[];
}

/** Error codes surfaced to the UI — string-compared, so keep them stable. */
export const ORDER_ERRORS = {
    ACTIVE_ORDER_EXISTS: 'ACTIVE_ORDER_EXISTS',
    STATUS_CONFLICT: 'STATUS_CONFLICT',
} as const;

// PostgREST "function not found" — the create_order RPC hasn't been deployed yet.
const RPC_MISSING_CODES = new Set(['PGRST202', '42883']);
// Postgres unique violation — the partial unique index on live orders fired.
const UNIQUE_VIOLATION = '23505';

/**
 * Create a new order.
 *
 * Preferred path: the atomic `create_order` RPC (see supabase_production.sql) —
 * one transaction, totals recomputed server-side, uniqueness of the active order
 * enforced by the DB, idempotent on client_request_id.
 *
 * Fallback path (RPC not deployed yet): the legacy check-then-insert. It cannot
 * be fully race-free from the client, so it compensates: if the items insert
 * fails the freshly created header is cancelled/deleted (best effort) instead of
 * leaving an empty order that would block the customer.
 */
export async function createOrder(order: CreateOrderInput) {
    const { items, ...header } = order;

    // 1) Atomic RPC path.
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_order', {
        payload: { ...header, items },
    });
    if (!rpcError) return rpcData as Order;
    if (rpcError.code === UNIQUE_VIOLATION) {
        throw new Error(ORDER_ERRORS.ACTIVE_ORDER_EXISTS);
    }
    if (!RPC_MISSING_CODES.has(rpcError.code ?? '')) {
        throw rpcError;
    }

    // 2) Legacy fallback — RPC not deployed on this environment.
    const existingOrder = await getActiveOrder(order.customer_id);
    if (existingOrder) {
        throw new Error(ORDER_ERRORS.ACTIVE_ORDER_EXISTS);
    }

    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
            customer_id: order.customer_id,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            restaurant_id: order.restaurant_id,
            restaurant_name: order.restaurant_name,
            delivery_address: order.delivery_address,
            delivery_zone: order.delivery_zone,
            delivery_note: order.delivery_note,
            delivery_lat: order.delivery_lat,
            delivery_lng: order.delivery_lng,
            subtotal_xaf: order.subtotal_xaf,
            delivery_fee_xaf: order.delivery_fee_xaf,
            total_xaf: order.total_xaf,
            payment_method: order.payment_method,
            status: 'PENDING',
        })
        .select()
        .single();

    if (orderError) {
        if (orderError.code === UNIQUE_VIOLATION) throw new Error(ORDER_ERRORS.ACTIVE_ORDER_EXISTS);
        throw orderError;
    }

    const orderItems = items.map(item => ({
        order_id: orderData.id,
        dish_id: item.dish_id,
        name: item.name,
        qty: item.qty,
        price_xaf: item.price_xaf,
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

    if (itemsError) {
        // Compensate: never leave an item-less order blocking the account.
        const { error: deleteError } = await supabase.from('orders').delete().eq('id', orderData.id);
        if (deleteError) {
            await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', orderData.id);
        }
        throw itemsError;
    }

    return orderData;
}

/** Fetch orders for a specific restaurant (Dashboard Admin) */
export function useRestaurantOrders(restaurantId: string | undefined) {
    return useQuery({
        queryKey: ['restaurant-orders', restaurantId],
        queryFn: async () => {
            if (!restaurantId) return [];
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!restaurantId,
        // Poll only while there are live orders to act on, jittered, so idle dashboards
        // and thousands of restaurants don't scan the orders table every 15s unconditionally.
        refetchInterval: (query) => (hasLiveOrder(query.state.data) ? 20000 + Math.floor(Math.random() * 8000) : false),
    });
}

/**
 * Update order status through the legal state machine.
 *
 * When the caller knows the current status, pass it as `from`: the transition
 * is validated client-side AND the UPDATE is made conditional (`status = from`)
 * so a stale screen can never push an order backwards — e.g. cancelling a
 * PENDING order that the restaurant just accepted fails with STATUS_CONFLICT
 * instead of silently un-accepting it.
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus, from?: OrderStatus) {
    if (from && !canTransition(from, status)) {
        throw new Error(ORDER_ERRORS.STATUS_CONFLICT);
    }

    let query = supabase.from('orders').update({ status }).eq('id', orderId);
    if (from) query = query.eq('status', from);

    const { data, error } = await query.select().maybeSingle();

    if (error) throw error;
    // No row matched the conditional update → the status moved under our feet.
    if (!data) throw new Error(ORDER_ERRORS.STATUS_CONFLICT);
    return data;
}

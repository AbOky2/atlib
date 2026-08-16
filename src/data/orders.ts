import { useQuery } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import { canTransition, isLive, type OrderStatus } from '../lib/orderStatus';
import { isRpcMissing, isMissingColumn, UNIQUE_VIOLATION, NO_ROWS } from './postgrest';
import type { CustomerOrder, Order } from './types';

/**
 * The order lifecycle, from the customer's side: reading their orders, placing
 * one, and moving it through the state machine.
 */

/** Error codes surfaced to the UI — string-compared, so keep them stable. */
export const ORDER_ERRORS = {
    ACTIVE_ORDER_EXISTS: 'ACTIVE_ORDER_EXISTS',
    STATUS_CONFLICT: 'STATUS_CONFLICT',
} as const;

/** Polling is only worth its bandwidth while something can still change. */
const hasLiveOrder = (orders: CustomerOrder[] | undefined): boolean =>
    Array.isArray(orders) && orders.some((o) => isLive(o.status));

/** Jitter so thousands of clients never align into a synchronised spike. */
const jittered = (base: number, spread: number) => base + Math.floor(Math.random() * spread);

export function useUserOrders(customerId: string | undefined) {
    return useQuery({
        queryKey: ['orders', customerId],
        queryFn: async (): Promise<CustomerOrder[]> => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, restaurants(name, image_url), order_items(*)')
                .eq('customer_id', customerId!)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data ?? []) as CustomerOrder[];
        },
        enabled: !!customerId,
        // Realtime (GlobalOrderSync) is the primary freshness channel; this poll
        // is only a safety net, and only while an order is live.
        refetchInterval: (query) =>
            hasLiveOrder(query.state.data as CustomerOrder[] | undefined) ? jittered(30_000, 10_000) : false,
    });
}

/** The one order still in flight for this customer, if any. */
export async function getActiveOrder(customerId: string): Promise<Order | null> {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .not('status', 'in', '("DELIVERED","CANCELLED")')
        .limit(1)
        .maybeSingle();

    if (error && error.code !== NO_ROWS) throw error;
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
    /** Idempotency key: generated ONCE per checkout attempt, so a retry after a
     *  lost response returns the SAME order instead of creating a second one. */
    client_request_id?: string;
    /** Cash the customer will hand over, so the restaurant brings the change. */
    cash_paid_with_xaf?: number | null;
    /** Announced delivery time, persisted so the SERVER can rebuild the arrival
     *  label for Live Activity pushes without duplicating the locality table. */
    eta_minutes?: number | null;
    items: { dish_id: string; name: string; qty: number; price_xaf: number }[];
}

/**
 * Place an order.
 *
 * Preferred path: the atomic `create_order` RPC — one transaction, totals
 * recomputed server-side, uniqueness of the active order enforced by the
 * database, idempotent on `client_request_id`.
 *
 * Fallback: a check-then-insert, used only where the RPC isn't deployed. It
 * cannot be race-free from a client, so it compensates instead — if the items
 * fail to insert, the header it just created is removed rather than left as an
 * empty order blocking the account.
 */
export async function createOrder(order: CreateOrderInput): Promise<Order> {
    const { items, ...header } = order;

    const { data: rpcData, error: rpcError } = await supabase.rpc('create_order', {
        payload: { ...header, items },
    });
    if (!rpcError) return rpcData as Order;
    if (rpcError.code === UNIQUE_VIOLATION) throw new Error(ORDER_ERRORS.ACTIVE_ORDER_EXISTS);
    if (!isRpcMissing(rpcError.code)) throw rpcError;

    return createOrderWithoutRpc(order);
}

/** Legacy path. Kept isolated so the happy path above stays readable. */
async function createOrderWithoutRpc(order: CreateOrderInput): Promise<Order> {
    const { items } = order;

    if (await getActiveOrder(order.customer_id)) {
        throw new Error(ORDER_ERRORS.ACTIVE_ORDER_EXISTS);
    }

    const baseRow = {
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
    };
    // Columns added after the original schema. On a database that predates them
    // the insert is retried without them: a missing "change to give" must never
    // cost the customer their order.
    const optionalRow = {
        ...(order.cash_paid_with_xaf != null ? { cash_paid_with_xaf: order.cash_paid_with_xaf } : {}),
        ...(order.eta_minutes != null ? { eta_minutes: order.eta_minutes } : {}),
    };

    const insertHeader = (row: Record<string, unknown>) =>
        supabase.from('orders').insert(row).select().single();

    let { data: created, error } = await insertHeader({ ...baseRow, ...optionalRow });

    if (error && isMissingColumn(error.code) && Object.keys(optionalRow).length) {
        console.warn('[createOrder] colonne optionnelle absente — nouvel essai sans elle');
        ({ data: created, error } = await insertHeader(baseRow));
    }

    if (error || !created) {
        if (error?.code === UNIQUE_VIOLATION) throw new Error(ORDER_ERRORS.ACTIVE_ORDER_EXISTS);
        throw error ?? new Error('ORDER_CREATE_FAILED');
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
        items.map((item) => ({
            order_id: created.id,
            dish_id: item.dish_id,
            name: item.name,
            qty: item.qty,
            price_xaf: item.price_xaf,
        })),
    );

    if (itemsError) {
        // Compensate: never leave an item-less order blocking the account.
        const { error: deleteError } = await supabase.from('orders').delete().eq('id', created.id);
        if (deleteError) {
            await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', created.id);
        }
        throw itemsError;
    }

    return created;
}

/**
 * Move an order through the legal state machine.
 *
 * When the caller knows the current status, passing it as `from` makes the
 * UPDATE conditional: a stale screen can then never push an order backwards —
 * cancelling a PENDING order the restaurant just accepted fails with
 * STATUS_CONFLICT instead of silently un-accepting it.
 */
export async function updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    from?: OrderStatus,
): Promise<Order> {
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

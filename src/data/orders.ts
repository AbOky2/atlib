import { useQuery } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import { canTransition, isLive, type CancellationReason, type OrderStatus } from '../lib/orderStatus';
import { ORDER_ERRORS, mapServerOrderError } from '../lib/orderErrors';
import { isRpcMissing, UNIQUE_VIOLATION } from './postgrest';
import { reconcileOrderList } from '../lib/reconcile';
import type { CustomerOrder, Order } from './types';

export { ORDER_ERRORS } from '../lib/orderErrors';

/**
 * The order lifecycle, from the customer's side: reading their orders, placing
 * one, and moving it through the state machine.
 */

/** Polling is only worth its bandwidth while something can still change. */
const hasLiveOrder = (orders: CustomerOrder[] | undefined): boolean =>
    Array.isArray(orders) && orders.some((o) => isLive(o.status));

/** Jitter so thousands of clients never align into a synchronised spike. */
const jittered = (base: number, spread: number) => base + Math.floor(Math.random() * spread);

/** Each poll reads a bounded page, not the whole history: the load must follow
 *  traffic, not the account's age. The single active order is always the most
 *  recent one (one live order per customer), so it stays inside the page. */
const HISTORY_PAGE = 50;

/** A checkout that has not answered by then is treated as unknown, not failed:
 *  the idempotency key lets the customer retry without a duplicate. */
const CREATE_ORDER_TIMEOUT_MS = 25_000;

export function useUserOrders(customerId: string | undefined) {
    return useQuery({
        queryKey: ['orders', customerId],
        queryFn: async (): Promise<CustomerOrder[]> => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, restaurants(name, image_url), order_items(*)')
                .eq('customer_id', customerId!)
                .order('created_at', { ascending: false })
                .limit(HISTORY_PAGE);
            if (error) throw error;
            return (data ?? []) as CustomerOrder[];
        },
        enabled: !!customerId,
        structuralSharing: (old, next) => reconcileOrderList(old as CustomerOrder[] | undefined, next as CustomerOrder[]),
        // An empty cache may follow a lost checkout response or an order placed
        // on another device. Keep discovery alive even without a known live ID.
        refetchInterval: (query) =>
            hasLiveOrder(query.state.data as CustomerOrder[] | undefined) ? jittered(30_000, 10_000) : jittered(60_000, 15_000),
        // Coming back to the app after minutes away must show the current step
        // at once, not after the next poll.
        refetchOnWindowFocus: 'always',
    });
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
    items: { dish_id: string; name: string; qty: number; price_xaf: number; note?: string; options?: string[] }[];
}

/**
 * Atomic server validation is mandatory; never fall back to client inserts.
 * Rejects with an ORDER_ERRORS code the screen can act on.
 */
export async function createOrder(order: CreateOrderInput): Promise<Order> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CREATE_ORDER_TIMEOUT_MS);
    let response: Awaited<ReturnType<typeof supabase.rpc>>;
    try {
        response = await supabase.rpc('create_order', { payload: order }).abortSignal(controller.signal);
    } catch (thrown) {
        if (controller.signal.aborted) throw new Error(ORDER_ERRORS.TIMEOUT);
        throw thrown;
    } finally {
        clearTimeout(timer);
    }
    const { data, error } = response;
    if (!error) {
        if (!data || typeof data.id !== 'string' || !data.id || data.customer_id !== order.customer_id) {
            throw new Error(ORDER_ERRORS.INVALID_RESPONSE);
        }
        return data as Order;
    }
    if (controller.signal.aborted) throw new Error(ORDER_ERRORS.TIMEOUT);
    if (error.code === UNIQUE_VIOLATION) throw new Error(ORDER_ERRORS.ACTIVE_ORDER_EXISTS);
    if (isRpcMissing(error.code)) throw new Error(ORDER_ERRORS.SCHEMA_REQUIRED);
    const refusal = mapServerOrderError(error);
    if (refusal) throw new Error(refusal);
    throw error;
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
    /** Why, when `status` is CANCELLED. The server records it and tells the customer. */
    cancellationReason?: CancellationReason,
): Promise<Order> {
    if (from && !canTransition(from, status)) {
        throw new Error(ORDER_ERRORS.STATUS_CONFLICT);
    }

    const patch = status === 'CANCELLED' && cancellationReason ? { status, cancellation_reason: cancellationReason } : { status };
    let query = supabase.from('orders').update(patch).eq('id', orderId);
    if (from) query = query.eq('status', from);

    const { data, error } = await query.select().maybeSingle();

    if (error) throw error;
    // No row matched the conditional update → the status moved under our feet.
    if (!data) throw new Error(ORDER_ERRORS.STATUS_CONFLICT);
    return data;
}

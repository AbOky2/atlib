import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useUserOrders } from '../data/orders';
import { supabase } from '../lib/supabase';
import { findActiveOrder, isTerminal, isOrderStatus } from '../lib/orderStatus';
import { reconcileOrderRow } from '../lib/reconcile';
import {
    startDeliveryActivity,
    updateDeliveryActivity,
    endDeliveryActivity,
    onLiveActivityPushToken,
    onLiveActivityError } from '../lib/liveActivity';
import { applyOrderProgress } from '../lib/backgroundNotifications';
import { clearOrderProgress } from '../lib/notifications';
import { statusMeta } from '../lib/orderStatus';
import { arrivalTimeLabel } from '../lib/eta';
import { useQueryClient } from '@tanstack/react-query';
import { BRAND_FULL } from '../lib/brand';

/**
 * Single owner of the order Realtime subscription + iOS Live Activity lifecycle.
 * Two separate effects keep concerns clean and avoid churn:
 *   A) one Realtime channel per active order (id-keyed) that reconciles fresh
 *      rows into the react-query cache;
 *   B) drives the Live Activity from the *current* status, so it stays correct
 *      whether the status arrived via Realtime OR the polling fallback.
 *
 * Live Activity starts at PENDING so its update token reaches the server before
 * the app is suspended. The initial state explicitly awaits restaurant approval.
 * The ETA is pushed as a wall-clock ARRIVAL TIME ("19h45"), not a countdown:
 * the lock screen is read while the app is suspended, so a "12 min" string
 * would freeze at its last foreground value and lie for the rest of the
 * delivery. A target time needs no ticking timer to stay true — which is also
 * why this component no longer runs one (each tick spent part of ActivityKit's
 * update budget for nothing).
 *
 * Write reconciliation: every Realtime merge goes through reconcileOrderRow
 * (src/lib/reconcile.ts), guarded by `updated_at` — an older row (e.g. a poll
 * response that was in flight when the push landed) can never overwrite a
 * newer status.
 */

export default function GlobalOrderSync() {
    const user = useAuthStore((state) => state.user);
    const { data: orders } = useUserOrders(user?.id);
    const queryClient = useQueryClient();

    const activeOrder = findActiveOrder(orders);
    const activeId = activeOrder?.id;
    const activeStatus = activeOrder?.status;
    // The promise counts from acceptance — a late « Accepter » must not show a past time.
    const createdAt = activeOrder?.accepted_at ?? activeOrder?.created_at;

    const neighborhood = activeOrder?.delivery_zone || '';
    // Frozen at checkout (eta_minutes) so the server and the app announce the same time.
    const announcedEta = activeOrder?.eta_minutes ?? null;
    const updatedAt = activeOrder?.updated_at ?? null;
    const contextLine = neighborhood ? `Vers ${neighborhood}` : 'Livraison par le restaurant';

    const startedFor = useRef<string | null>(null);
    const lastLiveId = useRef<string | null>(null);
    // ActivityKit has an update budget: push a state once per CHANGE, not per poll.
    const lastPushed = useRef<string | null>(null);

    // A) Realtime channel — created ONCE per active order (id in deps only), not on
    // every status change, so we don't churn the join-rate limit at peak.
    useEffect(() => {
        if (!activeId) return;
        const channel = supabase
            .channel(`order-${activeId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeId}` },
                (payload) => {
                    try {
                        const fresh = (payload as any)?.new;
                        if (!fresh?.id) return;
                        queryClient.setQueryData(['orders', user?.id], (old: any) =>
                            reconcileOrderRow(old, fresh),
                        );
                    } catch (e) {
                        console.error('[GlobalOrderSync] realtime handler failed', e);
                    }
                },
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    // The 30s poll is the safety net; just surface it for monitoring.
                    console.warn('[GlobalOrderSync] realtime', status, '— falling back to polling');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeId, user?.id, queryClient]);

    // A-ter) Never lose a Live Activity failure in a device console again.
    useEffect(() => {
        return onLiveActivityError((message) => {
            startedFor.current = null;
            console.warn('[LiveActivity]', message);
        });
    }, []);

    // Token uploads survive transient failures while this owner is signed in.
    useEffect(() => {
        if (!user?.id) return;
        let disposed = false;
        let sending = false;
        const pending = new Map<string, string>();
        const flush = async () => {
            if (disposed || sending || useAuthStore.getState().user?.id !== user.id) return;
            sending = true;
            try {
                for (const [orderId, token] of pending) {
                    const { error } = await supabase.from('live_activity_tokens')
                        .upsert({ order_id: orderId, token, updated_at: new Date().toISOString() }, { onConflict: 'order_id' });
                    if (!error && pending.get(orderId) === token) pending.delete(orderId);
                    if (disposed) break;
                }
            } catch { /* Retries run on the next interval. */ }
            finally { sending = false; }
        };
        const stop = onLiveActivityPushToken(({ orderId, token }) => {
            if (!orderId || !token) return;
            pending.set(orderId, token); void flush();
        });
        const timer = setInterval(() => { void flush(); }, 15000);
        return () => { disposed = true; clearInterval(timer); stop(); };
    }, [user?.id]);

    // B) Ambient tracking follows the current status (from realtime OR poll):
    //    iOS gets the Live Activity, Android the ongoing notification. Same
    //    inputs, one decision point, so the two platforms can never tell the
    //    customer different things.
    useEffect(() => {
        // No live order anymore: close whatever is still up. When the last known
        // order was delivered, keep its final state visible a while.
        if (!activeId || !activeStatus) {
            if (orders) {
                // Only the order followed in THIS session gets a final state; an
                // old delivered order found at cold start must not ring again.
                const finished = lastLiveId.current ? orders.find((o) => o.id === lastLiveId.current) : undefined;
                endDeliveryActivity(finished?.status ?? orders[0]?.status);
                if (finished?.updated_at && user?.id && isOrderStatus(finished.status)) {
                    void applyOrderProgress({ kind: 'order-status', customerId: user.id, orderId: finished.id,
                        status: finished.status, updatedAt: finished.updated_at,
                        statusTitle: statusMeta(finished.status).headline, statusBody: statusMeta(finished.status).description,
                    }).catch(e => console.warn('[progress]', e));
                } else void clearOrderProgress();
                startedFor.current = null;
                lastLiveId.current = null;
                lastPushed.current = null;
            }
            return;
        }
        lastLiveId.current = activeId;

        if (isTerminal(activeStatus)) {
            if (startedFor.current) {
                endDeliveryActivity(activeStatus === 'DELIVERED' ? 'DELIVERED' : undefined);
                clearOrderProgress();
                startedFor.current = null;
            }
            return;
        }

        // Register the activity token while the app is awake, including PENDING.
        if (!isOrderStatus(activeStatus)) return;

        const arrival = announcedEta != null ? arrivalTimeLabel(createdAt, announcedEta) : null;
        const signature = `${activeId}|${activeStatus}|${updatedAt ?? ''}|${arrival ?? ''}`;
        if (lastPushed.current === signature) return;

        try {
            if (startedFor.current !== activeId) {
                startDeliveryActivity(activeId, activeOrder?.restaurant_name || BRAND_FULL);
                startedFor.current = activeId;
            }
            // One push per status change — the arrival time is absolute, so there
            // is nothing to refresh in between.
            updateDeliveryActivity(activeStatus, activeStatus === 'PENDING' ? '—' : arrival, contextLine);
            if (user?.id && updatedAt) void applyOrderProgress({
                kind: 'order-status', customerId: user.id, orderId: activeId,
                status: activeStatus, updatedAt,
                statusTitle: statusMeta(activeStatus).headline,
                statusBody: activeStatus === 'PENDING' ? 'Le restaurant doit accepter votre commande.' : arrival ? `Arrivée estimée vers ${arrival} · ${contextLine}` : contextLine,
            }).catch(e => console.warn('[progress]', e));
            lastPushed.current = signature;
        } catch (e) {
            console.error('[GlobalOrderSync] ambient tracking update failed', e);
        }
    }, [activeId, activeStatus, announcedEta, createdAt, updatedAt, contextLine, orders, user?.id]);

    return null;
}

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useUserOrders } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { getEstimatedDeliveryTime } from '../lib/localities';
import { findActiveOrder, isTerminal, statusIndex } from '../lib/orderStatus';
import { reconcileOrderRow } from '../lib/reconcile';
import {
    startDeliveryActivity,
    updateDeliveryActivity,
    endDeliveryActivity,
    onLiveActivityPushToken,
    onLiveActivityError } from '../lib/liveActivity';
import { postOrderProgress, clearOrderProgress } from '../lib/notifications';
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
 * Live Activity policy: it STARTS when the restaurant confirms (ACCEPTED), not
 * at creation — the lock screen tracks a confirmed order, never a pending one.
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
    const createdAt = activeOrder?.created_at;

    const neighborhood = (activeOrder as any)?.delivery_zone || '';
    const announcedEta = getEstimatedDeliveryTime(neighborhood || activeOrder?.delivery_address || '') || 15;
    const contextLine = neighborhood ? `Vers ${neighborhood}` : 'Livraison par le restaurant';

    const startedFor = useRef<string | null>(null);
    const lastLiveId = useRef<string | null>(null);

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
            console.warn('[LiveActivity]', message);
        });
    }, []);

    // A-bis) Hand the activity's APNs token to the backend.
    //
    // This is what turns the Live Activity from a nice demo into a real feature:
    // with it, the server can advance the lock screen while the app is
    // suspended. Storing it is best-effort — a failure here costs the push
    // channel, never the order.
    useEffect(() => {
        return onLiveActivityPushToken(({ orderId, token }) => {
            if (!orderId || !token) return;
            supabase
                .from('live_activity_tokens')
                .upsert({ order_id: orderId, token, updated_at: new Date().toISOString() }, { onConflict: 'order_id' })
                .then(({ error }) => {
                    if (error) console.warn('[GlobalOrderSync] token Live Activity non enregistré:', error.message);
                });
        });
    }, []);

    // B) Ambient tracking follows the current status (from realtime OR poll):
    //    iOS gets the Live Activity, Android the ongoing notification. Same
    //    inputs, one decision point, so the two platforms can never tell the
    //    customer different things.
    useEffect(() => {
        // No live order anymore: close whatever is still up. When the last known
        // order was delivered, keep its final state visible a while.
        if (!activeId || !activeStatus) {
            if (startedFor.current) {
                const finished = orders?.find((o) => o.id === lastLiveId.current);
                endDeliveryActivity(finished?.status === 'DELIVERED' ? 'DELIVERED' : undefined);
                clearOrderProgress();
                startedFor.current = null;
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

        // Not confirmed yet → nothing on the lock screen or in the shade.
        if (statusIndex(activeStatus) < 1) return;

        const arrival = arrivalTimeLabel(createdAt, announcedEta);

        try {
            if (startedFor.current !== activeId) {
                startDeliveryActivity(activeId, activeOrder?.restaurant_name || BRAND_FULL);
                startedFor.current = activeId;
            }
            // One push per status change — the arrival time is absolute, so there
            // is nothing to refresh in between.
            updateDeliveryActivity(activeStatus, arrival, contextLine);
            postOrderProgress(
                activeId,
                statusMeta(activeStatus).headline,
                arrival ? `Arrivée estimée vers ${arrival} · ${contextLine}` : contextLine,
            );
        } catch (e) {
            console.error('[GlobalOrderSync] ambient tracking update failed', e);
        }
    }, [activeId, activeStatus, announcedEta, createdAt, contextLine]);

    return null;
}

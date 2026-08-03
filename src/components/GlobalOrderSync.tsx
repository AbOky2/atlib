import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useUserOrders } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { getEstimatedDeliveryTime } from '../lib/localities';
import { findActiveOrder, isTerminal, statusIndex } from '../lib/orderStatus';
import { reconcileOrderRow } from '../lib/reconcile';
import { startDeliveryActivity, updateDeliveryActivity, endDeliveryActivity } from '../lib/liveActivity';
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
 * The remaining ETA is recomputed every minute so the island stays honest.
 *
 * Write reconciliation: every Realtime merge goes through reconcileOrderRow
 * (src/lib/reconcile.ts), guarded by `updated_at` — an older row (e.g. a poll
 * response that was in flight when the push landed) can never overwrite a
 * newer status.
 */

/** Announced ETA minus elapsed time, floored to a couple of minutes. */
function remainingEtaMins(createdAt: string | null | undefined, announcedEta: number): number {
    if (!createdAt) return announcedEta;
    const elapsedMin = (Date.now() - new Date(createdAt).getTime()) / 60_000;
    return Math.max(2, Math.round(announcedEta - elapsedMin));
}

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

    // B) Live Activity follows the current status (from realtime OR poll).
    useEffect(() => {
        // No live order anymore: close whatever activity is still up. When the
        // last known order was delivered, keep its final state visible a while.
        if (!activeId || !activeStatus) {
            if (startedFor.current) {
                const finished = orders?.find((o) => o.id === lastLiveId.current);
                endDeliveryActivity(finished?.status === 'DELIVERED' ? 'DELIVERED' : undefined);
                startedFor.current = null;
            }
            return;
        }
        lastLiveId.current = activeId;

        if (isTerminal(activeStatus)) {
            if (startedFor.current) {
                endDeliveryActivity(activeStatus === 'DELIVERED' ? 'DELIVERED' : undefined);
                startedFor.current = null;
            }
            return;
        }

        // Not confirmed yet → nothing on the lock screen.
        if (statusIndex(activeStatus) < 1) return;

        try {
            if (startedFor.current !== activeId) {
                startDeliveryActivity(activeId, activeOrder?.restaurant_name || BRAND_FULL);
                startedFor.current = activeId;
            }
            const push = () =>
                updateDeliveryActivity(activeStatus, remainingEtaMins(createdAt, announcedEta), contextLine);
            push();
            // Keep the countdown honest between status changes.
            const tick = setInterval(push, 60_000);
            return () => clearInterval(tick);
        } catch (e) {
            console.error('[GlobalOrderSync] live activity update failed', e);
        }
    }, [activeId, activeStatus, announcedEta, createdAt, contextLine]);

    return null;
}

import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';

import { notifyNow, NEW_ORDER_CHANNEL_ID } from '../lib/notifications';

/** How often we re-alert while an order is still waiting to be accepted. */
const REMINDER_MS = 25_000;

/**
 * Makes a new order impossible to miss on the restaurant dashboard.
 *
 * The failure mode this exists to prevent is mundane and fatal: an order lands,
 * nobody is looking at the screen, and it sits in PENDING while the customer
 * watches "en attente de confirmation" and gives up. A silent dashboard is not
 * an operational tool.
 *
 * Two layers, both working while the dashboard is open:
 *   1. a local notification (with sound) the moment an unseen PENDING order appears;
 *   2. a nagging reminder every 25s for as long as ANY order is still unaccepted.
 *
 * Server-side push (supabase_notifications.sql + the Edge Function) is what makes
 * this work when the app is closed; this hook is what makes it work when it's open.
 */
export function useNewOrderAlert(orders: { id: string; status: string; customer_name?: string | null }[] | undefined) {
    const alerted = useRef<Set<string>>(new Set());
    // Skip the very first load: existing pending orders shouldn't all ring at once.
    const primed = useRef(false);

    const pending = (orders ?? []).filter((o) => o.status === 'PENDING');
    const pendingCount = pending.length;
    const pendingKey = pending.map((o) => o.id).join(',');

    // 1) Alert once per newly seen pending order.
    useEffect(() => {
        if (!orders) return;

        if (!primed.current) {
            primed.current = true;
            pending.forEach((o) => alerted.current.add(o.id));
            return;
        }

        const fresh = pending.filter((o) => !alerted.current.has(o.id));
        if (fresh.length === 0) return;

        fresh.forEach((o) => alerted.current.add(o.id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notifyNow(
            fresh.length > 1 ? `${fresh.length} nouvelles commandes` : 'Nouvelle commande',
            fresh.length > 1
                ? 'Plusieurs commandes attendent votre confirmation.'
                : `${fresh[0].customer_name || 'Un client'} attend votre confirmation.`,
            { channelId: NEW_ORDER_CHANNEL_ID, data: { kind: 'new-order' } },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingKey, !!orders]);

    // 2) Keep nagging while anything is still unaccepted.
    useEffect(() => {
        if (pendingCount === 0) return;
        const tick = setInterval(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            notifyNow(
                'Commande en attente',
                `${pendingCount} commande${pendingCount > 1 ? 's' : ''} à confirmer.`,
                { channelId: NEW_ORDER_CHANNEL_ID, data: { kind: 'new-order' }, identifier: 'new-order-reminder' },
            );
        }, REMINDER_MS);
        return () => clearInterval(tick);
    }, [pendingCount]);
}

import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useUserOrders } from '../data/orders';
import { cancellationMessage, statusMeta } from '../lib/orderStatus';

export interface AppNotification {
    id: string;
    orderId: string;
    title: string;
    body: string;
    status: string;
    createdAt: string;
    read: boolean;
}

/** Same words as the tracking screen, the push and the widget — never a second vocabulary. */
const bodyFor = (status: string, reason: string | null | undefined) =>
    status === 'CANCELLED' ? cancellationMessage(reason) : statusMeta(status).description;

/**
 * Notifications derived entirely from the user's real orders (react-query).
 * One notification per order reflecting its CURRENT status; the id encodes the
 * status so a status change surfaces a fresh (unread) notification. No mock data.
 */
export function useNotifications() {
    const user = useAuthStore((s) => s.user);
    const { data: orders } = useUserOrders(user?.id);
    const readIds = useNotificationStore((s) => s.readIds);

    const items = useMemo<AppNotification[]>(() => {
        const list = (orders ?? []).map((o) => {
            const id = `${o.id}:${o.status}`;
            return {
                id,
                orderId: o.id,
                title: o.restaurant_name || o.restaurants?.name || `Commande #${String(o.id).slice(0, 6).toUpperCase()}`,
                body: bodyFor(o.status, o.cancellation_reason),
                status: o.status,
                createdAt: o.updated_at ?? o.created_at ?? '',
                read: readIds.includes(id),
            };
        });
        return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }, [orders, readIds]);

    const unreadCount = items.reduce((n, i) => (i.read ? n : n + 1), 0);

    return { items, unreadCount };
}

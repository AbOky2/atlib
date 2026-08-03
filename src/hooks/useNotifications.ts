import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useUserOrders } from './useSupabase';
import { statusLabel } from '../lib/liveActivity';

export interface AppNotification {
    id: string;
    orderId: string;
    title: string;
    body: string;
    status: string;
    createdAt: string;
    read: boolean;
}

/** Human sentence for an order's current status (data-driven, no static copy). */
const bodyFor = (status: string) => {
    switch (status) {
        case 'PENDING': return 'Votre commande a bien été reçue.';
        case 'ACCEPTED': return 'Le restaurant a accepté votre commande.';
        case 'PREPARING': return 'Votre repas est en préparation.';
        case 'READY': return 'Votre commande est prête, en attente du livreur.';
        case 'OUT_FOR_DELIVERY': return 'Votre livreur est en route vers vous !';
        case 'DELIVERED': return 'Commande livrée. Bon appétit ! 🎉';
        case 'CANCELLED': return 'Cette commande a été annulée.';
        default: return statusLabel(status);
    }
};

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
        const list = (orders ?? []).map((o: any) => {
            const id = `${o.id}:${o.status}`;
            return {
                id,
                orderId: o.id,
                title: o.restaurant_name || o.restaurants?.name || `Commande #${String(o.id).slice(0, 6).toUpperCase()}`,
                body: bodyFor(o.status),
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

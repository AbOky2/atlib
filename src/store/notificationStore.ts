import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/storage';

/**
 * Tracks which notifications the user has already seen. Notifications themselves
 * are DERIVED from real order data (see useNotifications) — this store only holds
 * read state. It is intentionally seeded EMPTY: nothing is faked.
 */
interface NotificationStore {
    readIds: string[];
    lastSeenAt: number | null;
    markRead: (id: string) => void;
    markAllRead: (ids: string[]) => void;
}

export const useNotificationStore = create<NotificationStore>()(
    persist(
        (set) => ({
            readIds: [],
            lastSeenAt: null,
            markRead: (id) =>
                set((state) => (state.readIds.includes(id) ? state : { readIds: [...state.readIds, id] })),
            markAllRead: (ids) =>
                set((state) => {
                    const merged = Array.from(new Set([...state.readIds, ...ids]));
                    // Cap the persisted set so it can't grow unbounded over the app's life.
                    const trimmed = merged.length > 200 ? merged.slice(merged.length - 200) : merged;
                    return { readIds: trimmed, lastSeenAt: Date.now() };
                }),
        }),
        {
            name: 'notification-store',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/storage';

// v0 shipped these three demo restaurant ids pre-favourited; v1 starts empty
// and the migration removes them from already-persisted stores.
const LEGACY_SEEDED_IDS = [
    'a1b2c3d4-e5f6-7890-abcd-ef1234567801',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567802',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567803',
];

interface FavoritesStore {
    favoriteIds: string[];
    toggleFavorite: (id: string) => boolean;
    isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>()(
    persist(
        (set, get) => ({
            favoriteIds: [],
            toggleFavorite: (id) => {
                const isFav = get().favoriteIds.includes(id);
                if (isFav) {
                    set((state) => ({ favoriteIds: state.favoriteIds.filter(f => f !== id) }));
                    return false;
                } else {
                    set((state) => ({ favoriteIds: [...state.favoriteIds, id] }));
                    return true;
                }
            },
            isFavorite: (id) => get().favoriteIds.includes(id),
        }),
        {
            name: 'favorites-store',
            version: 1,
            storage: createJSONStorage(() => zustandStorage),
            partialize: (state) => ({ favoriteIds: state.favoriteIds }),
            migrate: (persisted: any, version) => {
                if (persisted?.favoriteIds && version < 1) {
                    persisted.favoriteIds = persisted.favoriteIds.filter(
                        (id: string) => !LEGACY_SEEDED_IDS.includes(id),
                    );
                }
                return persisted;
            },
        }
    )
);

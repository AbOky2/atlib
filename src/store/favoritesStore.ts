import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/storage';

interface FavoritesStore {
    favoriteIds: string[];
    toggleFavorite: (id: string) => boolean;
    isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>()(
    persist(
        (set, get) => ({
            favoriteIds: ['a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'a1b2c3d4-e5f6-7890-abcd-ef1234567803'],
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
            storage: createJSONStorage(() => zustandStorage),
            partialize: (state) => ({ favoriteIds: state.favoriteIds }),
        }
    )
);

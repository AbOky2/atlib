import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/storage';
import { makeLineId } from '../lib/cartLine';

export interface CartItem {
    /** Unique key for this cart line (dish + its customization). Auto-derived. */
    lineId: string;
    /** Dish id (shared across lines of the same dish with different options). */
    id: string;
    name: string;
    price: number;
    quantity: number;
    restaurantId: string;
    restaurantName?: string;
    image_url?: string;
    options?: string[];
    /** Free-text special instructions from the customization modal. */
    note?: string;
}

/** What callers pass to addItem — lineId is derived, quantity defaults to 1. */
export type AddCartItem = Omit<CartItem, 'lineId' | 'quantity'> & { quantity?: number };

interface CartStore {
    items: CartItem[];
    currentRestaurantId: string | null;
    currentRestaurantName: string | null;
    deliveryAddress: { locality: string; description: string; note?: string; phone?: string } | null;
    addItem: (item: AddCartItem) => void;
    removeItem: (lineId: string) => void;
    updateQuantity: (lineId: string, quantity: number) => void;
    clearCart: () => void;
    setDeliveryAddress: (address: { locality: string; description: string; note?: string; phone?: string }) => void;
    getTotalPrice: () => number;
    getTotalItems: () => number;
    toastMessage: string | null;
    toastType: 'success' | 'error' | 'info';
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    hideToast: () => void;

    // Global Dialog State
    dialogConfig: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        destructive?: boolean;
        onConfirm: () => void;
        onCancel?: () => void;
    } | null;
    showDialog: (config: NonNullable<CartStore['dialogConfig']>) => void;
    hideDialog: () => void;
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
    items: [],
    currentRestaurantId: null,
    currentRestaurantName: null,
    deliveryAddress: null,

    addItem: (newItem) => {
        const currentId = get().currentRestaurantId;

        // Safety: reject items with invalid price
        if (!newItem.price || newItem.price <= 0) return;

        const lineId = makeLineId(newItem.id, newItem.note, newItem.options);
        const qtyToAdd = Math.min(Math.max(newItem.quantity ?? 1, 1), 99);

        // If cart has items from a different restaurant, ask user to clear
        if (currentId && currentId !== newItem.restaurantId && get().items.length > 0) {
            get().showDialog({
                title: 'Nouveau restaurant',
                message: `Votre panier contient des plats d'un autre restaurant. Voulez-vous vider le panier et ajouter ce plat ?`,
                confirmText: 'Vider et ajouter',
                cancelText: 'Annuler',
                destructive: true,
                onConfirm: () => {
                    set({
                        items: [{ ...newItem, lineId, quantity: qtyToAdd }],
                        currentRestaurantId: newItem.restaurantId,
                        currentRestaurantName: newItem.restaurantName || null,
                    });
                }
            });
            return;
        }

        set((state) => {
            const existingItem = state.items.find(item => item.lineId === lineId);
            if (existingItem) {
                const newQty = Math.min(existingItem.quantity + qtyToAdd, 99);
                return {
                    items: state.items.map(item =>
                        item.lineId === lineId ? { ...item, quantity: newQty } : item
                    ),
                    currentRestaurantId: newItem.restaurantId,
                    currentRestaurantName: newItem.restaurantName || state.currentRestaurantName,
                };
            }
            return {
                items: [...state.items, { ...newItem, lineId, quantity: qtyToAdd }],
                currentRestaurantId: newItem.restaurantId,
                currentRestaurantName: newItem.restaurantName || state.currentRestaurantName,
            };
        });
    },

    removeItem: (lineId) => set((state) => {
        const newItems = state.items.filter(item => item.lineId !== lineId);
        return {
            items: newItems,
            currentRestaurantId: newItems.length === 0 ? null : state.currentRestaurantId,
            currentRestaurantName: newItems.length === 0 ? null : state.currentRestaurantName,
        };
    }),

    updateQuantity: (lineId, quantity) => set((state) => {
        // Cap between 0 (remove) and 99
        const clampedQty = Math.min(Math.max(quantity, 0), 99);
        const newItems = clampedQty <= 0
            ? state.items.filter(item => item.lineId !== lineId)
            : state.items.map(item => item.lineId === lineId ? { ...item, quantity: clampedQty } : item);
        return {
            items: newItems,
            currentRestaurantId: newItems.length === 0 ? null : state.currentRestaurantId,
            currentRestaurantName: newItems.length === 0 ? null : state.currentRestaurantName,
        };
    }),

    clearCart: () => set({
        items: [],
        currentRestaurantId: null,
        currentRestaurantName: null,
    }),
    
    setDeliveryAddress: (address) => set({ deliveryAddress: address }),

    getTotalPrice: () => get().items.reduce((total, item) => total + (item.price * item.quantity), 0),
    getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),

    toastMessage: null,
    toastType: 'success',
    showToast: (message, type = 'success') => {
        set({ toastMessage: message, toastType: type });
        setTimeout(() => {
            set((state) => (state.toastMessage === message ? { toastMessage: null } : state));
        }, 3000);
    },
    hideToast: () => set({ toastMessage: null }),

    dialogConfig: null,
    showDialog: (config) => set({ dialogConfig: config }),
    hideDialog: () => set({ dialogConfig: null }),
        }),
        {
            name: 'cart-store',
            version: 1,
            storage: createJSONStorage(() => zustandStorage),
            // Only persist the actual cart data — never the transient toast/dialog UI state.
            partialize: (state) => ({
                items: state.items,
                currentRestaurantId: state.currentRestaurantId,
                currentRestaurantName: state.currentRestaurantName,
                deliveryAddress: state.deliveryAddress,
            }),
            // v0 carts had no lineId — backfill it so cart operations keep working.
            migrate: (persisted: any, version) => {
                if (persisted?.items && version < 1) {
                    persisted.items = persisted.items.map((it: any) => ({
                        ...it,
                        lineId: it.lineId ?? makeLineId(it.id, it.note, it.options),
                    }));
                }
                return persisted;
            },
        }
    )
);

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/storage';
import { uuidv4 } from '../lib/ids';
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

export interface DeliveryAddress { locality: string; description: string; note?: string; phone?: string }

/** The subset of a menu row the cart needs to stay truthful. */
export interface MenuSnapshotDish { id: string; price_xaf: number | null; is_available: boolean | null }

/**
 * How long a checkout attempt keeps its idempotency key.
 *
 * A retry after a lost response happens within minutes and must reuse the key
 * so the server returns the SAME order. But the same key kept for days would
 * make an identical basket "return" an order already delivered instead of
 * creating a new one — so the key expires.
 */
export const CHECKOUT_ATTEMPT_TTL_MS = 30 * 60 * 1000;

export interface CheckoutAttempt { fingerprint: string; id: string; createdAt: number }

interface CartStore {
    checkoutAttempt: CheckoutAttempt | null;
    getCheckoutRequestId: (fingerprint: string) => string;
    /** Forget the current key: the next submission is a NEW order. */
    resetCheckoutAttempt: () => void;
    items: CartItem[];
    currentRestaurantId: string | null;
    currentRestaurantName: string | null;
    deliveryAddress: DeliveryAddress | null;
    /** Note the customer will hand over; null = exact change. Persisted so a
     *  relaunch mid-checkout resumes the same attempt. */
    cashPaidWith: number | null;
    setCashPaidWith: (amount: number | null) => void;
    addItem: (item: AddCartItem) => void;
    removeItem: (lineId: string) => void;
    updateQuantity: (lineId: string, quantity: number) => void;
    clearCart: () => void;
    setDeliveryAddress: (address: DeliveryAddress) => void;
    /**
     * Align the basket with the menu just fetched: drop lines whose dish is gone
     * or unavailable, follow price changes. Returns what changed so the screen
     * can tell the customer.
     */
    reconcileWithMenu: (restaurantId: string, dishes: MenuSnapshotDish[]) => { removed: string[]; repriced: string[] };
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

const EMPTY_CART = {
    checkoutAttempt: null,
    items: [] as CartItem[],
    currentRestaurantId: null,
    currentRestaurantName: null,
    cashPaidWith: null,
};

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
    checkoutAttempt: null,
    getCheckoutRequestId: (fingerprint) => {
        const old = get().checkoutAttempt;
        const fresh = !!old && Date.now() - old.createdAt < CHECKOUT_ATTEMPT_TTL_MS;
        if (old?.fingerprint === fingerprint && fresh) return old.id;
        const id = uuidv4();
        set({ checkoutAttempt: { fingerprint, id, createdAt: Date.now() } });
        return id;
    },
    resetCheckoutAttempt: () => set({ checkoutAttempt: null }),
    items: [],
    currentRestaurantId: null,
    currentRestaurantName: null,
    deliveryAddress: null,
    cashPaidWith: null,
    setCashPaidWith: (amount) => set({ cashPaidWith: amount }),

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
                        ...EMPTY_CART,
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

    clearCart: () => set({ ...EMPTY_CART }),

    setDeliveryAddress: (address) => set({ deliveryAddress: address }),

    reconcileWithMenu: (restaurantId, dishes) => {
        const state = get();
        if (state.currentRestaurantId !== restaurantId || state.items.length === 0) return { removed: [], repriced: [] };
        const byId = new Map(dishes.map((d) => [d.id, d]));
        const removed: string[] = [];
        const repriced: string[] = [];
        const items: CartItem[] = [];
        for (const line of state.items) {
            const dish = byId.get(line.id);
            if (!dish || dish.is_available !== true || !dish.price_xaf || dish.price_xaf <= 0) {
                removed.push(line.name);
                continue;
            }
            if (dish.price_xaf !== line.price) {
                repriced.push(line.name);
                items.push({ ...line, price: dish.price_xaf });
            } else {
                items.push(line);
            }
        }
        if (removed.length || repriced.length) {
            set({
                items,
                currentRestaurantId: items.length === 0 ? null : state.currentRestaurantId,
                currentRestaurantName: items.length === 0 ? null : state.currentRestaurantName,
                // The basket changed: a retry must be a new attempt.
                checkoutAttempt: null,
            });
        }
        return { removed, repriced };
    },

    getTotalPrice: () => get().items.reduce((total, item) => total + (item.price * item.quantity), 0),
    getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),

    toastMessage: null,
    toastType: 'success',
    showToast: (message, type = 'success') => {
        set({ toastMessage: message, toastType: type });
        // Errors are longer and matter more: leave them on screen long enough to read.
        setTimeout(() => {
            set((state) => (state.toastMessage === message ? { toastMessage: null } : state));
        }, type === 'error' ? 5000 : 3000);
    },
    hideToast: () => set({ toastMessage: null }),

    dialogConfig: null,
    showDialog: (config) => set({ dialogConfig: config }),
    hideDialog: () => set({ dialogConfig: null }),
        }),
        {
            name: 'cart-store',
            version: 2,
            storage: createJSONStorage(() => zustandStorage),
            // Only persist the actual cart data — never the transient toast/dialog UI state.
            partialize: (state) => ({
                checkoutAttempt: state.checkoutAttempt,
                items: state.items,
                currentRestaurantId: state.currentRestaurantId,
                currentRestaurantName: state.currentRestaurantName,
                deliveryAddress: state.deliveryAddress,
                cashPaidWith: state.cashPaidWith,
            }),
            migrate: (persisted: any, version) => {
                // v0 carts had no lineId — backfill it so cart operations keep working.
                if (persisted?.items && version < 1) {
                    persisted.items = persisted.items.map((it: any) => ({
                        ...it,
                        lineId: it.lineId ?? makeLineId(it.id, it.note, it.options),
                    }));
                }
                // v1 attempts had no age: treat them as expired rather than reuse a
                // key of unknown origin.
                if (version < 2) {
                    persisted.checkoutAttempt = null;
                    persisted.cashPaidWith = null;
                }
                return persisted;
            },
        }
    )
);

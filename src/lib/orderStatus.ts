/**
 * Single source of truth for the order lifecycle.
 *
 * Replaces the duplicated (and already diverging) status labels/colours/order
 * previously copy-pasted across tracking.tsx, orders.tsx, dashboard.tsx and
 * liveActivity.ts. Domain rules (statuses, flow, legal transitions) live at the
 * top; presentation metadata (labels, colours, progress) below — both exported
 * from here so they can never drift again.
 */
import { COLORS } from './palette';

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
    'PENDING',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The happy path, in order. CANCELLED is a branch, not a step. */
export const STATUS_FLOW: readonly OrderStatus[] = [
    'PENDING',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
];

/**
 * State machine: which transitions the app is allowed to request.
 * The dashboard derives its action buttons from this; updateOrderStatus refuses
 * anything else, so a stale UI can never push an order backwards.
 */
export const LEGAL_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
    PENDING: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    // A delivery can still fail (customer unreachable); the customer can confirm reception.
    OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: [],
};

export const isOrderStatus = (value: unknown): value is OrderStatus =>
    typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
    LEGAL_TRANSITIONS[from].includes(to);

/** Terminal = nothing will ever change on this order again. */
export const isTerminal = (status: string): boolean =>
    status === 'DELIVERED' || status === 'CANCELLED';

/** Live = the customer is still waiting for food. */
export const isLive = (status: string): boolean => !isTerminal(status);

/** Position on the happy path (0..5), or -1 for CANCELLED / unknown. */
export const statusIndex = (status: string): number =>
    STATUS_FLOW.indexOf(status as OrderStatus);

/**
 * The one order the app should surface (banner, tracking, live activity).
 * Centralised so every screen agrees on what "active" means.
 */
export const findActiveOrder = <T extends { status: string }>(
    orders: T[] | undefined | null,
): T | undefined => orders?.find((o) => isLive(o.status));

/** An explicit history/push reference must never fall back to another order. */
export const selectTrackedOrder = <T extends { id: string; status: string }>(
    orders: T[] | undefined, orderId?: string,
): T | undefined => orderId !== undefined
    ? orders?.find(order => order.id === orderId)
    : findActiveOrder(orders) ?? orders?.[0];

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

export interface StatusMeta {
    /** Short badge label ("En cuisine"). */
    label: string;
    /** Sentence shown under the tracking headline. */
    description: string;
    /** Headline used on the tracking screen ("Préparation en cours"). */
    headline: string;
    /** Foreground colour for badges (AA on white). */
    color: string;
    /** Wash behind the badge. */
    tint: string;
    /** 0..1 — Live Activity / progress bars. */
    progress: number;
}

/**
 * Why an order was cancelled — mirrored by the SQL check constraint
 * (202609230001_order_lifecycle.sql) and the push copy in notify-order.
 * The restaurant picks one of the first four; the others are set by the system.
 */
export const CANCELLATION_REASONS = ['OUT_OF_STOCK', 'CLOSED', 'ADDRESS_NOT_SERVED', 'CUSTOMER_UNREACHABLE', 'CUSTOMER', 'NO_RESPONSE', 'ABANDONED', 'OTHER'] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];
/** Reasons a restaurant can choose, in the order they are offered. */
export const RESTAURANT_CANCELLATION_REASONS: readonly CancellationReason[] = ['OUT_OF_STOCK', 'CLOSED', 'ADDRESS_NOT_SERVED', 'CUSTOMER_UNREACHABLE', 'OTHER'];

export const CANCELLATION_COPY: Record<CancellationReason, { label: string; customer: string }> = {
    OUT_OF_STOCK: { label: 'Plat en rupture', customer: "Un plat de votre commande n'est plus disponible." },
    CLOSED: { label: 'Fermeture exceptionnelle', customer: 'Le restaurant est exceptionnellement fermé.' },
    ADDRESS_NOT_SERVED: { label: 'Adresse non desservie', customer: "Le restaurant ne livre pas à cette adresse." },
    CUSTOMER_UNREACHABLE: { label: 'Client injoignable', customer: "Le restaurant n'a pas réussi à vous joindre pour la livraison." },
    CUSTOMER: { label: 'Annulée par le client', customer: 'Vous avez annulé cette commande.' },
    NO_RESPONSE: { label: 'Sans réponse du restaurant', customer: "Le restaurant n'a pas confirmé à temps. Aucun montant ne vous sera demandé." },
    ABANDONED: { label: 'Non clôturée', customer: "Cette commande n'a pas été clôturée par le restaurant." },
    OTHER: { label: 'Autre raison', customer: "Le restaurant a dû annuler. Contactez l'assistance pour en savoir plus." },
};

export const isCancellationReason = (value: unknown): value is CancellationReason =>
    typeof value === 'string' && (CANCELLATION_REASONS as readonly string[]).includes(value);

/** Sentence for the customer, with a safe default for an unknown or missing reason. */
export const cancellationMessage = (reason: string | null | undefined): string =>
    CANCELLATION_COPY[isCancellationReason(reason) ? reason : 'OTHER'].customer;

// One accent: every live step is the brand colour; only the outcome changes hue.
export const STATUS_META: Record<OrderStatus, StatusMeta> = {
    PENDING: {
        label: 'En attente',
        headline: 'En attente du restaurant',
        description: 'Le restaurant doit confirmer votre commande.',
        color: COLORS.warning,
        tint: COLORS.warningSoft,
        progress: 0.1,
    },
    ACCEPTED: {
        label: 'Validée',
        headline: 'Commande validée',
        description: 'Le restaurant a accepté votre commande.',
        color: COLORS.accentDark,
        tint: COLORS.accentSoft,
        progress: 0.25,
    },
    PREPARING: {
        label: 'En cuisine',
        headline: 'En cuisine',
        description: 'Vos plats sont en préparation.',
        color: COLORS.accentDark,
        tint: COLORS.accentSoft,
        progress: 0.45,
    },
    READY: {
        label: 'Prête',
        headline: 'Commande prête',
        description: 'Votre commande est prête, en attente de départ.',
        color: COLORS.accentDark,
        tint: COLORS.accentSoft,
        progress: 0.65,
    },
    OUT_FOR_DELIVERY: {
        label: 'En livraison',
        headline: 'En route vers vous',
        // The restaurant handles its own deliveries — no third-party couriers.
        description: 'Le restaurant vous livre en ce moment.',
        color: COLORS.accentDark,
        tint: COLORS.accentSoft,
        progress: 0.85,
    },
    DELIVERED: {
        label: 'Livrée',
        headline: 'Livrée · Bon appétit !',
        description: 'Merci pour votre commande.',
        color: COLORS.success,
        tint: COLORS.successSoft,
        progress: 1,
    },
    CANCELLED: {
        label: 'Annulée',
        headline: 'Commande annulée',
        description: 'Cette commande a été annulée.',
        color: COLORS.danger,
        tint: COLORS.dangerSoft,
        progress: 0,
    },
};

/** Meta for any status string, falling back to PENDING for unknown values. */
export const statusMeta = (status: string): StatusMeta =>
    STATUS_META[(isOrderStatus(status) ? status : 'PENDING') as OrderStatus];

/**
 * Milliseconds of an order timestamp, or null when the column is empty.
 *
 * `orders.created_at` is nullable in the schema. Every screen used to call
 * `new Date(order.created_at)` through an `any`, which silently produced an
 * Invalid Date — a NaN age, a blank time, and no error anywhere.
 */
export const timestampMs = (iso: string | null | undefined): number | null => {
    if (!iso) return null;
    const ms = new Date(iso).getTime();
    return Number.isNaN(ms) ? null : ms;
};

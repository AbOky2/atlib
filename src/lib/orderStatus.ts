/**
 * Single source of truth for the order lifecycle.
 *
 * Replaces the duplicated (and already diverging) status labels/colours/order
 * previously copy-pasted across tracking.tsx, orders.tsx, dashboard.tsx and
 * liveActivity.ts. Domain rules (statuses, flow, legal transitions) live at the
 * top; presentation metadata (labels, colours, progress) below — both exported
 * from here so they can never drift again.
 */
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
    OUT_FOR_DELIVERY: ['DELIVERED'],
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

// Chip colours: the historical per-status palette of orders.tsx / dashboard.tsx
// / notifications.tsx, now defined once (they had already diverged on wording).
export const STATUS_META: Record<OrderStatus, StatusMeta> = {
    PENDING: {
        label: 'En attente',
        headline: 'Commande reçue',
        description: 'En attente de confirmation du restaurant…',
        color: '#f59e0b',
        tint: 'rgba(245,158,11,0.1)',
        progress: 0.1,
    },
    ACCEPTED: {
        label: 'Validée',
        headline: 'Commande validée',
        description: 'Acceptée par le restaurant.',
        color: '#6366f1',
        tint: 'rgba(99,102,241,0.1)',
        progress: 0.25,
    },
    PREPARING: {
        label: 'En préparation',
        headline: 'En cuisine',
        description: 'Vos plats sont préparés avec soin.',
        color: '#6366f1',
        tint: 'rgba(99,102,241,0.1)',
        progress: 0.45,
    },
    READY: {
        label: 'Prête',
        headline: 'Commande prête',
        description: 'Votre commande part en livraison.',
        color: '#0ea5e9',
        tint: 'rgba(14,165,233,0.1)',
        progress: 0.65,
    },
    OUT_FOR_DELIVERY: {
        label: 'En livraison',
        headline: 'En route vers vous',
        // The restaurant handles its own deliveries — no third-party couriers.
        description: 'Le restaurant vous livre en ce moment.',
        color: '#3b82f6',
        tint: 'rgba(59,130,246,0.1)',
        progress: 0.85,
    },
    DELIVERED: {
        label: 'Livrée',
        headline: 'Livrée · Bon appétit !',
        description: 'Bonne dégustation.',
        color: '#22c55e',
        tint: 'rgba(34,197,94,0.1)',
        progress: 1,
    },
    CANCELLED: {
        label: 'Annulée',
        headline: 'Commande annulée',
        description: 'Cette commande a été annulée.',
        color: '#ef4444',
        tint: 'rgba(239,68,68,0.1)',
        progress: 0,
    },
};

/** Meta for any status string, falling back to PENDING for unknown values. */
export const statusMeta = (status: string): StatusMeta =>
    STATUS_META[(isOrderStatus(status) ? status : 'PENDING') as OrderStatus];

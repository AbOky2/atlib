/**
 * What the server says when it refuses an order, translated once.
 *
 * `create_order` raises named exceptions (migration 202609050001). Each one is
 * a DEFINITIVE refusal: retrying the same payload can never succeed, so the
 * customer must be told what to change — not « réessayez ».
 */
export const ORDER_ERRORS = {
    /** Partial unique index: one live order per customer. */
    ACTIVE_ORDER_EXISTS: 'ACTIVE_ORDER_EXISTS',
    STATUS_CONFLICT: 'STATUS_CONFLICT',
    /** The RPC is not deployed. */
    SCHEMA_REQUIRED: 'SCHEMA_REQUIRED',
    INVALID_RESPONSE: 'INVALID_RESPONSE',
    /** Session missing or expired (42501 from the RPC). */
    FORBIDDEN: 'FORBIDDEN',
    /** The request took too long; the outcome is unknown and the same key may be retried. */
    TIMEOUT: 'TIMEOUT',
    RESTAURANT_CLOSED: 'RESTAURANT_CLOSED',
    ITEM_UNAVAILABLE: 'ITEM_UNAVAILABLE',
    PRICE_CHANGED: 'PRICE_CHANGED',
    INVALID_CHECKOUT: 'INVALID_CHECKOUT',
    INVALID_ZONE: 'INVALID_ZONE',
    INVALID_ITEMS: 'INVALID_ITEMS',
    INSUFFICIENT_CASH: 'INSUFFICIENT_CASH',
} as const;

export type OrderError = (typeof ORDER_ERRORS)[keyof typeof ORDER_ERRORS];

const SERVER_REFUSALS: ReadonlySet<string> = new Set([
    ORDER_ERRORS.RESTAURANT_CLOSED, ORDER_ERRORS.ITEM_UNAVAILABLE, ORDER_ERRORS.PRICE_CHANGED,
    ORDER_ERRORS.INVALID_CHECKOUT, ORDER_ERRORS.INVALID_ZONE, ORDER_ERRORS.INVALID_ITEMS,
    ORDER_ERRORS.INSUFFICIENT_CASH,
]);

/** Maps a PostgREST error to a domain error, or null when it is not one we know. */
export function mapServerOrderError(error: { code?: string | null; message?: string | null }): OrderError | null {
    const message = (error.message ?? '').trim();
    if (SERVER_REFUSALS.has(message)) return message as OrderError;
    if (error.code === '42501' || message === 'forbidden') return ORDER_ERRORS.FORBIDDEN;
    return null;
}

/** Refusals whose cause lives in the menu: the catalogue cache must be refreshed. */
export const isMenuRefusal = (error: string): boolean =>
    error === ORDER_ERRORS.RESTAURANT_CLOSED || error === ORDER_ERRORS.ITEM_UNAVAILABLE || error === ORDER_ERRORS.PRICE_CHANGED;

/** Copy shown to the customer. Every definitive refusal says what to do next. */
export function orderErrorMessage(error: string): string {
    switch (error) {
        case ORDER_ERRORS.ACTIVE_ORDER_EXISTS:
            return "Vous avez déjà une commande en cours. Vous pourrez en passer une nouvelle dès qu'elle sera livrée.";
        case ORDER_ERRORS.RESTAURANT_CLOSED:
            return 'Ce restaurant ne prend plus de commandes pour le moment.';
        case ORDER_ERRORS.ITEM_UNAVAILABLE:
            return "Un plat de votre panier n'est plus disponible. Nous l'avons retiré, vérifiez votre panier.";
        case ORDER_ERRORS.PRICE_CHANGED:
            return 'Le menu a changé. Vos prix ont été mis à jour, vérifiez votre panier.';
        case ORDER_ERRORS.INVALID_ZONE:
            return 'Ce quartier n’est pas encore desservi. Choisissez une autre adresse.';
        case ORDER_ERRORS.INVALID_CHECKOUT:
            return 'Vérifiez votre nom, votre numéro et votre adresse de livraison.';
        case ORDER_ERRORS.INVALID_ITEMS:
            return 'Votre panier contient une ligne invalide. Retirez-la puis réessayez.';
        case ORDER_ERRORS.INSUFFICIENT_CASH:
            return 'Le billet choisi est inférieur au total de la commande.';
        case ORDER_ERRORS.FORBIDDEN:
            return 'Votre session a expiré. Reconnectez-vous pour commander.';
        case ORDER_ERRORS.SCHEMA_REQUIRED:
            return 'Les commandes sont momentanément indisponibles. Réessayez plus tard.';
        case ORDER_ERRORS.TIMEOUT:
            return 'Le restaurant met du temps à répondre. Vérifiez Mes commandes, ou réessayez : la même commande sera reprise, jamais doublée.';
        default:
            return 'Confirmation non reçue. Vérifiez Mes commandes ou réessayez : la même commande sera reprise, jamais doublée.';
    }
}

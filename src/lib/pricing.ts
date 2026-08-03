/**
 * Single source of truth for fees + price formatting.
 *
 * ⚠️ SECURITY NOTE: today the client computes the order total and sends it to the
 * DB (total_xaf / delivery_fee_xaf in createOrder). A tampered client could send
 * total_xaf = 0. For production these fees + total MUST be recomputed and enforced
 * server-side (in a create_order RPC), ignoring client-sent amounts. Keeping them
 * here at least stops the two copies (cart + payment) from diverging.
 */
export const DELIVERY_FEE_XAF = 1500;
export const SERVICE_FEE_XAF = 500;

/** Total the customer pays: subtotal + fees (0 when the cart is empty). */
export const computeOrderTotal = (subtotal: number) =>
    subtotal > 0 ? subtotal + DELIVERY_FEE_XAF + SERVICE_FEE_XAF : 0;

/** Consistent XAF formatting used across the app. */
export const formatXaf = (price: number) => new Intl.NumberFormat('fr-FR').format(price ?? 0) + ' F';

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

/**
 * Consistent XAF formatting used across the app: « 3 500 F ».
 *
 * `fr-FR` groups thousands with a NARROW no-break space (U+202F). Manrope has no
 * glyph for it, so the price read « 3500 F » in every title while Inter showed
 * « 3 500 F » in the body — the same amount, two spellings. A regular no-break
 * space exists in both faces.
 */
export const formatXaf = (price: number | null | undefined) =>
    new Intl.NumberFormat('fr-FR').format(price ?? 0).replace(/[\u202f\u00a0 ]/g, '\u00a0') + '\u00a0F';

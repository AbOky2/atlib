/**
 * Single source of truth for the consumer-facing brand name.
 *
 * The UI previously mixed three names (CHAD / NOIR / ATELIER). Everything
 * user-visible now flows from here — flip these two constants to rebrand the
 * whole app. (Technical identifiers — bundleIdentifier, slug, EAS project —
 * intentionally stay `chad-delivery` and are NOT driven by this.)
 */
export const BRAND = 'NOIR';
export const BRAND_TAGLINE = 'Delivery';
export const BRAND_FULL = `${BRAND} ${BRAND_TAGLINE}`; // "NOIR Delivery"
export const BRAND_CITY = "N'Djamena";

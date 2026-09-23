/**
 * Single source of truth for the consumer-facing brand name.
 *
 * « Naakul » — « manger » en arabe tchadien. Everything user-visible flows from
 * here; flip these constants to rebrand the whole app. Technical identifiers
 * (bundleIdentifier, slug, scheme `chaddelivery`, EAS project, MMKV store id,
 * notification identifiers, widget target) intentionally stay as they are:
 * changing them would cost provisioning, Auth redirect config and every user's
 * local data, for a name nobody sees.
 */
export const BRAND = 'Naakul';
/** Shown under the wordmark; French, because the whole app is. */
export const BRAND_TAGLINE = 'Livraison';
/** The name as it reads inside a sentence. */
export const BRAND_FULL = BRAND;
export const BRAND_CITY = "N'Djamena";

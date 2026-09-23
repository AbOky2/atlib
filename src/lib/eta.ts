/**
 * Delivery-time labels.
 *
 * The only estimate the app shows is the one it can stand behind: the locality
 * table (src/lib/localities.ts), frozen into `orders.eta_minutes` at checkout.
 * A per-restaurant "25–35 min" used to be derived from the restaurant id — a
 * number that looked like data and was not. It no longer exists.
 */

/**
 * Wall-clock arrival label ("19h45") for an order placed at `createdAtIso`.
 *
 * Deliberately NOT a countdown. A Live Activity is read from a LOCKED screen —
 * precisely when the app is not running — so a "12 min" string would freeze at
 * whatever value it held when the app was last foregrounded and quietly lie for
 * the rest of the delivery. A target time is computed once, needs no refresh,
 * and stays true whether the app runs or not.
 *
 * Returns null for an unusable timestamp so callers can degrade to "Bientôt".
 */
export function arrivalTimeLabel(
    createdAtIso: string | null | undefined,
    etaMinutes: number,
): string | null {
    if (!createdAtIso) return null;
    const placedAt = new Date(createdAtIso).getTime();
    if (Number.isNaN(placedAt) || !Number.isFinite(etaMinutes) || etaMinutes < 0) return null;
    // Delivery takes place in N'Djamena (UTC+1), matching the APNs worker,
    // independently of the device's timezone.
    const arrival = new Date(placedAt + etaMinutes * 60_000 + 3_600_000);
    // French convention: bare hour, zero-padded minutes ("9h05", "19h45").
    return `${arrival.getUTCHours()}h${String(arrival.getUTCMinutes()).padStart(2, '0')}`;
}

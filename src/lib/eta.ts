/**
 * Delivery-time estimates.
 *
 * The DB has no per-restaurant prep-time yet, so the range shown on cards is a
 * deterministic heuristic seeded by the restaurant id: stable for a given
 * restaurant across sessions (no flicker, no fake randomness), spread between
 * 15 and 45 minutes like a real marketplace. Replace with a DB column when
 * operations start measuring actual prep times.
 */

const hashString = (value: string): number => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

export interface EtaRange {
    min: number;
    max: number;
}

export function restaurantEtaRange(restaurantId: string): EtaRange {
    const base = 15 + (hashString(restaurantId) % 21); // 15..35
    return { min: base, max: base + 10 };
}

export const formatEtaRange = ({ min, max }: EtaRange): string => `${min}–${max} min`;

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
    if (Number.isNaN(placedAt)) return null;
    const arrival = new Date(placedAt + etaMinutes * 60_000);
    // French convention: bare hour, zero-padded minutes ("9h05", "19h45").
    return `${arrival.getHours()}h${String(arrival.getMinutes()).padStart(2, '0')}`;
}

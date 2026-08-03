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

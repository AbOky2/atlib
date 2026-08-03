/**
 * Write reconciliation for the orders cache.
 *
 * Realtime pushes, the 30s polling fallback and optimistic updates all write
 * the same react-query cache. Every merge goes through here, guarded by
 * `updated_at`: an older row (e.g. a poll response that was already in flight
 * when a Realtime push landed) can never overwrite a newer status.
 */

/** Merge a fresh order row into a cached list, never going backwards in time. */
export function reconcileOrderRow<T extends { id: string; updated_at?: string | null }>(
    cached: T[] | undefined,
    fresh: Partial<T> & { id: string; updated_at?: string | null },
): T[] | undefined {
    if (!Array.isArray(cached)) return cached;
    return cached.map((row) => {
        if (row.id !== fresh.id) return row;
        const cachedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
        // A row without timestamp is treated as authoritative (fresh from the wire).
        const freshAt = fresh.updated_at ? new Date(fresh.updated_at).getTime() : Number.MAX_SAFE_INTEGER;
        if (freshAt < cachedAt) return row; // stale write → keep what we have
        return { ...row, ...fresh };
    });
}

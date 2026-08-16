/**
 * What the backend says when it refuses, in one place.
 *
 * These codes were previously spelled out inline in three modules, each with its
 * own comment explaining the same thing. They describe the transport, not the
 * domain, so they belong together and nowhere else.
 */

/** PostgREST cannot find the function — the RPC hasn't been deployed yet. */
export const RPC_MISSING_CODES = new Set(['PGRST202', '42883']);

/** Postgres unique violation — a partial unique index fired. */
export const UNIQUE_VIOLATION = '23505';

/**
 * Undefined column (42703) or a stale PostgREST schema cache (PGRST204): the
 * database predates a newer optional field. Callers retry without it rather
 * than fail the whole write.
 */
export const MISSING_COLUMN_CODES = new Set(['42703', 'PGRST204']);

/** "No rows found" from `.single()` — usually an expected outcome, not a fault. */
export const NO_ROWS = 'PGRST116';

export const isMissingColumn = (code: string | undefined | null) =>
    MISSING_COLUMN_CODES.has(code ?? '');

export const isRpcMissing = (code: string | undefined | null) =>
    RPC_MISSING_CODES.has(code ?? '');

import { supabase } from '../lib/supabase';
import { isRpcMissing } from './postgrest';

/**
 * Account lifecycle beyond sign-in: today, deletion.
 *
 * Apple (5.1.1(v)) and Google both require an in-app path to delete an account
 * that the app let the person create. The server does the erasing — the client
 * only asks whether it is possible right now, then asks for it.
 */

/** Error codes surfaced to the UI — string-compared, so keep them stable. */
export const ACCOUNT_ERRORS = {
    /** A live order exists: deleting now would strand the restaurant. */
    ACTIVE_ORDER: 'ACTIVE_ORDER',
    /** Restaurant or admin accounts are managed by the operator, not self-served. */
    STAFF_ACCOUNT: 'STAFF_ACCOUNT',
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    DELETE_FAILED: 'DELETE_FAILED',
    /** The migration / Edge Function is not deployed yet. */
    SCHEMA_REQUIRED: 'SCHEMA_REQUIRED',
} as const;

export type AccountError = (typeof ACCOUNT_ERRORS)[keyof typeof ACCOUNT_ERRORS];

/** Why deletion is refused right now — null when it can proceed. */
export async function getAccountDeletionBlocker(): Promise<AccountError | null> {
    const { data, error } = await supabase.rpc('account_deletion_blocker');
    if (error) {
        if (isRpcMissing(error.code)) throw new Error(ACCOUNT_ERRORS.SCHEMA_REQUIRED);
        throw error;
    }
    return (data as AccountError | null) ?? null;
}

/**
 * Ask the server to delete the signed-in account. Resolves when the identity is
 * gone; rejects with one of ACCOUNT_ERRORS otherwise.
 */
export async function deleteMyAccount(): Promise<void> {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (!error) return;

    // FunctionsHttpError carries the Response: the body names the blocker.
    const response: Response | undefined = (error as { context?: Response }).context;
    if (response) {
        if (response.status === 404) throw new Error(ACCOUNT_ERRORS.SCHEMA_REQUIRED);
        const body = await response.json().catch(() => null) as { error?: string } | null;
        const code = body?.error;
        if (code && (Object.values(ACCOUNT_ERRORS) as string[]).includes(code)) throw new Error(code);
    }
    throw new Error(ACCOUNT_ERRORS.DELETE_FAILED);
}

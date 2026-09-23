import { supabase } from '../lib/supabase';
import type { RecoveryCredentials } from '../lib/passwordRecovery';

/** Exchanges the PKCE code; fails on any device other than the one that asked. */
export function beginPasswordRecovery(credentials: RecoveryCredentials) {
    return supabase.auth.exchangeCodeForSession(credentials.code);
}
export function saveRecoveredPassword(password: string) {
    return supabase.auth.updateUser({ password });
}

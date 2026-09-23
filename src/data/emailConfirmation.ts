import { supabase } from '../lib/supabase';
import type { EmailConfirmationCredentials } from '../lib/emailConfirmation';

/** Exchanges the PKCE code; fails on any device other than the one that signed up. */
export function confirmEmail(credentials: EmailConfirmationCredentials) {
    return supabase.auth.exchangeCodeForSession(credentials.code);
}

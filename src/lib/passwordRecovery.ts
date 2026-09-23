import { parseAuthCodeLink, type AuthCodeCredentials } from './authLinks';

/** The recovery route accepts only a PKCE code from Supabase, never a session. */
export type RecoveryCredentials = AuthCodeCredentials;

export const parseRecoveryLink = (raw: string): RecoveryCredentials | null =>
    parseAuthCodeLink(raw, 'reset-password');

export function passwordValidation(password: string, confirmation: string): string | null {
    if (password.length < 8) return 'Choisissez un mot de passe de 8 caractères minimum.';
    if (password !== confirmation) return 'Les deux mots de passe ne correspondent pas.';
    return null;
}

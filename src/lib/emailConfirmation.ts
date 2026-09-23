import { parseAuthCodeLink, type AuthCodeCredentials } from './authLinks';

export type EmailConfirmationCredentials = AuthCodeCredentials;

/** Only the native signup callback, carrying a PKCE code, may confirm an address. */
export const parseEmailConfirmationLink = (raw: string): EmailConfirmationCredentials | null =>
    parseAuthCodeLink(raw, 'confirm-email');

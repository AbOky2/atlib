/**
 * Native auth callbacks — PKCE only.
 *
 * Supabase finishes a signup confirmation or a password recovery by redirecting
 * to `chaddelivery://<route>?code=…`. That code can only be exchanged by the
 * device that started the flow (it holds the code verifier), so a link forged
 * by an attacker — one carrying THEIR tokens — can no longer sign a victim into
 * the attacker's account. That was possible with the previous implicit links,
 * which put a ready-to-use session in the URL fragment.
 */
export type AuthRoute = 'confirm-email' | 'reset-password';

export interface AuthCodeCredentials {
    kind: 'code';
    code: string;
}

export function parseAuthCodeLink(raw: string, route: AuthRoute): AuthCodeCredentials | null {
    try {
        const url = new URL(raw);
        if (url.protocol !== 'chaddelivery:') return null;
        if (`${url.host}${url.pathname}`.replace(/^\/+|\/+$/g, '') !== route) return null;
        const query = new URLSearchParams(url.search);
        const fragment = new URLSearchParams(url.hash ? url.hash.slice(1) : '');
        if (query.has('error') || fragment.has('error')) return null;
        const code = query.get('code') ?? fragment.get('code');
        // Anything else in the link — a session, a token hash — is not ours to trust.
        if (!code || !/^[A-Za-z0-9._~-]{8,}$/.test(code)) return null;
        return { kind: 'code', code };
    } catch {
        return null;
    }
}

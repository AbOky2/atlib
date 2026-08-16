import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { normalizeChadPhone } from '../lib/phone';

/** Outcome of an auth action — lets the UI react without re-reading the store. */
export type AuthResult = 'ok' | 'confirm-email' | 'code-sent' | 'error';

interface AuthStore {
    session: Session | null;
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    initialize: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<AuthResult>;
    signUp: (email: string, password: string, fullName?: string) => Promise<AuthResult>;
    /** Send a one-time code by SMS. */
    requestPhoneCode: (phone: string) => Promise<AuthResult>;
    /** Exchange the code for a session. */
    verifyPhoneCode: (phone: string, code: string, fullName?: string) => Promise<AuthResult>;
    /** Send a password-reset email. */
    requestPasswordReset: (email: string) => Promise<AuthResult>;
    /** Remember a verified phone number on the account for future checkouts. */
    rememberPhone: (phone: string) => void;
    signOut: () => Promise<void>;
    clearError: () => void;
}

const friendlyAuthError = (message: string): string => {
    if (message === 'Invalid login credentials') return 'Email ou mot de passe incorrect.';
    if (message === 'User already registered') return 'Un compte existe déjà avec cet email.';
    if (message.includes('Email not confirmed')) return 'Confirmez votre email avant de vous connecter (vérifiez votre boîte mail).';
    if (message === 'Network request failed') return 'Connexion impossible. Vérifiez votre connexion internet.';
    // Phone auth is only live once an SMS provider is configured in Supabase.
    if (/phone.*(provider|not enabled|disabled)/i.test(message) || /sms/i.test(message)) {
        return "La connexion par SMS n'est pas encore activée. Utilisez votre email pour le moment.";
    }
    if (/token has expired|invalid token|otp/i.test(message)) return 'Code incorrect ou expiré. Demandez-en un nouveau.';
    return message;
};

export const useAuthStore = create<AuthStore>((set) => ({
    session: null,
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            set({
                session,
                user: session?.user ?? null,
                isAuthenticated: !!session,
            });

            supabase.auth.onAuthStateChange((_event, session) => {
                set({
                    session,
                    user: session?.user ?? null,
                    isAuthenticated: !!session,
                });
            });
        } catch (err: any) {
            console.error('[AuthStore] initialize error:', err);
            set({ error: friendlyAuthError(err?.message ?? '') });
        }
    },

    signIn: async (email, password) => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                set({ loading: false, error: friendlyAuthError(error.message) });
                return 'error';
            }
            // Set the session directly from the response — onAuthStateChange also
            // fires, but asynchronously, and callers check state right after await.
            set({
                session: data.session,
                user: data.user,
                isAuthenticated: !!data.session,
                loading: false,
                error: null,
            });
            return 'ok';
        } catch {
            set({ loading: false, error: 'Erreur de connexion. Vérifiez votre connexion internet.' });
            return 'error';
        }
    },

    signUp: async (email, password, fullName) => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: fullName ? { data: { full_name: fullName } } : undefined,
            });
            if (error) {
                set({ loading: false, error: friendlyAuthError(error.message) });
                return 'error';
            }
            if (data.session) {
                set({
                    session: data.session,
                    user: data.user,
                    isAuthenticated: true,
                    loading: false,
                    error: null,
                });
                return 'ok';
            }
            // Supabase created the account but requires email confirmation.
            set({ loading: false, error: null });
            return 'confirm-email';
        } catch {
            set({ loading: false, error: "Erreur d'inscription. Vérifiez votre connexion internet." });
            return 'error';
        }
    },

    requestPhoneCode: async (phone) => {
        const e164 = normalizeChadPhone(phone);
        if (!e164) {
            set({ error: 'Numéro invalide. Format attendu : 66 12 34 56.' });
            return 'error';
        }
        set({ loading: true, error: null });
        try {
            // `shouldCreateUser` on by default: first sign-in doubles as sign-up,
            // which is the right model when the phone IS the identity.
            const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
            if (error) {
                set({ loading: false, error: friendlyAuthError(error.message) });
                return 'error';
            }
            set({ loading: false });
            return 'code-sent';
        } catch {
            set({ loading: false, error: 'Envoi du code impossible. Vérifiez votre connexion internet.' });
            return 'error';
        }
    },

    verifyPhoneCode: async (phone, code, fullName) => {
        const e164 = normalizeChadPhone(phone);
        if (!e164) {
            set({ error: 'Numéro invalide.' });
            return 'error';
        }
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone: e164,
                token: code.trim(),
                type: 'sms',
            });
            if (error || !data.session) {
                set({ loading: false, error: friendlyAuthError(error?.message ?? 'Code incorrect.') });
                return 'error';
            }
            // Carry the name over on first sign-in, and keep the verified number
            // on the profile so checkout can prefill it.
            const metadata: Record<string, string> = { phone: e164 };
            if (fullName?.trim() && !data.user?.user_metadata?.full_name) {
                metadata.full_name = fullName.trim();
            }
            supabase.auth.updateUser({ data: metadata }).catch(() => {});

            set({
                session: data.session,
                user: data.user,
                isAuthenticated: true,
                loading: false,
                error: null,
            });
            return 'ok';
        } catch {
            set({ loading: false, error: 'Vérification impossible. Réessayez.' });
            return 'error';
        }
    },

    requestPasswordReset: async (email) => {
        set({ error: null });
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
            if (error) {
                set({ error: friendlyAuthError(error.message) });
                return 'error';
            }
            return 'ok';
        } catch {
            set({ error: "Impossible d'envoyer l'email de réinitialisation. Réessayez dans un instant." });
            return 'error';
        }
    },

    // Best effort by design: failing to remember a number must never interrupt a
    // checkout, so this returns nothing and swallows its own failure.
    rememberPhone: (phone) => {
        supabase.auth.updateUser({ data: { phone } }).catch(() => {});
    },

    signOut: async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('[AuthStore] signOut error:', err);
        }
        set({ session: null, user: null, isAuthenticated: false, loading: false, error: null });
    },

    clearError: () => set({ error: null }),
}));

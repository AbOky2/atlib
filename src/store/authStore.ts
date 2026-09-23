import { create } from 'zustand';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { endDeliveryActivity } from '../lib/liveActivity';
import { clearOrderProgress } from '../lib/notifications';
import { queryClient } from '../lib/queryClient';
import { zustandStorage } from '../lib/storage';
import { useCartStore } from './cartStore';
import { useAddressStore } from './addressStore';
import { useFavoritesStore } from './favoritesStore';
import { useNotificationStore } from './notificationStore';
import { isValidSmsCode, SMS_RESEND_DELAY_MS, verifiedAccountPhone } from '../lib/phoneAuth';
import { PHONE_SIGN_IN_ENABLED } from '../lib/authFeatures';
import { normalizeChadPhone } from '../lib/phone';
import { ACCOUNT_ERRORS, deleteMyAccount, getAccountDeletionBlocker, type AccountError } from '../data/account';

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
    phoneCodeResendAt: number;
    requestPhoneCode: (phone: string) => Promise<AuthResult>;
    /** Exchange the code for a session. */
    verifyPhoneCode: (phone: string, code: string, fullName?: string) => Promise<AuthResult>;
    /** Send a password-reset email. */
    requestPasswordReset: (email: string) => Promise<AuthResult>;
    /** Remember an editable delivery contact; this never changes Auth identity. */
    rememberPhone: (phone: string) => void;
    signOut: () => Promise<void>;
    /**
     * Delete the account for good (App Store 5.1.1(v), Play). Resolves 'ok' once
     * the identity is gone and the device is signed out, or the reason it was
     * refused so the screen can explain (a live order, a staff account).
     */
    deleteAccount: () => Promise<'ok' | AccountError>;
    clearError: () => void;
}

let phoneOperationInFlight = false;

const friendlyAuthError = (message: string): string => {
    if (message === 'Invalid login credentials') return 'Email ou mot de passe incorrect.';
    if (message === 'User already registered') return 'Un compte existe déjà avec cet email.';
    if (message.includes('Email not confirmed')) return 'Confirmez votre email avant de vous connecter (vérifiez votre boîte mail).';
    if (message === 'Network request failed') return 'Connexion impossible. Vérifiez votre connexion internet.';
    if (/rate.limit|too many|security purposes|after.*seconds/i.test(message)) return 'Patientez avant de demander un nouveau code, puis réessayez.';
    // Phone auth is only live once an SMS provider is configured in Supabase.
    if (/phone.*(provider|not enabled|disabled)/i.test(message)) {
        return "La connexion par SMS n'est pas encore activée. Utilisez votre email pour le moment.";
    }
    if (/token has expired|invalid token|otp/i.test(message)) return 'Code incorrect ou expiré. Demandez-en un nouveau.';
    return message;
};

export const useAuthStore = create<AuthStore>((write) => {
    let initialization: Promise<void> | null = null;
    let listening = false;
    let sessionRevision = 0;
    // Persisted owner is checked before exposing any new session to screens.
    // Local data is wiped when the device changes hands (sign-out, or one
    // account replaced by another) — never when a guest signs in: the basket a
    // visitor built is exactly what they came to order.
    const set: typeof write = (patch: any) => {
        if ('user' in patch) {
            const next = patch.user?.id ?? '';
            const previous = zustandStorage.getItem('private-data-owner') ?? '';
            if (previous !== next) {
                if (previous !== '') {
                    endDeliveryActivity();
                    void clearOrderProgress();
                    queryClient.clear();
                    useCartStore.setState({ items: [], currentRestaurantId: null, currentRestaurantName: null, deliveryAddress: null, checkoutAttempt: null, cashPaidWith: null, dialogConfig: null });
                    useAddressStore.setState({ savedAddresses: [], selectedAddressId: null, currentAddress: null });
                    useFavoritesStore.setState({ favoriteIds: [] });
                    useNotificationStore.setState({ readIds: [], lastSeenAt: null });
                }
                zustandStorage.setItem('private-data-owner', next);
            }
        }
        write(patch);
    };
    return ({
    session: null,
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    phoneCodeResendAt: 0,

    initialize: () => {
        if (initialization) return initialization;
        initialization = (async () => {
            try {
                // Subscribe first so restoration cannot miss a login/logout.
                if (!listening) {
                    supabase.auth.onAuthStateChange((_event, session) => {
                        sessionRevision++;
                        set({ session, user: session?.user ?? null, isAuthenticated: !!session });
                    });
                    listening = true;
                }
                const revision = sessionRevision;
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                // A newer auth event wins over an older getSession response.
                if (revision === sessionRevision) {
                    set({ session, user: session?.user ?? null, isAuthenticated: !!session });
                }
            } catch (err: any) {
                initialization = null;
                set({ error: friendlyAuthError(err?.message ?? '') });
            }
        })();
        return initialization;
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
                options: {
                    emailRedirectTo: Linking.createURL('confirm-email', { scheme: 'chaddelivery' }),
                    ...(fullName ? { data: { full_name: fullName } } : {}),
                },
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
        if (!PHONE_SIGN_IN_ENABLED) {
            set({ error: 'Utilisez votre email et votre mot de passe pour vous connecter.' });
            return 'error';
        }
        if (phoneOperationInFlight) return 'error';
        if (Date.now() < useAuthStore.getState().phoneCodeResendAt) {
            set({ error: 'Patientez avant de demander un nouveau code.' });
            return 'error';
        }
        const e164 = normalizeChadPhone(phone);
        if (!e164) {
            set({ error: 'Numéro invalide. Format attendu : 66 12 34 56.' });
            return 'error';
        }
        phoneOperationInFlight = true;
        set({ loading: true, error: null });
        try {
            const { error } = await supabase.auth.signInWithOtp({ phone: e164, options: { shouldCreateUser: true, channel: 'sms' } });
            if (error) {
                set({ loading: false, error: friendlyAuthError(error.message) });
                return 'error';
            }
            set({ loading: false, phoneCodeResendAt: Date.now() + SMS_RESEND_DELAY_MS });
            return 'code-sent';
        } catch {
            set({ loading: false, error: 'Envoi du code impossible. Vérifiez votre connexion internet.' });
            return 'error';
        } finally { phoneOperationInFlight = false; }
    },

    verifyPhoneCode: async (phone, code, fullName) => {
        if (!PHONE_SIGN_IN_ENABLED) {
            set({ error: 'Utilisez votre email et votre mot de passe pour vous connecter.' });
            return 'error';
        }
        if (phoneOperationInFlight) return 'error';
        if (!isValidSmsCode(code)) {
            set({ error: 'Saisissez les 6 chiffres reçus par SMS.' });
            return 'error';
        }
        const e164 = normalizeChadPhone(phone);
        if (!e164) {
            set({ error: 'Numéro invalide.' });
            return 'error';
        }
        phoneOperationInFlight = true;
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone: e164,
                token: code.trim(),
                type: 'sms',
            });
            if (error || !data.session || verifiedAccountPhone(data.user) !== e164) {
                set({ loading: false, error: friendlyAuthError(error?.message ?? 'Code incorrect.') });
                return 'error';
            }
            // Carry the name over on first sign-in, and keep the verified number
            // on the profile so checkout can prefill it.
            const metadata: Record<string, string> = {};
            if (fullName?.trim() && !data.user?.user_metadata?.full_name) {
                metadata.full_name = fullName.trim();
            }
            if (metadata.full_name) void supabase.auth.updateUser({ data: metadata }).catch(() => {});

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
        } finally { phoneOperationInFlight = false; }
    },

    requestPasswordReset: async (email) => {
        set({ error: null });
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('reset-password', { scheme: 'chaddelivery' }) });
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
        supabase.auth.updateUser({ data: { delivery_phone: phone } }).catch(() => {});
    },

    signOut: async () => {
        try {
            const token = await zustandStorage.getItem('registered-push-token');
            if (token) {
                const { error } = await supabase.from('push_tokens').delete().eq('token', token);
                if (error) throw error;
                await zustandStorage.removeItem('registered-push-token');
            }
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (err) {
            set({ error: 'Déconnexion impossible. Vérifiez votre connexion puis réessayez.' });
            return;
        }
        set({ session: null, user: null, isAuthenticated: false, loading: false, error: null });
    },

    deleteAccount: async () => {
        set({ loading: true, error: null });
        try {
            const blocker = await getAccountDeletionBlocker();
            if (blocker) {
                set({ loading: false });
                return blocker;
            }
            await deleteMyAccount();
        } catch (err: any) {
            const code = (Object.values(ACCOUNT_ERRORS) as string[]).includes(err?.message) ? (err.message as AccountError) : ACCOUNT_ERRORS.DELETE_FAILED;
            set({ loading: false, error: code === ACCOUNT_ERRORS.DELETE_FAILED ? 'Suppression impossible pour le moment. Vérifiez votre connexion puis réessayez.' : null });
            return code;
        }
        // The server already removed the identity and its push tokens: only the
        // local session remains, and a global sign-out would fail for a user who
        // no longer exists.
        zustandStorage.removeItem('registered-push-token');
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        set({ session: null, user: null, isAuthenticated: false, loading: false, error: null });
        return 'ok';
    },

    clearError: () => set({ error: null }),
});
});

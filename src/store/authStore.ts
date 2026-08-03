import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthStore {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    initialize: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, fullName?: string) => Promise<void>;
    signOut: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
    session: null,
    user: null,
    isLoading: true,
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
                isLoading: false,
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
            const errorMessage = err.message === 'Network request failed' 
                ? 'Impossible de contacter le serveur. Vérifiez votre URL Supabase et votre connexion internet.' 
                : err.message;
            set({ isLoading: false, error: errorMessage });
        }
    },

    signIn: async (email: string, password: string) => {
        set({ loading: true, error: null });
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                const msg = error.message === 'Invalid login credentials'
                    ? 'Email ou mot de passe incorrect.'
                    : error.message;
                set({ loading: false, error: msg });
            } else {
                set({ loading: false, error: null });
            }
        } catch (err: any) {
            set({ loading: false, error: 'Erreur de connexion. Vérifiez votre connexion internet.' });
        }
    },

    signUp: async (email: string, password: string, fullName?: string) => {
        set({ loading: true, error: null });
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: fullName ? { data: { full_name: fullName } } : undefined,
            });
            if (error) {
                set({ loading: false, error: error.message });
            } else {
                set({ loading: false, error: null });
            }
        } catch (err: any) {
            set({ loading: false, error: 'Erreur d\'inscription. Vérifiez votre connexion internet.' });
        }
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

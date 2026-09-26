import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

/**
 * Sign in with the account the phone already has — Google on Android, Apple
 * on iPhone — and exchange the identity token for a Supabase session.
 *
 * Why this and not SMS: it costs nothing, needs no password, and in N'Djamena
 * nearly every phone is an Android already signed into Google. The number the
 * restaurant calls is captured at checkout, where it matters.
 *
 * Both flows are NATIVE (the system sheet, not a web view): Apple requires it,
 * Google recommends it, and neither leaves the app. Supabase verifies the
 * token's signature and audience server-side; the client only relays it.
 */

/** Web client ID from Google Cloud — the audience Supabase checks. Required. */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
/** iOS client ID from Google Cloud; its reversed form is the app's URL scheme. */
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

/** Buttons appear only once the console work is done — never a dead control. */
export const GOOGLE_SIGN_IN_ENABLED = GOOGLE_WEB_CLIENT_ID.length > 0 && (Platform.OS !== 'ios' || GOOGLE_IOS_CLIENT_ID.length > 0);
export const APPLE_SIGN_IN_ENABLED = Platform.OS === 'ios';

export type SocialProvider = 'google' | 'apple';

export type SocialOutcome =
    | { status: 'ok'; session: Session; fullName?: string }
    | { status: 'cancelled' }
    | { status: 'unavailable' }
    | { status: 'error'; message: string };

let googleConfigured = false;

export async function signInWithGoogle(): Promise<SocialOutcome> {
    if (!GOOGLE_SIGN_IN_ENABLED) return { status: 'unavailable' };
    if (!googleConfigured) {
        GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID || undefined });
        googleConfigured = true;
    }
    try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) return { status: 'cancelled' };
        const idToken = response.data.idToken;
        if (!idToken) return { status: 'error', message: 'Google n’a pas fourni de jeton d’identité.' };
        const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
        if (error || !data.session) return { status: 'error', message: error?.message ?? 'Session absente.' };
        return { status: 'ok', session: data.session, fullName: response.data.user.name ?? undefined };
    } catch (err) {
        if (isErrorWithCode(err)) {
            if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) return { status: 'cancelled' };
            if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { status: 'unavailable' };
        }
        // A failure inside Google's own sheet is not a sentence a customer should read.
        return { status: 'error', message: GOOGLE_FAILED };
    }
}

/** Native failures, in the customer's words; Supabase's own messages are mapped by the store. */
const GOOGLE_FAILED = 'La connexion Google n’a pas abouti. Réessayez, ou utilisez votre email.';
const APPLE_FAILED = 'La connexion Apple n’a pas abouti. Réessayez, ou utilisez votre email.';

export async function signInWithApple(): Promise<SocialOutcome> {
    if (!APPLE_SIGN_IN_ENABLED) return { status: 'unavailable' };
    if (!(await AppleAuthentication.isAvailableAsync().catch(() => false))) return { status: 'unavailable' };
    // Apple signs the SHA-256 of our nonce into the token; Supabase recomputes it
    // from the raw value, so a token replayed from elsewhere is refused.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    try {
        const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
            nonce: hashedNonce,
        });
        if (!credential.identityToken) return { status: 'error', message: 'Apple n’a pas fourni de jeton d’identité.' };
        const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce });
        if (error || !data.session) return { status: 'error', message: error?.message ?? 'Session absente.' };
        // Apple reveals the name once, at the very first sign-in, then never again.
        const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ') || undefined;
        return { status: 'ok', session: data.session, fullName };
    } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') return { status: 'cancelled' };
        return { status: 'error', message: APPLE_FAILED };
    }
}

export const signInWithProvider = (provider: SocialProvider) =>
    provider === 'google' ? signInWithGoogle() : signInWithApple();

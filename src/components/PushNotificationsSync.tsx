import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { useAuthStore } from '../store/authStore';
import { registerOrderBackgroundTask } from '../lib/backgroundNotifications';
import { queryClient } from '../lib/queryClient';
import { zustandStorage } from '../lib/storage';
import { supabase } from '../lib/supabase';
import {
    setupNotifications,
    registerForPushToken,
    onNotificationTap,
    onOrderNotificationReceived,
    type OrderNotificationData } from '../lib/notifications';

/**
 * Single owner of push registration and notification routing.
 *
 * Mounted once at the root so it covers BOTH audiences: a customer following an
 * order and a restaurant waiting for one. The token is stored per device in
 * `push_tokens` (see supabase_notifications.sql); if that table isn't deployed
 * yet the insert fails quietly and the app carries on — same graceful-degradation
 * contract as the create_order RPC.
 *
 * Tapping a notification always lands on the order it is about, never on a
 * generic screen: the payload carries `orderId`.
 */
const RETRY_DELAY_MS = 45_000;

export default function PushNotificationsSync() {
    const user = useAuthStore((s) => s.user);
    const registeredFor = useRef<string | null>(null);
    // Bumped to retry a registration that failed (offline at launch, table not
    // yet deployed…): a customer who never got their token stored would never
    // hear about their order.
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        setupNotifications();
    }, []);

    // Retry when the app comes back to the foreground, until registered.
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && user?.id && registeredFor.current !== user.id) setRetry((n) => n + 1);
        });
        return () => sub.remove();
    }, [user?.id]);

    // Register (or re-register) the device token whenever the signed-in user changes.
    useEffect(() => {
        if (!user?.id) {
            registeredFor.current = null;
            return;
        }
        if (registeredFor.current === user.id) return;

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const scheduleRetry = () => {
            if (cancelled) return;
            timer = setTimeout(() => setRetry((n) => n + 1), RETRY_DELAY_MS);
        };
        (async () => {
            const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId;
            const token = await registerForPushToken(projectId);
            if (cancelled) return;
            if (!token) { scheduleRetry(); return; }

            const backgroundReady = await registerOrderBackgroundTask();
            if (cancelled) return;
            const { error } = await supabase.from('push_tokens').upsert(
                {
                    user_id: user.id,
                    token,
                    platform: Platform.OS,
                    progress_version: backgroundReady ? 1 : 0,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'token' },
            );
            if (!error && !cancelled) {
                registeredFor.current = user.id;
                await zustandStorage.setItem('registered-push-token', token);
            }
            if (error) {
                // Table not deployed yet, offline, or RLS refused — never fatal, retried later.
                console.warn('[push] enregistrement du token différé:', error.message);
                registeredFor.current = null;
                scheduleRetry();
            }
        })().catch(() => scheduleRetry());

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [user?.id, retry]);

    // Route notification taps to the order they concern.
    useEffect(() => {
        if (!user?.id) return;
        const refresh = () => {
            void queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
            void queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
        };
        const stopReceived = onOrderNotificationReceived(refresh);
        const stopTap = onNotificationTap((data: OrderNotificationData) => {
            refresh();
            // navigate, not push: three taps on three notifications must not stack
            // three tracking screens.
            if (data?.kind === 'new-order') {
                router.navigate('/(restaurant)/dashboard');
                return;
            }
            if (data?.orderId) {
                router.navigate({ pathname: '/tracking', params: { orderId: String(data.orderId) } });
            }
        });
        return () => { stopReceived(); stopTap(); };
    }, [user?.id]);

    return null;
}

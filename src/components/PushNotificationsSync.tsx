import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import {
    setupNotifications,
    registerForPushToken,
    onNotificationTap,
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
export default function PushNotificationsSync() {
    const user = useAuthStore((s) => s.user);
    const registeredFor = useRef<string | null>(null);

    useEffect(() => {
        setupNotifications();
    }, []);

    // Register (or re-register) the device token whenever the signed-in user changes.
    useEffect(() => {
        if (!user?.id) {
            registeredFor.current = null;
            return;
        }
        if (registeredFor.current === user.id) return;

        let cancelled = false;
        (async () => {
            const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId;
            const token = await registerForPushToken(projectId);
            if (cancelled || !token) return;

            registeredFor.current = user.id;
            const { error } = await supabase.from('push_tokens').upsert(
                {
                    user_id: user.id,
                    token,
                    platform: Platform.OS,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'token' },
            );
            if (error) {
                // Table not deployed yet, or RLS refused — never fatal.
                console.warn('[push] enregistrement du token ignoré:', error.message);
                registeredFor.current = null;
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    // Route notification taps to the order they concern.
    useEffect(() => {
        return onNotificationTap((data: OrderNotificationData) => {
            if (data?.kind === 'new-order') {
                router.push('/(restaurant)/dashboard');
                return;
            }
            if (data?.orderId) {
                router.push({ pathname: '/tracking', params: { orderId: String(data.orderId) } });
            }
        });
    }, []);

    return null;
}

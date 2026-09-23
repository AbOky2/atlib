import { Platform } from 'react-native';
import { COLORS } from './palette';
import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Safe access to expo-notifications.
 *
 * Same discipline as src/lib/netinfo.ts: the JS package is installed, but the
 * NATIVE side only exists once the app has been rebuilt. Require()-ing the
 * module on an older binary throws (or worse, registers handlers that fire into
 * nothing), so we probe the native module FIRST and hand callers `null`
 * otherwise. Every helper below degrades to a no-op — the app keeps working,
 * just without notifications, until the next native build.
 */

let cached: any | null | undefined;

function getNotificationsSafe(): any | null {
    if (cached !== undefined) return cached;
    try {
        const native = requireOptionalNativeModule('ExpoNotificationsEmitter');
        if (!native) {
            console.warn(
                '[notifications] module natif absent — notifications désactivées jusqu\'au prochain build natif.',
            );
            cached = null;
            return cached;
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        cached = require('expo-notifications');
    } catch (e) {
        console.warn('[notifications] indisponible', e);
        cached = null;
    }
    return cached;
}

/** Android channel for order updates — high importance so it rings through. */
export const ORDER_CHANNEL_ID = 'order-updates';
/** Restaurant-side channel: a new order must be impossible to miss. */
export const NEW_ORDER_CHANNEL_ID = 'new-orders';

let configured = false;

/**
 * Configure foreground presentation + Android channels. Safe to call repeatedly;
 * only the first call does work.
 */
export function setupNotifications(): void {
    if (configured) return;
    const N = getNotificationsSafe();
    if (!N) return;
    configured = true;

    try {
        N.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });

        if (Platform.OS === 'android') {
            N.setNotificationChannelAsync(ORDER_CHANNEL_ID, {
                name: 'Suivi de commande',
                importance: N.AndroidImportance.HIGH,
                vibrationPattern: [0, 200, 100, 200],
                lightColor: COLORS.accent,
            });
            N.setNotificationChannelAsync(NEW_ORDER_CHANNEL_ID, {
                name: 'Nouvelles commandes',
                importance: N.AndroidImportance.MAX,
                vibrationPattern: [0, 400, 200, 400, 200, 400],
                lightColor: COLORS.accent,
                // Bypasses Do Not Disturb-style muting on most OEMs.
                bypassDnd: true,
            });
        }
    } catch (e) {
        console.warn('[notifications] configuration ignorée', e);
    }
}

/**
 * Ask for permission and return the Expo push token, or null when unavailable
 * (permission refused, simulator, missing native module, no projectId).
 */
export async function registerForPushToken(projectId?: string): Promise<string | null> {
    const N = getNotificationsSafe();
    if (!N) return null;
    try {
        const existing = await N.getPermissionsAsync();
        let status = existing.status;
        if (status !== 'granted') {
            const asked = await N.requestPermissionsAsync();
            status = asked.status;
        }
        if (status !== 'granted') return null;

        const token = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        return token?.data ?? null;
    } catch (e) {
        console.warn('[notifications] token indisponible', e);
        return null;
    }
}

/** Fire a local notification immediately (used for the restaurant alert). */
export async function notifyNow(
    title: string,
    body: string,
    options?: { channelId?: string; data?: Record<string, unknown>; identifier?: string },
): Promise<void> {
    const N = getNotificationsSafe();
    if (!N) return;
    try {
        await N.scheduleNotificationAsync({
            // A stable identifier REPLACES the previous notification instead of
            // stacking one per reminder.
            ...(options?.identifier ? { identifier: options.identifier } : {}),
            content: {
                title,
                body,
                sound: true,
                data: options?.data ?? {},
                ...(Platform.OS === 'android' ? { channelId: options?.channelId ?? ORDER_CHANNEL_ID } : {}),
            },
            trigger: null, // immediately
        });
    } catch (e) {
        console.warn('[notifications] envoi local échoué', e);
    }
}

/**
 * Android's answer to the Live Activity.
 *
 * Android has no Dynamic Island, and the product deliberately keeps the numeric
 * ETA off the tracking screen on iOS because the lock screen owns it — which
 * would leave Android users with no time information anywhere. So on Android the
 * order lives in the notification shade instead: one ongoing notification, always
 * the same identifier so each status update REPLACES it rather than stacking six
 * notifications over one delivery.
 */
const ORDER_PROGRESS_ID = 'noir-order-progress';

export async function postOrderProgress(
    orderId: string,
    title: string,
    body: string,
): Promise<void> {
    if (Platform.OS !== 'android') return;
    const N = getNotificationsSafe();
    if (!N) return;
    try {
        await N.scheduleNotificationAsync({
            identifier: ORDER_PROGRESS_ID,
            content: {
                title,
                body,
                sound: true,
                sticky: true, // stays until the order ends
                channelId: ORDER_CHANNEL_ID,
                data: { orderId, kind: 'order-status' },
            },
            trigger: null,
        });
    } catch (e) {
        console.warn('[notifications] progression commande échouée', e);
    }
}

/** Clear the ongoing order notification once the order is terminal. */
export async function clearOrderProgress(): Promise<void> {
    if (Platform.OS !== 'android') return;
    const N = getNotificationsSafe();
    if (!N) return;
    try {
        await N.dismissNotificationAsync(ORDER_PROGRESS_ID);
        await N.cancelScheduledNotificationAsync(ORDER_PROGRESS_ID);
    } catch {
        // Already gone — nothing to do.
    }
}

/**
 * Subscribe to notification taps. Returns an unsubscribe function (a no-op when
 * notifications aren't available).
 */
export function onNotificationTap(handler: (data: Record<string, any>) => void): () => void {
    const N = getNotificationsSafe();
    if (!N) return () => {};
    try {
        let disposed = false;
        let lastResponse: string | null = null;
        const receive = (response: any) => {
            const id = response?.notification?.request?.identifier;
            const data = response?.notification?.request?.content?.data ?? {};
            // Android replaces one persistent identifier across status updates
            // and orders. Deduplicate the response, not that shared identifier.
            const key = JSON.stringify([id, response?.notification?.date, response?.actionIdentifier, data.orderId, data.updatedAt]);
            if (disposed || !id || key === lastResponse) return;
            lastResponse = key;
            handler(data);
            void N.clearLastNotificationResponseAsync?.();
        };
        const sub = N.addNotificationResponseReceivedListener(receive);
        Promise.resolve(N.getLastNotificationResponseAsync?.()).then(receive).catch(() => {});
        return () => { disposed = true; sub?.remove?.(); };
    } catch (e) {
        console.warn('[notifications] écoute impossible', e);
        return () => {};
    }
}

/** Data payload carried by an order notification, whether local or pushed. */
export interface OrderNotificationData {
    orderId?: string;
    kind?: 'order-status' | 'new-order';
}

/** Refresh cached orders when a push arrives while the app is visible. */
export function onOrderNotificationReceived(handler: () => void): () => void {
    const N = getNotificationsSafe();
    const sub = N?.addNotificationReceivedListener?.(handler);
    return () => sub?.remove?.();
}

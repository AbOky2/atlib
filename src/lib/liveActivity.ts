/**
 * Single source of truth for iOS Live Activities / Dynamic Island.
 *
 * Bridges the app's order lifecycle to the native `LiveActivity` module
 * (see modules/live-activity). All functions are safe no-ops on Android/Web
 * and on iOS < 16.1 (the native module guards internally).
 *
 * Labels and progress come from src/lib/orderStatus.ts — the same values the
 * tracking screen shows, so the Dynamic Island can never diverge from the app.
 *
 * NOTE: The Dynamic Island UI itself lives in the widget target
 * (targets/widget/LiveActivity.swift). Without that widget extension being part
 * of the build, `Activity.request()` throws and nothing appears — this is why
 * it must be registered via the apple-targets config (see targets/).
 */
import { Platform } from 'react-native';
import {
    startActivity,
    updateActivity,
    endActivity,
    endActivityWithFinalState,
    addPushTokenListener,
    addActivityErrorListener,
    isActivityRunning,
    type LiveActivityPushToken,
} from '../../modules/live-activity';
import { statusMeta } from './orderStatus';

export type { LiveActivityPushToken };

export type { OrderStatus } from './orderStatus';

export const statusLabel = (status: string) => statusMeta(status).label;

/**
 * Subscribe to the activity's APNs token.
 *
 * This token is what lets the SERVER move the Live Activity forward while the
 * app is suspended — the only situation in which a lock-screen widget is
 * actually being looked at. Safe no-op off iOS and on binaries without it.
 */
export const onLiveActivityPushToken = (
    listener: (payload: LiveActivityPushToken) => void,
): (() => void) => {
    if (Platform.OS !== 'ios') return () => {};
    return addPushTokenListener(listener);
};

/**
 * Is a Live Activity actually on screen right now?
 *
 * The tracking screen used to promise the customer that progress was on their
 * lock screen without ever checking. If the widget extension is missing from
 * the build, or the user turned Live Activities off, that promise was a lie —
 * and it looked like the app was broken rather than a build setting being off.
 */
export const liveActivityRunning = (): boolean =>
    Platform.OS === 'ios' && isActivityRunning();

/** Surface start/update failures instead of losing them in a device console. */
export const onLiveActivityError = (listener: (message: string) => void): (() => void) => {
    if (Platform.OS !== 'ios') return () => {};
    return addActivityErrorListener(({ message }) => listener(message));
};

/** Start a Live Activity — called when the restaurant CONFIRMS the order. */
export const startDeliveryActivity = (orderId: string, restaurantName: string) => {
    if (Platform.OS !== 'ios') return;
    try {
        startActivity(orderId, restaurantName);
    } catch (e) {
        console.log('[LiveActivity] start failed', e);
    }
};

/**
 * Push a new state to the running Live Activity based on the order status.
 *
 * `arrivalLabel` is a wall-clock target ("19h45"), never a countdown: the lock
 * screen is read while the app is suspended, so a relative duration would
 * freeze mid-delivery (see arrivalTimeLabel in src/lib/eta.ts).
 */
export const updateDeliveryActivity = (
    status: string,
    arrivalLabel: string | null,
    contextLine = 'Livraison par le restaurant',
) => {
    if (Platform.OS !== 'ios') return;
    try {
        const meta = statusMeta(status);
        updateActivity(meta.headline, meta.progress, contextLine, arrivalLabel || 'Bientôt');
    } catch (e) {
        console.log('[LiveActivity] update failed', e);
    }
};

/**
 * End the delivery Live Activity. When the order completed normally, the
 * terminal state stays visible on the lock screen a few minutes ("Livrée ·
 * Bon appétit !") instead of vanishing abruptly.
 */
export const endDeliveryActivity = (finalStatus?: string) => {
    if (Platform.OS !== 'ios') return;
    try {
        if (finalStatus === 'DELIVERED') {
            const meta = statusMeta(finalStatus);
            endActivityWithFinalState(meta.headline, meta.progress);
        } else {
            endActivity();
        }
    } catch (e) {
        console.log('[LiveActivity] end failed', e);
    }
};

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
import { startActivity, updateActivity, endActivity, endActivityWithFinalState } from '../../modules/live-activity';
import { statusMeta } from './orderStatus';

export type { OrderStatus } from './orderStatus';

export const statusLabel = (status: string) => statusMeta(status).label;

/** Start a Live Activity — called when the restaurant CONFIRMS the order. */
export const startDeliveryActivity = (orderId: string, restaurantName: string) => {
    if (Platform.OS !== 'ios') return;
    try {
        startActivity(orderId, restaurantName);
    } catch (e) {
        console.log('[LiveActivity] start failed', e);
    }
};

/** Push a new state to the running Live Activity based on the order status. */
export const updateDeliveryActivity = (
    status: string,
    etaMins: number,
    contextLine = 'Livraison par le restaurant',
) => {
    if (Platform.OS !== 'ios') return;
    try {
        const meta = statusMeta(status);
        updateActivity(
            meta.headline,
            meta.progress,
            contextLine,
            etaMins > 0 ? `${etaMins} min` : 'Bientôt',
        );
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

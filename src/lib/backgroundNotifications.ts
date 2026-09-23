import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { zustandStorage } from './storage';
import { parseOrderPush, shouldApplyOrderPush, type OrderPush } from './orderPush';
import { isTerminal } from './orderStatus';

/** expo-task-manager resolves its native module at import time, and the task only
 *  runs on Android, so it is loaded lazily instead of at bundle start. */
const taskManager = (): typeof import('expo-task-manager') => require('expo-task-manager');

const TASK = 'noir-order-progress-v1';
const IDENTIFIER = 'noir-order-progress';
let tail = Promise.resolve();

/** One serialized writer, shared by foreground updates and headless pushes. */
export function applyOrderProgress(push: OrderPush): Promise<void> {
    if (Platform.OS !== 'android') return Promise.resolve();
    const run = async () => {
        const owner = await zustandStorage.getItem('private-data-owner');
        const key = 'order-progress-state';
        const raw = await zustandStorage.getItem(key);
        let previous;
        try { previous = raw ? JSON.parse(raw) : undefined; } catch { previous = undefined; }
        if (previous?.customerId !== push.customerId) previous = undefined;
        if (!shouldApplyOrderPush(push, owner, previous)) return;
        await Notifications.setNotificationChannelAsync('order-updates', {
            name: 'Suivi de commande', importance: Notifications.AndroidImportance.HIGH,
        });
        // Account may have changed while awaiting native channel creation.
        if (await zustandStorage.getItem('private-data-owner') !== push.customerId) return;
        await Notifications.scheduleNotificationAsync({
            identifier: IDENTIFIER,
            content: {
                title: push.statusTitle, body: push.statusBody,
                sticky: !isTerminal(push.status), autoDismiss: isTerminal(push.status),
                data: { kind: 'order-status', orderId: push.orderId, customerId: push.customerId, updatedAt: push.updatedAt },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: 'order-updates' },
        });
        if (await zustandStorage.getItem('private-data-owner') !== push.customerId) {
            await Notifications.cancelScheduledNotificationAsync(IDENTIFIER);
            await Notifications.dismissNotificationAsync(IDENTIFIER);
            return;
        }
        await zustandStorage.setItem(key, JSON.stringify({ orderId: push.orderId, customerId: push.customerId, updatedAt: push.updatedAt, status: push.status }));
    };
    tail = tail.catch(() => {}).then(run);
    return tail;
}

// Loaded from index.js before Expo Router, including headless execution.
if (Platform.OS === 'android') {
    taskManager().defineTask<Notifications.NotificationTaskPayload>(TASK, async ({ data, error }) => {
        if (error || !data || 'actionIdentifier' in data) return;
        let payload: unknown = data.data;
        if (typeof data.data?.dataString === 'string') {
            try { payload = JSON.parse(data.data.dataString); } catch { return; }
        }
        const push = parseOrderPush(payload);
        if (push) await applyOrderProgress(push);
    });
}

export async function registerOrderBackgroundTask(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
        if (!await taskManager().isAvailableAsync()) return false;
        await Notifications.registerTaskAsync(TASK);
        return true;
    } catch { return false; }
}

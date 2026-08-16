import { requireNativeModule } from 'expo-modules-core';

/** Payload of `onPushTokenChange` — the APNs token driving ONE order's activity. */
export interface LiveActivityPushToken {
  orderId: string;
  token: string;
}

type LiveActivityModuleType = {
  startActivity(orderId: string, restaurantName: string): void;
  updateActivity(status: string, progress: number, courierName: string, deliveryTime: string): void;
  endActivity(): void;
  /** Added later — absent on binaries built before it existed, hence optional. */
  endActivityWithFinalState?(status: string, progress: number): void;
  /** Present once the module is rebuilt with push support. */
  addListener?(event: string, listener: (payload: any) => void): { remove(): void };
  /** Diagnostics — absent on binaries built before they existed. */
  areActivitiesEnabled?(): boolean;
  isActivityRunning?(): boolean;
};

// We wrap it to gracefully fail on Android/Web or if native module is not linked
let LiveActivity: LiveActivityModuleType | null = null;
try {
  LiveActivity = requireNativeModule('LiveActivity');
} catch (e) {
  console.log('LiveActivity module not found or not supported on this platform.');
}

export const startActivity = (orderId: string, restaurantName: string) => {
  LiveActivity?.startActivity(orderId, restaurantName);
};

export const updateActivity = (status: string, progress: number, courierName: string, deliveryTime: string) => {
  LiveActivity?.updateActivity(status, progress, courierName, deliveryTime);
};

export const endActivity = () => {
  LiveActivity?.endActivity();
};

/**
 * End while SHOWING the terminal state for a few minutes (delivered orders feel
 * finished, not vanished). Falls back to an immediate end on older binaries.
 */
export const endActivityWithFinalState = (status: string, progress: number) => {
  if (LiveActivity?.endActivityWithFinalState) {
    LiveActivity.endActivityWithFinalState(status, progress);
  } else {
    LiveActivity?.endActivity();
  }
};

/**
 * Listen for the activity's APNs token. Returns an unsubscribe function that is
 * a no-op on Android, on the simulator, and on binaries built before push
 * support existed.
 */
export const addPushTokenListener = (
  listener: (payload: LiveActivityPushToken) => void,
): (() => void) => {
  try {
    const subscription = LiveActivity?.addListener?.('onPushTokenChange', listener);
    return () => subscription?.remove?.();
  } catch (e) {
    console.log('[LiveActivity] push token listener unavailable', e);
    return () => {};
  }
};

/** Listen for start/update failures — the only way to see them on a device build. */
export const addActivityErrorListener = (
  listener: (payload: { message: string }) => void,
): (() => void) => {
  try {
    const subscription = LiveActivity?.addListener?.('onActivityError', listener);
    return () => subscription?.remove?.();
  } catch {
    return () => {};
  }
};

/** Has the user (or the OS) allowed Live Activities for this app? */
export const areActivitiesEnabled = (): boolean => {
  try {
    return LiveActivity?.areActivitiesEnabled?.() ?? false;
  } catch {
    return false;
  }
};

/** Is an activity live right now? Used so the UI never promises one that isn't. */
export const isActivityRunning = (): boolean => {
  try {
    return LiveActivity?.isActivityRunning?.() ?? false;
  } catch {
    return false;
  }
};

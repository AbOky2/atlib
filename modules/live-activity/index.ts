import { requireNativeModule } from 'expo-modules-core';

type LiveActivityModuleType = {
  startActivity(orderId: string, restaurantName: string): void;
  updateActivity(status: string, progress: number, courierName: string, deliveryTime: string): void;
  endActivity(): void;
  /** Added later — absent on binaries built before it existed, hence optional. */
  endActivityWithFinalState?(status: string, progress: number): void;
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

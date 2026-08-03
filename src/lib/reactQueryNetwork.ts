import { AppState, type AppStateStatus } from 'react-native';
import { onlineManager, focusManager } from '@tanstack/react-query';
import { getNetInfoSafe } from './netinfo';

/**
 * Wires React Query to the device's real connectivity + foreground state.
 *
 * Connectivity goes through getNetInfoSafe() (src/lib/netinfo.ts), which probes
 * the NATIVE module before loading the JS wrapper — on a binary that predates
 * the netinfo dependency the app still runs (React Query just assumes
 * always-online until the next native build). AppState/focus wiring uses only
 * core RN and is always safe.
 */
let wired = false;
export function setupReactQueryNetwork() {
    if (wired) return;
    wired = true;

    // Foreground/focus — core RN, always available.
    try {
        const onAppStateChange = (status: AppStateStatus) => {
            focusManager.setFocused(status === 'active');
        };
        AppState.addEventListener('change', onAppStateChange);
    } catch (e) {
        console.warn('[reactQueryNetwork] AppState wiring skipped', e);
    }

    // Connectivity — optional native module, probed before load so a missing
    // binary never crashes nor spams async rejections.
    try {
        const NetInfo = getNetInfoSafe();
        if (NetInfo?.addEventListener) {
            onlineManager.setEventListener((setOnline) =>
                NetInfo.addEventListener((state: any) => setOnline(!!state.isConnected)),
            );
        }
    } catch (e) {
        console.warn('[reactQueryNetwork] NetInfo unavailable — offline detection disabled until next native build.', e);
    }
}

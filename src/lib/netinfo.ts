import { NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * Safe access to the NetInfo NATIVE module.
 *
 * On a binary that hasn't been rebuilt since @react-native-community/netinfo
 * was added, the JS wrapper is present but RNCNetInfo is null. Merely
 * require()-ing the wrapper then kicks off an internal async fetch whose
 * rejection escapes any try/catch around the require — so we probe the native
 * side FIRST (old + new architecture) and only load the wrapper when it's
 * really there. Callers get `null` otherwise and must degrade gracefully.
 */

let cached: any | null | undefined;

export function getNetInfoSafe(): any | null {
    if (cached !== undefined) return cached;
    try {
        const native =
            (TurboModuleRegistry as any)?.get?.('RNCNetInfo') ?? (NativeModules as any)?.RNCNetInfo;
        if (!native) {
            console.warn(
                '[netinfo] module natif absent — détection hors-ligne désactivée jusqu\'au prochain build natif (pod install + rebuild).',
            );
            cached = null;
            return cached;
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        cached = require('@react-native-community/netinfo').default ?? null;
    } catch (e) {
        console.warn('[netinfo] indisponible', e);
        cached = null;
    }
    return cached;
}

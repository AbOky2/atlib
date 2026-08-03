import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/**
 * Persistent key/value storage backing the zustand stores.
 *
 * MMKV is a native module; if it ever fails to initialize (e.g. not linked in a
 * given build), we fall back to an in-memory Map so the app still boots instead
 * of crashing on startup. Persistence simply becomes a no-op across restarts in
 * that degraded case.
 */
let mmkv: MMKV | null = null;
try {
    // react-native-mmkv v4 (Nitro): instances are created via createMMKV(), not `new MMKV()`.
    mmkv = createMMKV({ id: 'noir-delivery' });
} catch (e) {
    console.warn('[storage] MMKV unavailable — falling back to in-memory storage.', e);
}

const memory = new Map<string, string>();

export const storage = mmkv;

/** zustand-compatible (sync) storage adapter, safe on every platform. */
export const zustandStorage: StateStorage = {
    setItem: (key, value) => {
        if (mmkv) mmkv.set(key, value);
        else memory.set(key, value);
    },
    getItem: (key) => {
        const value = mmkv ? mmkv.getString(key) : memory.get(key);
        return value ?? null;
    },
    removeItem: (key) => {
        if (mmkv) mmkv.remove(key);
        else memory.delete(key);
    },
};

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { COLORS } from '../lib/palette';

import { getNetInfoSafe } from '../lib/netinfo';

/**
 * Slim status banner shown while the device is offline. React Query already
 * pauses/refetches through onlineManager (reactQueryNetwork.ts) — this makes
 * that state visible so a stalled screen never reads as a broken app.
 *
 * Connectivity goes through getNetInfoSafe() (src/lib/netinfo.ts), which probes
 * the NATIVE module before loading the JS wrapper — on a binary that predates
 * the netinfo dependency the banner simply never shows until the next native build.
 */
export function OfflineBanner() {
    const insets = useSafeAreaInsets();
    const [offline, setOffline] = useState(false);
    // Stays true while the slide-out plays, so the exit animation is visible.
    const [rendered, setRendered] = useState(false);
    const translateY = useRef(new Animated.Value(-80)).current;

    useEffect(() => {
        try {
            const NetInfo = getNetInfoSafe();
            if (!NetInfo?.addEventListener) return;
            const unsubscribe = NetInfo.addEventListener((state: any) => {
                // `isInternetReachable` can be null while probing — only trust a hard false.
                setOffline(state.isConnected === false || state.isInternetReachable === false);
            });
            return unsubscribe;
        } catch (e) {
            console.warn('[OfflineBanner] NetInfo unavailable — banner disabled until next native build.', e);
            return undefined;
        }
    }, []);

    useEffect(() => {
        if (offline) setRendered(true);
        Animated.spring(translateY, {
            toValue: offline ? 0 : -80,
            useNativeDriver: true,
            damping: 18,
            stiffness: 180,
        }).start(({ finished }) => {
            if (finished && !offline) setRendered(false);
        });
    }, [offline, translateY]);

    // Nothing to render while online — avoid an invisible overlay above the app.
    if (!rendered) return null;

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 999,
                transform: [{ translateY }],
            }}
        >
            <View className="bg-ink" style={{ paddingTop: insets.top }}>
                <View className="flex-row items-center justify-center gap-2 py-2" accessibilityRole="alert" accessibilityLiveRegion="polite">
                    <WifiOff color={COLORS.white} size={14} strokeWidth={2} />
                    <Text className="text-on-dark text-caption font-labelbold">
                        Vous êtes hors ligne · reconnexion automatique
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
}

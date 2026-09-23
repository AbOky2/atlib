import React, { useEffect, useRef } from 'react';
import { Text, Platform, View, Animated, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, XCircle, Info } from 'lucide-react-native';
import { useCartStore } from '../store/cartStore';
import { shadowFloat } from '../lib/elevation';
import { COLORS } from '../lib/palette';

const TOAST_ICON = {
    success: { Icon: CheckCircle2, color: COLORS.white },
    error: { Icon: XCircle, color: COLORS.dangerSoft },
    info: { Icon: Info, color: COLORS.accentSoft },
} as const;

/** The app's single transient message. Announced to screen readers, never only shown. */
export default function Toast() {
    const toastMessage = useCartStore(state => state.toastMessage);
    const toastType = useCartStore(state => state.toastType);
    const insets = useSafeAreaInsets();

    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (toastMessage) {
            AccessibilityInfo.announceForAccessibility(toastMessage);
            Animated.parallel([
                Animated.spring(translateY, { toValue: insets.top + (Platform.OS === 'ios' ? 8 : 16), useNativeDriver: true, damping: 15, stiffness: 150 }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(translateY, { toValue: -100, useNativeDriver: true, damping: 15, stiffness: 150 }),
                Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [toastMessage, insets.top, translateY, opacity]);

    const { Icon, color } = TOAST_ICON[toastType] ?? TOAST_ICON.success;

    // The store clears the message to dismiss; the pill keeps the last words
    // while it slides away instead of collapsing to a lone icon mid-flight.
    const lastMessage = useRef(toastMessage);
    if (toastMessage) lastMessage.current = toastMessage;

    return (
        <Animated.View
            pointerEvents="none"
            accessibilityLiveRegion="polite"
            style={{ position: 'absolute', top: 0, left: 24, right: 24, zIndex: 9999, alignItems: 'center', transform: [{ translateY }], opacity }}
        >
            <View
                className="flex-row items-center rounded-full"
                style={[{ gap: 12 }, { backgroundColor: COLORS.ink, paddingHorizontal: 20, paddingVertical: 12, maxWidth: '100%' }, shadowFloat]}
            >
                <Icon color={color} size={18} strokeWidth={2} />
                <Text className="text-label font-labelbold text-on-dark" style={{ flexShrink: 1 }}>{lastMessage.current}</Text>
            </View>
        </Animated.View>
    );
}

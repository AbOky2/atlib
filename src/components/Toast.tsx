import React, { useEffect, useRef } from 'react';
import { Text, Platform, View, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, XCircle, Info } from 'lucide-react-native';
import { useCartStore } from '../store/cartStore';
import { shadowFloat } from '../lib/elevation';

const TOAST_ICON = {
    success: { Icon: CheckCircle2, color: '#ffffff' },
    error: { Icon: XCircle, color: '#ff6b5e' },
    info: { Icon: Info, color: '#7ac6ff' },
} as const;

export default function Toast() {
    const toastMessage = useCartStore(state => state.toastMessage);
    const toastType = useCartStore(state => state.toastType);
    const insets = useSafeAreaInsets();

    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (toastMessage) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: insets.top + (Platform.OS === 'ios' ? 10 : 20),
                    useNativeDriver: true,
                    damping: 15,
                    stiffness: 150,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: -100,
                    useNativeDriver: true,
                    damping: 15,
                    stiffness: 150,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [toastMessage, insets.top]);

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    alignItems: 'center',
                    pointerEvents: 'none',
                    transform: [{ translateY }],
                    opacity,
                }
            ]}
        >
            <View
                style={{
                    backgroundColor: 'rgba(28, 27, 27, 0.95)',
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 100,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    ...shadowFloat,
                }}
            >
                {(() => {
                    const { Icon, color } = TOAST_ICON[toastType] ?? TOAST_ICON.success;
                    return <Icon color={color} size={18} />;
                })()}
                <Text style={{
                    color: '#fff',
                    fontSize: 13,
                    letterSpacing: 0.2,
                    fontFamily: 'Inter_600SemiBold',
                }}>
                    {toastMessage}
                </Text>
            </View>
        </Animated.View>
    );
}

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TriangleAlert, HelpCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useCartStore } from '../../src/store/cartStore';
import { shadowSheet } from '../lib/elevation';
import { COLORS } from '../lib/palette';

/**
 * Global confirmation sheet — the app's single "are you sure?" surface.
 *
 * Apple-style presentation: dimmed backdrop fading in while the card springs up
 * from the bottom; a contextual icon disc (red alert for destructive actions),
 * stacked full-width actions (primary on top), and a soft exit animation before
 * the store actually clears the dialog.
 */
export default function GlobalDialog() {
    const dialogConfig = useCartStore(state => state.dialogConfig);
    const hideDialog = useCartStore(state => state.hideDialog);
    const insets = useSafeAreaInsets();

    const backdrop = useRef(new Animated.Value(0)).current;
    const sheetY = useRef(new Animated.Value(480)).current;
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (dialogConfig) {
            setClosing(false);
            backdrop.setValue(0);
            sheetY.setValue(480);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Animated.parallel([
                Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 210 }),
            ]).start();
        }
    }, [dialogConfig, backdrop, sheetY]);

    if (!dialogConfig) return null;

    const {
        title,
        message,
        confirmText = 'Confirmer',
        cancelText = 'Annuler',
        destructive = false,
        onConfirm,
        onCancel
    } = dialogConfig;

    const dismiss = (after?: () => void) => {
        if (closing) return;
        setClosing(true);
        Animated.parallel([
            Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(sheetY, { toValue: 480, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(() => {
            hideDialog();
            after?.();
        });
    };

    const handleConfirm = () => dismiss(onConfirm);
    const handleCancel = () => dismiss(onCancel);

    const Icon = destructive ? TriangleAlert : HelpCircle;

    return (
        <Modal transparent animationType="none" visible onRequestClose={handleCancel}>
            {/* Backdrop */}
            <Animated.View
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdrop }}
            >
                <Pressable style={{ flex: 1 }} onPress={handleCancel} accessibilityLabel="Fermer" />
            </Animated.View>

            {/* Sheet */}
            <View className="flex-1 justify-end" pointerEvents="box-none">
                <Animated.View accessibilityViewIsModal
                    className="bg-surface rounded-t-sheet px-6 pt-3"
                    style={[
                        shadowSheet,
                        { shadowOffset: { width: 0, height: -12 }, maxHeight: '90%', paddingBottom: Math.max(insets.bottom, 20), transform: [{ translateY: sheetY }] },
                    ]}
                >
                    <ScrollView bounces={false}>
                    {/* Grabber */}
                    <View className="items-center mb-5">
                        <View className="w-10 h-1 rounded-full bg-fill-strong" />
                    </View>

                    {/* Contextual icon */}
                    <View className="items-center mb-4">
                        <View
                            className="w-14 h-14 rounded-full items-center justify-center"
                            style={{ backgroundColor: destructive ? COLORS.dangerSoft : COLORS.fill }}
                        >
                            <Icon color={destructive ? COLORS.danger : COLORS.ink} size={24} strokeWidth={2.1} />
                        </View>
                    </View>

                    <Text className="text-h2 font-title tracking-tight text-ink text-center mb-2">
                        {title}
                    </Text>
                    <Text className="text-body font-body text-ink-muted text-center mb-8 px-2">
                        {message}
                    </Text>

                    {/* Stacked actions — primary first */}
                    <Pressable
                        onPress={handleConfirm}
                        accessibilityRole="button"
                        className="w-full h-14 rounded-full items-center justify-center active:scale-[0.98] mb-2"
                        style={{ backgroundColor: destructive ? COLORS.danger : COLORS.ink }}
                    >
                        <Text className="text-white text-body font-labelbold">{confirmText}</Text>
                    </Pressable>
                    <Pressable
                        onPress={handleCancel}
                        accessibilityRole="button"
                        className="w-full h-14 rounded-full items-center justify-center bg-fill active:bg-fill-strong"
                    >
                        <Text className="text-ink text-body font-labelbold">{cancelText}</Text>
                    </Pressable>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

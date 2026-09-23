import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useUserOrders } from '../data/orders';
import { findActiveOrder, statusMeta, type OrderStatus } from '../lib/orderStatus';
import { shadowFloat } from '../lib/elevation';
import { COLORS } from '../lib/palette';
import { TAB_BAR_CLEARANCE } from './ui';
import { STEP_ICON } from '../../app/(client)/tracking';

// Screens with their own bottom action bar (or that are full-screen) where the
// floating order banner would collide — keep it off there.
const HIDE_BANNER_ON = ['tracking', 'cart', 'payment-method', 'checkout-address', 'restaurant', 'login', 'order-confirmed', 'privacy'];

/** Height of the banner plus the 12 pt it keeps above the navigation capsule. */
export const ACTIVE_BANNER_CLEARANCE = 80 + 12;

/**
 * Bottom padding a tab screen must reserve so its last row is never hidden by
 * the navigation capsule — nor by this banner when an order is live.
 */
export function useBottomClearance(): number {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((state) => state.user);
    const { data: orders } = useUserOrders(user?.id);
    return Math.max(insets.bottom, 14) + TAB_BAR_CLEARANCE + (findActiveOrder(orders) ? ACTIVE_BANNER_CLEARANCE : 0);
}

export function ActiveOrderBanner() {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const user = useAuthStore(state => state.user);
    // Reads the shared orders cache; GlobalOrderSync owns the single realtime
    // subscription + polling that keeps it fresh, so no subscription is needed here.
    const { data: orders } = useUserOrders(user?.id);

    const activeOrder = findActiveOrder(orders);

    if (!activeOrder) return null;
    // Hide on full-screen / bottom-CTA screens so it never overlaps their controls.
    if (HIDE_BANNER_ON.some((route) => pathname?.includes(route))) return null;

    // Same words and pictogram as the tracking screen — one vocabulary.
    const meta = statusMeta(activeOrder.status);
    const Icon = STEP_ICON[activeOrder.status as OrderStatus] ?? STEP_ICON.PENDING;

    return (
        <Pressable
            onPress={() => router.navigate('/tracking')}
            accessibilityRole="button"
            accessibilityLabel={`${meta.headline}. Ouvrir le suivi de commande`}
            // 12 pt above the capsule (62 pt tall, resting on the safe area).
            style={[{ bottom: Math.max(insets.bottom, 14) + 62 + 12, height: 80 }, shadowFloat]}
            className="absolute left-6 right-6 z-40 bg-ink rounded-panel flex-row items-center justify-between px-4"
        >
            <View className="flex-row items-center flex-1" style={{ gap: 16 }}>
                <View className="w-12 h-12 rounded-full bg-accent items-center justify-center">
                    <Icon color={COLORS.ink} size={22} strokeWidth={2.2} />
                </View>
                <View className="flex-1">
                    <Text className="text-on-dark font-title text-body tracking-tight" numberOfLines={1}>{meta.headline}</Text>
                    <Text className="text-on-dark-muted font-label text-eyebrow uppercase tracking-eyebrow mt-1">Appuyez pour le suivi</Text>
                </View>
            </View>
            <View className="w-8 h-8 rounded-full bg-fill-dark-strong items-center justify-center">
                <View className="w-2 h-2 bg-accent rounded-full" />
            </View>
        </Pressable>
    );
}

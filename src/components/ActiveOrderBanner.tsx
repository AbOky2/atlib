import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useUserOrders } from '../hooks/useSupabase';
import { findActiveOrder } from '../lib/orderStatus';
import { ChefHat, Bike, Clock } from 'lucide-react-native';
import { shadowFloat } from '../lib/elevation';

// Screens with their own bottom action bar (or that are full-screen) where the
// floating order banner would collide — keep it off there.
const HIDE_BANNER_ON = ['tracking', 'cart', 'payment-method', 'checkout-address', 'restaurant', 'login', 'order-confirmed'];

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

    const currentStatus = activeOrder.status;

    let icon = <Clock color="#fff" size={20} />;
    let text = "En attente...";

    if (currentStatus === 'ACCEPTED' || currentStatus === 'PREPARING') {
        icon = <ChefHat color="#fff" size={20} />;
        text = "Préparation en cours";
    } else if (currentStatus === 'READY' || currentStatus === 'OUT_FOR_DELIVERY') {
        icon = <Bike color="#fff" size={20} />;
        text = "Commande en route !";
    }

    return (
        <Pressable
            onPress={() => router.push('/tracking')}
            style={[{ bottom: Math.max(insets.bottom, 12) + 66 }, shadowFloat]}
            className="absolute left-4 right-4 z-40 bg-ink rounded-panel flex-row items-center justify-between p-4"
        >
            <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 rounded-full bg-accent items-center justify-center">
                    {icon}
                </View>
                <View>
                    <Text className="text-white font-title text-body tracking-tight">{text}</Text>
                    <Text className="text-white/50 font-label text-eyebrow uppercase tracking-[0.12em] mt-1">Appuyez pour le suivi</Text>
                </View>
            </View>
            <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                <View className="w-2 h-2 bg-accent rounded-full" />
            </View>
        </Pressable>
    );
}

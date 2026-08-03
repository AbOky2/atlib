import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useUserOrders } from '../hooks/useSupabase';
import { findActiveOrder } from '../lib/orderStatus';
import { ChefHat, Bike, Clock } from 'lucide-react-native';

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
            onPress={() => router.push('/(client)/tracking')}
            style={{ bottom: Math.max(insets.bottom, 12) + 66 }}
            className="absolute left-4 right-4 z-40 bg-[#1c1b1b] rounded-[1.5rem] flex-row items-center justify-between p-4 shadow-xl"
        >
            <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 rounded-full bg-[#FF5733] items-center justify-center">
                    {icon}
                </View>
                <View>
                    <Text className="text-white font-manrope font-bold text-[15px] tracking-tight">{text}</Text>
                    <Text className="text-[#a8a29e] font-inter text-[10px] uppercase tracking-widest mt-1">Appuyez pour le suivi</Text>
                </View>
            </View>
            <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                <View className="w-2 h-2 bg-[#FF5733] rounded-full" />
            </View>
        </Pressable>
    );
}

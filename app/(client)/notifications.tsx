import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Bell, Clock, ChefHat, CheckCircle2, Truck, Package, XCircle, type LucideIcon } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useNotifications, type AppNotification } from '../../src/hooks/useNotifications';
import { useNotificationStore } from '../../src/store/notificationStore';
import { statusMeta, type OrderStatus } from '../../src/lib/orderStatus';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';

// Icons stay a UI concern; colours come from the canonical status module.
const STATUS_ICON: Record<OrderStatus, LucideIcon> = {
    PENDING: Clock,
    ACCEPTED: CheckCircle2,
    PREPARING: ChefHat,
    READY: Package,
    OUT_FOR_DELIVERY: Truck,
    DELIVERED: CheckCircle2,
    CANCELLED: XCircle,
};

const relativeTime = (iso: string) => {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diff = Date.now() - then;
    const min = Math.round(diff / 60000);
    if (min < 1) return "À l'instant";
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `Il y a ${h} h`;
    const d = Math.round(h / 24);
    if (d < 7) return `Il y a ${d} j`;
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export default function NotificationsScreen() {
    const headerOffset = useHeaderOffset();
    const user = useAuthStore((s) => s.user);
    const { items } = useNotifications();
    const markAllRead = useNotificationStore((s) => s.markAllRead);

    // Opening the inbox marks everything currently shown as read.
    useEffect(() => {
        if (items.length) markAllRead(items.map((i) => i.id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length]);

    const openNotification = (n: AppNotification) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Open THE order the notification is about — not just the active one.
        router.push({ pathname: '/tracking', params: { orderId: n.orderId } });
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Notifications" back="arrow" onBack={() => router.back()} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingTop: headerOffset + 12, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="px-6">
                    {!user ? (
                        <View className="py-24 items-center">
                            <View className="w-16 h-16 rounded-full bg-fill items-center justify-center mb-5">
                                <Bell color="#8d8a87" size={30} />
                            </View>
                            <Text className="text-h3 font-title text-ink">Connectez-vous</Text>
                            <Text className="text-body text-ink-muted text-center font-body mt-2 mb-7 leading-relaxed">
                                Connectez-vous pour suivre l'état de vos commandes en temps réel.
                            </Text>
                            <Pressable
                                onPress={() => router.push('/login')}
                                className="bg-ink px-8 py-4 rounded-full active:scale-95"
                            >
                                <Text className="text-white text-caption font-labelbold">Se connecter</Text>
                            </Pressable>
                        </View>
                    ) : items.length === 0 ? (
                        <View className="py-24 items-center">
                            <View className="w-16 h-16 rounded-full bg-fill items-center justify-center mb-5">
                                <Bell color="#8d8a87" size={30} />
                            </View>
                            <Text className="text-h3 font-title text-ink">Aucune notification</Text>
                            <Text className="text-body text-ink-muted text-center font-body mt-2 leading-relaxed">
                                Les mises à jour de vos commandes apparaîtront ici.
                            </Text>
                        </View>
                    ) : (
                        <View className="gap-3 mt-2">
                            {items.map((n) => {
                                const meta = statusMeta(n.status);
                                const Icon = STATUS_ICON[n.status as OrderStatus] ?? Clock;
                                return (
                                    <Pressable
                                        key={n.id}
                                        onPress={() => openNotification(n)}
                                        className="flex-row items-start gap-4 bg-white rounded-panel p-4 border border-hairline active:scale-[0.99]"
                                       
                                    >
                                        <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: meta.tint }}>
                                            <Icon color={meta.color} size={20} />
                                        </View>
                                        <View className="flex-1">
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-body font-heading text-ink flex-1 pr-2" numberOfLines={1}>
                                                    {n.title}
                                                </Text>
                                                {!n.read && <View className="w-2 h-2 rounded-full bg-accent" />}
                                            </View>
                                            <Text className="text-body text-ink-muted font-body leading-relaxed mt-0.5">{n.body}</Text>
                                            <Text className="text-eyebrow text-ink-faint font-label mt-1.5">{relativeTime(n.createdAt)}</Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

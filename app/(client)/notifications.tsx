import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Bell } from 'lucide-react-native';

import { useAuthStore } from '../../src/store/authStore';
import { useNotifications, type AppNotification } from '../../src/hooks/useNotifications';
import { useNotificationStore } from '../../src/store/notificationStore';
import { statusMeta, type OrderStatus } from '../../src/lib/orderStatus';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { Button, Card, EmptyState, TypeText, SCREEN_GUTTER } from '../../src/components/ui';
import { STEP_ICON } from './tracking';

const relativeTime = (iso: string) => {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diff = Date.now() - then;
    const min = Math.round(diff / 60000);
    if (min < 1) return 'À l’instant';
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `Il y a ${h} h`;
    const d = Math.round(h / 24);
    if (d < 7) return `Il y a ${d} j`;
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
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
        router.navigate({ pathname: '/tracking', params: { orderId: n.orderId } });
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Notifications" back="arrow" onBack={() => router.back()} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: headerOffset + 16, paddingBottom: Math.max(insets.bottom, 24) + 24 }}
                showsVerticalScrollIndicator={false}
            >
                {!user ? (
                    <EmptyState
                        icon={Bell}
                        title="Connectez-vous"
                        message="Connectez-vous pour suivre l’état de vos commandes en temps réel."
                        action={<Button label="Se connecter" onPress={() => router.push('/login')} />}
                        className="py-16"
                    />
                ) : items.length === 0 ? (
                    <EmptyState icon={Bell} title="Aucune notification" message="Les mises à jour de vos commandes apparaîtront ici." className="py-16" />
                ) : (
                    <View className="" style={{ gap: 12 }}>
                        {items.map((n) => {
                            const meta = statusMeta(n.status);
                            const Icon = STEP_ICON[n.status as OrderStatus] ?? STEP_ICON.PENDING;
                            return (
                                <Pressable
                                    key={n.id}
                                    onPress={() => openNotification(n)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${n.title}. ${n.body}${n.read ? '' : '. Non lue'}`}
                                    className="active:scale-[0.99]"
                                >
                                    <Card className="flex-row items-start p-4" style={{ gap: 16 }}>
                                        <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: meta.tint }}>
                                            <Icon color={meta.color} size={20} strokeWidth={2} />
                                        </View>
                                        <View className="flex-1">
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-body font-heading text-ink flex-1 pr-2" numberOfLines={1}>{n.title}</Text>
                                                {!n.read && <View className="w-2 h-2 rounded-full bg-accent" />}
                                            </View>
                                            <TypeText tone="secondary" className="mt-1">{n.body}</TypeText>
                                            <TypeText variant="eyebrow" tone="tertiary" className="mt-2 normal-case">{relativeTime(n.createdAt)}</TypeText>
                                        </View>
                                    </Card>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

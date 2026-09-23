import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Package } from 'lucide-react-native';

import { useAuthStore } from '../../src/store/authStore';
import { useUserOrders } from '../../src/data/orders';
import type { CustomerOrder } from '../../src/data/types';
import { OrderRefreshError } from '../../src/components/OrderRefreshError';
import { statusMeta, timestampMs, type OrderStatus } from '../../src/lib/orderStatus';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { Button, Card, EmptyState, TypeText, SCREEN_GUTTER } from '../../src/components/ui';
import { formatXaf } from '../../src/lib/pricing';
import { COLORS } from '../../src/lib/palette';
import { STEP_ICON } from './tracking';

function OrderRow({ order }: { order: CustomerOrder }) {
    const meta = statusMeta(order.status);
    const StatusIcon = STEP_ICON[order.status as OrderStatus] ?? Package;
    const placedAt = timestampMs(order.created_at);
    const date = placedAt ? new Date(placedAt) : null;
    const formattedDate = date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const formattedTime = date ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    const count = order.order_items?.length ?? 0;
    const reference = order.id.slice(0, 8).toUpperCase();
    const name = order.restaurant_name || order.restaurants?.name || `Commande #${reference}`;

    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/tracking', params: { orderId: order.id } });
            }}
            accessibilityRole="button"
            accessibilityLabel={`${name}, ${meta.label}, ${formatXaf(order.total_xaf ?? 0)}, ${formattedDate}`}
            className="active:scale-[0.99]"
        >
            <Card className="p-5">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center flex-1 pr-3" style={{ gap: 8 }}>
                        <TypeText variant="caption" tone="tertiary">{formattedDate || '—'}</TypeText>
                        {formattedTime ? (
                            <>
                                <View className="w-1 h-1 bg-ink-disabled rounded-full" />
                                <TypeText variant="caption" tone="tertiary">{formattedTime}</TypeText>
                            </>
                        ) : null}
                    </View>
                    <View className="flex-row items-center px-3 rounded-full" style={{ gap: 8, backgroundColor: meta.tint, height: 28 }}>
                        <StatusIcon color={meta.color} size={14} strokeWidth={2.2} />
                        <Text className="text-eyebrow font-label uppercase tracking-eyebrow" style={{ color: meta.color }}>{meta.label}</Text>
                    </View>
                </View>

                <View className="flex-row justify-between items-center" style={{ gap: 16 }}>
                    <View className="flex-1">
                        <TypeText variant="h3" numberOfLines={1}>{name}</TypeText>
                        <TypeText variant="caption" tone="tertiary" className="mt-1">
                            {count} article{count > 1 ? 's' : ''} · #{reference}
                        </TypeText>
                    </View>
                    <Text className="text-h3 font-title tracking-tight text-ink">{formatXaf(order.total_xaf ?? 0)}</Text>
                </View>
            </Card>
        </Pressable>
    );
}

export default function OrdersScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const user = useAuthStore(state => state.user);
    const { data: orders, isLoading, isError, isFetching, refetch } = useUserOrders(user?.id);

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Mes commandes" back="arrow" onBack={() => router.back()} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: SCREEN_GUTTER,
                    paddingTop: headerOffset + 16,
                    paddingBottom: Math.max(insets.bottom, 24) + 24,
                }}
                showsVerticalScrollIndicator={false}
            >
                {user && isError ? <OrderRefreshError busy={isFetching} retry={() => { void refetch(); }} /> : null}
                {!user ? (
                    <EmptyState
                        icon={Package}
                        title="Connectez-vous"
                        message="Connectez-vous pour retrouver vos commandes."
                        action={<Button label="Se connecter" onPress={() => router.push('/login')} />}
                        className="py-16"
                    />
                ) : isLoading ? (
                    <View className="py-20 items-center">
                        <ActivityIndicator size="large" color={COLORS.ink} />
                    </View>
                ) : isError && !orders?.length ? null : !orders || orders.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="Aucune commande"
                        message="Vous n’avez pas encore passé de commande."
                        action={<Button label="Commander" onPress={() => router.replace('/home')} />}
                        className="py-16"
                    />
                ) : (
                    <View className="" style={{ gap: 16 }}>
                        {orders.map((order) => <OrderRow key={order.id} order={order} />)}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

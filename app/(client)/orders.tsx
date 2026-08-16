import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Package, Clock, CheckCircle2, XCircle, ChefHat, Truck, type LucideIcon } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useUserOrders } from '../../src/data/orders';
import { statusMeta, type OrderStatus } from '../../src/lib/orderStatus';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { formatXaf as formatPrice } from '../../src/lib/pricing';

// Icons stay a UI concern; labels/colours come from the canonical status module
// (they had drifted between screens before it existed).
const STATUS_ICON: Record<OrderStatus, LucideIcon> = {
    PENDING: Clock,
    ACCEPTED: CheckCircle2,
    PREPARING: ChefHat,
    READY: Package,
    OUT_FOR_DELIVERY: Truck,
    DELIVERED: CheckCircle2,
    CANCELLED: XCircle,
};

export default function OrdersScreen() {
    const headerOffset = useHeaderOffset();
    const user = useAuthStore(state => state.user);
    const { data: orders, isLoading } = useUserOrders(user?.id);

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Mes Commandes" back="arrow" onBack={() => router.back()} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: headerOffset + 12,
                    paddingBottom: 40,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="px-6 pb-10">
                    {!user ? (
                        <View className="py-20 items-center">
                            <Package color="#ccc" size={48} />
                            <Text className="text-h3 font-title text-ink mt-6">Connectez-vous</Text>
                            <Text className="text-body text-ink-muted text-center font-body mt-2">Connectez-vous pour voir vos commandes.</Text>
                            <Pressable
                                onPress={() => router.push('/login')}
                                className="bg-accent px-8 py-4 rounded-full mt-8 active:scale-95"
                            >
                                <Text className="text-white text-caption font-labelbold">Se connecter</Text>
                            </Pressable>
                        </View>
                    ) : isLoading ? (
                        <View className="py-20 items-center">
                            <ActivityIndicator size="large" color="#FF5733" />
                        </View>
                    ) : !orders || orders.length === 0 ? (
                        <View className="py-20 items-center">
                            <Package color="#ccc" size={48} />
                            <Text className="text-h3 font-title text-ink mt-6">Aucune commande</Text>
                            <Text className="text-body text-ink-muted text-center font-body mt-2">Vous n'avez pas encore passé de commande.</Text>
                            <Pressable
                                onPress={() => router.replace('/home')}
                                className="bg-accent px-8 py-4 rounded-full mt-8 active:scale-95"
                            >
                                <Text className="text-white text-caption font-labelbold">Commander</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View className="gap-4 mt-4">
                            {orders.map((order: any) => {
                                const meta = statusMeta(order.status);
                                const StatusIcon = STATUS_ICON[order.status as OrderStatus] ?? Clock;
                                const date = new Date(order.created_at);
                                const formattedDate = date.toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                });
                                const formattedTime = date.toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                });

                                return (
                                    <Pressable
                                        key={order.id}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            router.push({ pathname: '/tracking', params: { orderId: order.id } });
                                        }}
                                        className="bg-white rounded-panel p-5 border border-hairline active:scale-[0.99]"
                                       
                                    >
                                        <View className="flex-row items-center justify-between mb-4">
                                            <View className="flex-row items-center gap-2">
                                                <Text className="text-caption font-label text-ink-faint">{formattedDate}</Text>
                                                <View className="w-1 h-1 bg-ink-disabled rounded-full" />
                                                <Text className="text-caption font-label text-ink-faint">{formattedTime}</Text>
                                            </View>
                                            <View
                                                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
                                                style={{ backgroundColor: meta.tint }}
                                            >
                                                <StatusIcon color={meta.color} size={12} />
                                                <Text
                                                    className="text-eyebrow font-label uppercase tracking-[0.08em]"
                                                    style={{ color: meta.color }}
                                                >{meta.label}</Text>
                                            </View>
                                        </View>

                                        <View className="flex-row justify-between items-center">
                                            <View>
                                                <Text className="text-body font-heading text-ink">
                                                    {order.restaurants?.name || `Commande #${order.id.slice(0, 8).toUpperCase()}`}
                                                </Text>
                                                <Text className="text-caption text-ink-faint font-body mt-1">
                                                    {(order as any).order_items?.length ?? 0} article(s) • #{order.id.slice(0, 8).toUpperCase()}
                                                </Text>
                                            </View>
                                            <Text className="text-h3 font-title tracking-tight text-ink">
                                                {formatPrice(order.total_xaf ?? 0)}
                                            </Text>
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

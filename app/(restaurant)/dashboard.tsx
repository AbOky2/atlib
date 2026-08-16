import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, Linking, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Button } from "../../src/components/ui/Button";
import { Clock, Phone, Coins, MapPin, MessageSquare, Power, ClipboardList, UtensilsCrossed } from "lucide-react-native";
import {
    useRestaurantOrders,
    useMyRestaurantId,
    useRestaurant,
    updateOrderStatus,
    setRestaurantAcceptingOrders,
    ORDER_ERRORS,
    AVAILABILITY_ERRORS } from "../../src/hooks/useSupabase";
import { statusMeta, isOrderStatus, isLive, type OrderStatus } from "../../src/lib/orderStatus";
import { isAcceptingOrders } from "../../src/lib/availability";
import { changeToGive } from "../../src/lib/cash";
import { formatXaf } from "../../src/lib/pricing";
import { useNewOrderAlert } from "../../src/hooks/useNewOrderAlert";
import { MenuManager } from "../../src/components/MenuManager";
import { useCartStore } from "../../src/store/cartStore";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from 'expo-haptics';

/** Next legal step for each status, with the label the kitchen actually uses. */
const NEXT_ACTION: Partial<Record<OrderStatus, { to: OrderStatus; label: string; tone: 'brand' | 'light' | 'done' }>> = {
    PENDING: { to: 'ACCEPTED', label: 'Accepter', tone: 'brand' },
    ACCEPTED: { to: 'PREPARING', label: 'Commencer la préparation', tone: 'brand' },
    PREPARING: { to: 'READY', label: 'Marquer prête', tone: 'light' },
    READY: { to: 'OUT_FOR_DELIVERY', label: 'Partir en livraison', tone: 'light' },
    OUT_FOR_DELIVERY: { to: 'DELIVERED', label: 'Marquer livrée', tone: 'done' },
};

const TONE_CLASS = {
    brand: 'bg-accent',
    light: 'bg-white',
    done: 'bg-green-600',
} as const;

export default function RestaurantDashboard() {
    // The restaurant id comes from the `my_restaurant_id()` RPC — orders are keyed by
    // restaurant_id (a restaurants.id), NOT the auth user id, so filtering by user.id
    // showed nothing and broke sync with the client tracking screen.
    const { data: restaurantId } = useMyRestaurantId();
    const { data: orders, isLoading, refetch } = useRestaurantOrders(restaurantId ?? undefined);
    const { data: restaurant } = useRestaurant(restaurantId ?? '');
    const queryClient = useQueryClient();
    const showToast = useCartStore((s) => s.showToast);
    const [refreshing, setRefreshing] = useState(false);
    const [togglingOpen, setTogglingOpen] = useState(false);
    const [tab, setTab] = useState<'orders' | 'menu'>('orders');

    // Dark screen — the root StatusBar is dark-on-light and would be invisible here.
    useFocusEffect(
        useCallback(() => {
            setStatusBarStyle('light');
            return () => setStatusBarStyle('dark');
        }, []),
    );

    // A silent dashboard loses orders: ring on every new one, keep nagging until accepted.
    useNewOrderAlert(orders as any);

    // Orders that still need the kitchen's attention come first, oldest at the top —
    // the one that has been waiting longest is the one at risk.
    const { queue, history } = useMemo(() => {
        const all = (orders ?? []) as any[];
        const live = all
            .filter((o) => isLive(o.status))
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const done = all.filter((o) => !isLive(o.status));
        return { queue: live, history: done };
    }, [orders]);

    const pendingCount = queue.filter((o) => o.status === 'PENDING').length;
    const open = isAcceptingOrders(restaurant);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleUpdateStatus = async (order: any, newStatus: OrderStatus) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Optimistic update so the admin UI reflects the change instantly.
            queryClient.setQueryData(['restaurant-orders', restaurantId], (old: any) =>
                Array.isArray(old) ? old.map((o: any) => (o.id === order.id ? { ...o, status: newStatus } : o)) : old,
            );
            // Conditional update through the state machine: rejected with
            // STATUS_CONFLICT if the order moved concurrently (e.g. cancelled).
            await updateOrderStatus(order.id, newStatus, isOrderStatus(order.status) ? order.status : undefined);
            await queryClient.invalidateQueries({ queryKey: ['restaurant-orders', restaurantId] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            if (error?.message === ORDER_ERRORS.STATUS_CONFLICT) {
                showToast('Cette commande a changé entre-temps — liste réactualisée.', 'info');
            } else {
                console.error("Erreur lors de la mise à jour :", error);
                showToast("La mise à jour a échoué. Réessayez.", 'error');
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            queryClient.invalidateQueries({ queryKey: ['restaurant-orders', restaurantId] });
        }
    };

    const handleToggleOpen = async () => {
        if (!restaurantId || togglingOpen) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTogglingOpen(true);
        try {
            await setRestaurantAcceptingOrders(restaurantId, !open);
            await queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
            await queryClient.invalidateQueries({ queryKey: ['restaurants'] });
            showToast(open ? 'Vous ne recevez plus de commandes.' : 'Vous recevez de nouveau des commandes.', 'success');
        } catch (error: any) {
            if (error?.message === AVAILABILITY_ERRORS.COLUMN_MISSING) {
                showToast("Fonction indisponible : la migration SQL n'est pas encore déployée.", 'error');
            } else {
                showToast("Impossible de changer l'état. Réessayez.", 'error');
            }
        } finally {
            setTogglingOpen(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#0a0a0a]">
            <View className="px-6 py-6 border-b border-ink">
                <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-4">
                        <Text className="font-display text-h1 text-white tracking-tighter">Tableau de bord</Text>
                        <Text className="font-body text-white/60 mt-1">
                            {pendingCount > 0
                                ? `${pendingCount} commande${pendingCount > 1 ? 's' : ''} à confirmer`
                                : 'Aucune commande en attente'}
                        </Text>
                    </View>

                    {/* Open / closed — the switch that stops orders arriving into an empty kitchen */}
                    <Pressable
                        onPress={handleToggleOpen}
                        disabled={togglingOpen}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: open }}
                        accessibilityLabel={open ? 'Fermer les commandes' : 'Ouvrir les commandes'}
                        className="px-4 h-11 rounded-full flex-row items-center gap-2 active:scale-95"
                        style={{ backgroundColor: open ? 'rgba(34,197,94,0.16)' : 'rgba(255,255,255,0.08)', opacity: togglingOpen ? 0.6 : 1 }}
                    >
                        <Power color={open ? '#22c55e' : '#a1a1aa'} size={15} strokeWidth={2.5} />
                        <Text className="font-labelbold text-caption" style={{ color: open ? '#22c55e' : '#a1a1aa' }}>
                            {open ? 'Ouvert' : 'Fermé'}
                        </Text>
                    </Pressable>
                </View>

                {/* Commandes ⇄ Menu */}
                <View className="flex-row bg-white/[0.06] rounded-card p-1 mt-5">
                    {([
                        { id: 'orders' as const, label: 'Commandes', Icon: ClipboardList },
                        { id: 'menu' as const, label: 'Menu', Icon: UtensilsCrossed },
                    ]).map(({ id, label, Icon }) => {
                        const selected = tab === id;
                        return (
                            <Pressable
                                key={id}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTab(id);
                                }}
                                accessibilityRole="tab"
                                accessibilityState={{ selected }}
                                className={`flex-1 h-10 rounded-chip items-center justify-center flex-row gap-2 ${
                                    selected ? 'bg-white/[0.12]' : ''
                                }`}
                            >
                                <Icon color={selected ? '#ffffff' : '#6b6b70'} size={15} />
                                <Text className={`text-label font-labelbold ${selected ? 'text-white' : 'text-white/40'}`}>
                                    {label}
                                </Text>
                                {id === 'orders' && pendingCount > 0 && (
                                    <View className="bg-accent rounded-full px-1.5 min-w-[18px] h-[18px] items-center justify-center">
                                        <Text className="text-white text-eyebrow font-labelbold">{pendingCount}</Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {tab === 'menu' ? (
                <View className="flex-1 mt-6">
                    <MenuManager restaurantId={restaurantId ?? undefined} />
                </View>
            ) : isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#FF5733" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-6 mt-6"
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5733" />}
                >
                    {queue.length === 0 && history.length === 0 ? (
                        <View className="items-center justify-center mt-20">
                            <Clock color="#444" size={48} />
                            <Text className="text-white font-title text-h3 mt-4">Aucune commande</Text>
                            <Text className="text-white/60 font-body text-center mt-2">Les nouvelles commandes apparaîtront ici.</Text>
                        </View>
                    ) : (
                        <>
                            {queue.map((order) => (
                                <OrderCard key={order.id} order={order} onAdvance={handleUpdateStatus} />
                            ))}

                            {history.length > 0 && (
                                <>
                                    <Text className="font-label text-eyebrow uppercase tracking-[0.12em] text-white/40 mt-4 mb-4">
                                        Terminées
                                    </Text>
                                    {history.map((order) => (
                                        <OrderCard key={order.id} order={order} onAdvance={handleUpdateStatus} muted />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

function OrderCard({
    order,
    onAdvance,
    muted = false,
}: {
    order: any;
    onAdvance: (order: any, next: OrderStatus) => void;
    muted?: boolean;
}) {
    const meta = statusMeta(order.status);
    const action = NEXT_ACTION[order.status as OrderStatus];
    const change = changeToGive(order.total_xaf ?? 0, order.cash_paid_with_xaf);
    const waitingMins = Math.max(0, Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000));
    const urgent = order.status === 'PENDING';

    return (
        <View
            className="bg-ink rounded-panel p-6 mb-5"
            style={{
                opacity: muted ? 0.55 : 1,
                borderWidth: urgent ? 1.5 : 1,
                borderColor: urgent ? '#FF5733' : 'rgba(255,255,255,0.05)',
            }}
        >
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-3">
                    <Text className="font-title text-h3 text-white tracking-tight">
                        Commande #{order.id.slice(0, 5).toUpperCase()}
                    </Text>
                    <View className="px-2 py-1 rounded-chip self-start mt-2" style={{ backgroundColor: meta.tint }}>
                        <Text
                            className="text-eyebrow font-labelbold uppercase tracking-[0.08em]"
                            style={{ color: meta.color }}
                        >{meta.label}</Text>
                    </View>
                </View>
                <View className="items-end">
                    <Text className="font-label text-caption text-white/60">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isLive(order.status) && (
                        <Text
                            className="font-labelbold text-eyebrow mt-1"
                            style={{ color: urgent && waitingMins >= 5 ? '#FF5733' : '#6b6b70' }}
                        >
                            depuis {waitingMins} min
                        </Text>
                    )}
                </View>
            </View>

            <View className="mb-5 bg-black/40 p-4 rounded-card border border-white/5">
                {/* Customer + tap-to-call: the last 200 metres are closed by phone here */}
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-1 pr-3">
                        <Text className="font-body text-white/60 text-body">Client</Text>
                        <Text className="text-white font-labelbold text-bodylg">{order.customer_name}</Text>
                    </View>
                    {order.customer_phone ? (
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                Linking.openURL(`tel:${order.customer_phone}`).catch(() => {});
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Appeler ${order.customer_name}`}
                            className="px-4 h-10 rounded-full bg-accent flex-row items-center gap-2 active:scale-95"
                        >
                            <Phone color="#fff" size={14} />
                            <Text className="text-white font-labelbold text-caption">{order.customer_phone}</Text>
                        </Pressable>
                    ) : null}
                </View>

                <View className="h-px bg-white/10 w-full mb-3" />

                {/* Where, and how to find it */}
                <View className="flex-row items-start gap-2.5 mb-1">
                    <MapPin color="#6b6b70" size={14} style={{ marginTop: 2 }} />
                    <Text className="flex-1 font-body text-white/60 text-body leading-relaxed">
                        {order.delivery_address || order.delivery_zone || 'Adresse non précisée'}
                    </Text>
                </View>
                {order.delivery_note ? (
                    <View className="flex-row items-start gap-2.5 mb-3">
                        <MessageSquare color="#6b6b70" size={14} style={{ marginTop: 2 }} />
                        <Text className="flex-1 font-body text-white/80 text-body leading-relaxed">
                            {order.delivery_note}
                        </Text>
                    </View>
                ) : null}

                <View className="h-px bg-white/10 w-full my-3" />

                {order.order_items?.map((item: any) => (
                    <Text key={item.id} className="font-body text-white text-body">
                        {item.qty}x <Text className="text-white/60">{item.name}</Text>
                    </Text>
                ))}

                <View className="h-px bg-white/10 w-full my-3" />

                <View className="flex-row items-center justify-between">
                    <Text className="font-body text-white/60 text-body">Total à encaisser</Text>
                    <Text className="text-white font-title text-h3">{formatXaf(order.total_xaf ?? 0)}</Text>
                </View>

                {/* The change to prepare BEFORE leaving — the doorstep argument, avoided */}
                {change != null && change > 0 ? (
                    <View className="flex-row items-center gap-2.5 mt-3 pt-3 border-t border-white/10">
                        <Coins color="#FF5733" size={15} />
                        <Text className="flex-1 font-body text-white/60 text-body">
                            Paie avec {formatXaf(order.cash_paid_with_xaf)} · à rendre
                        </Text>
                        <Text className="text-accent font-title text-bodylg">{formatXaf(change)}</Text>
                    </View>
                ) : order.cash_paid_with_xaf == null && isLive(order.status) ? (
                    <View className="flex-row items-center gap-2.5 mt-3 pt-3 border-t border-white/10">
                        <Coins color="#6b6b70" size={15} />
                        <Text className="flex-1 font-body text-white/40 text-body">Le client aura l'appoint</Text>
                    </View>
                ) : null}
            </View>

            {action && (
                <View className="flex-row gap-3">
                    <Button
                        label={action.label}
                        className={`flex-1 ${TONE_CLASS[action.tone]}`}
                        onPress={() => onAdvance(order, action.to)}
                    />
                </View>
            )}
        </View>
    );
}

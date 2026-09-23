import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Clock, Phone, Coins, MapPin, MessageSquare, Power, ClipboardList, UtensilsCrossed } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { COLORS } from '../../src/lib/palette';
import { OrderRefreshError } from '../../src/components/OrderRefreshError';
import { Button, EmptyState, TypeText, SCREEN_GUTTER } from '../../src/components/ui';
import { ChoiceSheet } from '../../src/components/ChoiceSheet';
import type { RestaurantOrder } from '../../src/data/types';
import { useRestaurant } from '../../src/data/catalogue';
import { updateOrderStatus, ORDER_ERRORS } from '../../src/data/orders';
import {
    useRestaurantOrders,
    useMyRestaurantId,
    setRestaurantAcceptingOrders,
    AVAILABILITY_ERRORS,
} from '../../src/data/restaurantAdmin';
import {
    statusMeta, isOrderStatus, isLive, timestampMs, canTransition,
    CANCELLATION_COPY, RESTAURANT_CANCELLATION_REASONS, cancellationMessage,
    type OrderStatus, type CancellationReason } from '../../src/lib/orderStatus';
import { isAcceptingOrders } from '../../src/lib/availability';
import { changeToGive } from '../../src/lib/cash';
import { formatXaf } from '../../src/lib/pricing';
import { useNewOrderAlert } from '../../src/hooks/useNewOrderAlert';
import { MenuManager } from '../../src/components/MenuManager';
import { useCartStore } from '../../src/store/cartStore';

/** Next legal step for each status, with the label the kitchen actually uses. */
const NEXT_ACTION: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
    PENDING: { to: 'ACCEPTED', label: 'Accepter' },
    ACCEPTED: { to: 'PREPARING', label: 'Commencer la préparation' },
    PREPARING: { to: 'READY', label: 'Marquer prête' },
    READY: { to: 'OUT_FOR_DELIVERY', label: 'Partir en livraison' },
    OUT_FOR_DELIVERY: { to: 'DELIVERED', label: 'Marquer livrée' },
};

const CANCEL_OPTIONS = RESTAURANT_CANCELLATION_REASONS.map((key) => ({ key, label: CANCELLATION_COPY[key].label, hint: CANCELLATION_COPY[key].customer }));

/** Wall clock refreshed every 30 s so « depuis X min » keeps counting. */
function useNow(intervalMs: number) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);
    return now;
}

export default function RestaurantDashboard() {
    // The restaurant id comes from the `my_restaurant_id()` RPC — orders are keyed by
    // restaurant_id (a restaurants.id), NOT the auth user id.
    const { data: restaurantId } = useMyRestaurantId();
    const { data: orders, isLoading, isError, isFetching, refetch } = useRestaurantOrders(restaurantId ?? undefined);
    const { data: restaurant } = useRestaurant(restaurantId ?? '');
    const queryClient = useQueryClient();
    const showToast = useCartStore((s) => s.showToast);
    const [refreshing, setRefreshing] = useState(false);
    const [togglingOpen, setTogglingOpen] = useState(false);
    const [tab, setTab] = useState<'orders' | 'menu'>('orders');
    // One mutation at a time per order: a double tap must not produce a false conflict.
    const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<RestaurantOrder | null>(null);
    const [cancelReason, setCancelReason] = useState<CancellationReason | null>(null);
    const now = useNow(30_000);

    // Dark screen — the root StatusBar is dark-on-light and would be invisible here.
    useFocusEffect(
        useCallback(() => {
            setStatusBarStyle('light');
            return () => setStatusBarStyle('dark');
        }, []),
    );

    // A silent dashboard loses orders: ring on every new one, keep nagging until accepted.
    useNewOrderAlert(orders);

    // Orders that still need the kitchen's attention come first, oldest at the top —
    // the one that has been waiting longest is the one at risk.
    const { queue, history } = useMemo(() => {
        const all = orders ?? [];
        const live = all
            .filter((o) => isLive(o.status))
            .sort((a, b) => (timestampMs(a.created_at) ?? 0) - (timestampMs(b.created_at) ?? 0));
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

    const transition = async (order: RestaurantOrder, newStatus: OrderStatus, reason?: CancellationReason) => {
        if (busyOrderId) return;
        setBusyOrderId(order.id);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Optimistic update so the kitchen UI reflects the change instantly.
            queryClient.setQueryData<RestaurantOrder[]>(['restaurant-orders', restaurantId], (old) =>
                old?.map((o) => (o.id === order.id ? { ...o, status: newStatus, cancellation_reason: reason ?? o.cancellation_reason } : o)),
            );
            // Conditional update through the state machine: rejected with
            // STATUS_CONFLICT if the order moved concurrently (e.g. cancelled).
            await updateOrderStatus(order.id, newStatus, isOrderStatus(order.status) ? order.status : undefined, reason);
            await queryClient.invalidateQueries({ queryKey: ['restaurant-orders', restaurantId] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            if (error?.message === ORDER_ERRORS.STATUS_CONFLICT) {
                showToast('Cette commande a changé entre-temps. Liste réactualisée.', 'info');
            } else {
                console.error('Erreur lors de la mise à jour :', error);
                showToast('La mise à jour a échoué. Réessayez.', 'error');
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            void queryClient.invalidateQueries({ queryKey: ['restaurant-orders', restaurantId] });
        } finally {
            setBusyOrderId(null);
        }
    };

    const confirmCancel = async () => {
        if (!cancelling || !cancelReason) return;
        const order = cancelling;
        setCancelling(null);
        await transition(order, 'CANCELLED', cancelReason);
        setCancelReason(null);
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
        <SafeAreaView className="flex-1 bg-ink-900">
            <View className="px-6 py-6 border-b border-hairline-dark">
                <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-4">
                        <Text className="font-display text-h1 text-on-dark tracking-tighter">Tableau de bord</Text>
                        <TypeText tone="onDarkMuted" className="mt-1">
                            {pendingCount > 0
                                ? `${pendingCount} commande${pendingCount > 1 ? 's' : ''} à confirmer`
                                : 'Aucune commande en attente'}
                        </TypeText>
                    </View>

                    {/* Open / closed — the switch that stops orders arriving into an empty kitchen */}
                    <Pressable
                        onPress={handleToggleOpen}
                        disabled={togglingOpen}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: open, disabled: togglingOpen }}
                        accessibilityLabel={open ? 'Fermer les commandes' : 'Ouvrir les commandes'}
                        className={`px-4 rounded-full flex-row items-center gap-2 active:scale-95 ${open ? 'bg-success' : 'bg-fill-dark-strong'}`}
                        style={{ height: 44, opacity: togglingOpen ? 0.6 : 1 }}
                    >
                        <Power color={open ? COLORS.white : COLORS.onDarkMuted} size={16} strokeWidth={2.4} />
                        <Text className={`font-labelbold text-label ${open ? 'text-on-dark' : 'text-on-dark-muted'}`}>
                            {open ? 'Ouvert' : 'Fermé'}
                        </Text>
                    </Pressable>
                </View>

                {/* Commandes ⇄ Menu */}
                <View className="flex-row bg-fill-dark rounded-card p-1 mt-5">
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
                                className={`flex-1 h-11 rounded-chip items-center justify-center flex-row gap-2 ${selected ? 'bg-fill-dark-strong' : ''}`}
                            >
                                <Icon color={selected ? COLORS.white : COLORS.onDarkFaint} size={16} strokeWidth={2} />
                                <Text className={`text-label font-labelbold ${selected ? 'text-on-dark' : 'text-on-dark-faint'}`}>
                                    {label}
                                </Text>
                                {id === 'orders' && pendingCount > 0 && (
                                    <View className="bg-accent rounded-full items-center justify-center px-2" style={{ minWidth: 20, height: 20 }}>
                                        <Text className="text-ink text-eyebrow font-labelbold">{pendingCount}</Text>
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
                    <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 24, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
                >
                    {isError ? <OrderRefreshError busy={isFetching} retry={() => { void refetch(); }} /> : null}
                    {!isError && queue.length === 0 && history.length === 0 ? (
                        <EmptyState
                            tone="dark"
                            icon={Clock}
                            title="Aucune commande"
                            message="Les nouvelles commandes apparaîtront ici, avec une alerte sonore."
                            className="mt-16"
                        />
                    ) : (
                        <>
                            {queue.map((order) => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    now={now}
                                    busy={busyOrderId === order.id}
                                    onAdvance={(o, to) => { void transition(o, to); }}
                                    onCancel={(o) => { setCancelReason(null); setCancelling(o); }}
                                />
                            ))}

                            {history.length > 0 && (
                                <>
                                    <TypeText variant="eyebrow" tone="onDarkFaint" className="mt-4 mb-4">Terminées</TypeText>
                                    {history.map((order) => (
                                        <OrderCard key={order.id} order={order} now={now} busy={false} onAdvance={() => {}} onCancel={() => {}} muted />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>
            )}

            <ChoiceSheet
                visible={!!cancelling}
                title="Annuler cette commande ?"
                message="Le client sera prévenu immédiatement avec le motif choisi."
                options={CANCEL_OPTIONS}
                selected={cancelReason}
                confirmLabel="Annuler la commande"
                destructive
                onSelect={setCancelReason}
                onConfirm={() => { void confirmCancel(); }}
                onClose={() => { setCancelling(null); setCancelReason(null); }}
            />
        </SafeAreaView>
    );
}

function OrderCard({
    order,
    now,
    busy,
    onAdvance,
    onCancel,
    muted = false,
}: {
    order: RestaurantOrder;
    now: number;
    busy: boolean;
    onAdvance: (order: RestaurantOrder, next: OrderStatus) => void;
    onCancel: (order: RestaurantOrder) => void;
    muted?: boolean;
}) {
    const meta = statusMeta(order.status);
    const action = NEXT_ACTION[order.status as OrderStatus];
    const canCancel = isOrderStatus(order.status) && canTransition(order.status, 'CANCELLED');
    const change = changeToGive(order.total_xaf ?? 0, order.cash_paid_with_xaf);
    const placedAt = timestampMs(order.created_at);
    const waitingMins = placedAt ? Math.max(0, Math.round((now - placedAt) / 60_000)) : 0;
    const urgent = order.status === 'PENDING';

    return (
        <View
            className="bg-ink-800 rounded-panel p-5 mb-4"
            style={{
                opacity: muted ? 0.6 : 1,
                borderWidth: urgent ? 2 : 1,
                borderColor: urgent ? COLORS.accent : COLORS.hairlineDark,
            }}
        >
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-3">
                    <Text className="font-title text-h3 text-on-dark tracking-tight">
                        Commande #{order.id.slice(0, 5).toUpperCase()}
                    </Text>
                    <View className="px-2 py-1 rounded-chip self-start mt-2" style={{ backgroundColor: meta.tint }}>
                        <Text className="text-eyebrow font-labelbold uppercase tracking-eyebrow" style={{ color: meta.color }}>{meta.label}</Text>
                    </View>
                    {order.status === 'CANCELLED' ? (
                        <TypeText variant="caption" tone="onDarkMuted" className="mt-2">{cancellationMessage(order.cancellation_reason)}</TypeText>
                    ) : null}
                </View>
                <View className="items-end">
                    <Text className="font-label text-caption text-on-dark-muted">
                        {placedAt ? new Date(placedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </Text>
                    {isLive(order.status) && (
                        <Text className={`font-labelbold text-eyebrow mt-1 ${urgent && waitingMins >= 5 ? 'text-accent' : 'text-on-dark-faint'}`}>
                            depuis {waitingMins} min
                        </Text>
                    )}
                </View>
            </View>

            <View className="mb-4 bg-ink-900 p-4 rounded-card border border-hairline-dark">
                {/* Customer + tap-to-call: the last 200 metres are closed by phone here */}
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-1 pr-3">
                        <TypeText variant="caption" tone="onDarkMuted">Client</TypeText>
                        <Text className="text-on-dark font-labelbold text-bodylg">{order.customer_name}</Text>
                    </View>
                    {order.customer_phone ? (
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                Linking.openURL(`tel:${order.customer_phone}`).catch(() => {});
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Appeler ${order.customer_name ?? 'le client'}`}
                            className="px-4 rounded-full bg-accent flex-row items-center gap-2 active:scale-95"
                            style={{ minHeight: 44 }}
                        >
                            <Phone color={COLORS.ink} size={16} strokeWidth={2} />
                            <Text className="text-ink font-labelbold text-label">{order.customer_phone}</Text>
                        </Pressable>
                    ) : null}
                </View>

                <View className="h-px bg-hairline-dark w-full mb-3" />

                {/* Where, and how to find it */}
                <View className="flex-row items-start gap-2 mb-1">
                    <MapPin color={COLORS.onDarkFaint} size={16} strokeWidth={2} style={{ marginTop: 3 }} />
                    <TypeText tone="onDarkMuted" className="flex-1">
                        {order.delivery_address || order.delivery_zone || 'Adresse non précisée'}
                    </TypeText>
                </View>
                {order.delivery_note ? (
                    <View className="flex-row items-start gap-2 mb-3">
                        <MessageSquare color={COLORS.onDarkFaint} size={16} strokeWidth={2} style={{ marginTop: 3 }} />
                        <TypeText tone="onDark" className="flex-1">{order.delivery_note}</TypeText>
                    </View>
                ) : null}

                <View className="h-px bg-hairline-dark w-full my-3" />

                {order.order_items?.map((item) => (
                    <Text key={item.id} className="font-body text-on-dark text-body">
                        {item.qty}× <Text className="text-on-dark-muted">{item.name}{item.note ? ` — ${item.note}` : ''}</Text>
                    </Text>
                ))}

                <View className="h-px bg-hairline-dark w-full my-3" />

                <View className="flex-row items-center justify-between">
                    <TypeText tone="onDarkMuted">Total à encaisser</TypeText>
                    <Text className="text-on-dark font-title text-h3">{formatXaf(order.total_xaf ?? 0)}</Text>
                </View>

                {/* The change to prepare BEFORE leaving — the doorstep argument, avoided */}
                {change != null && change > 0 ? (
                    <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-hairline-dark">
                        <Coins color={COLORS.accent} size={16} strokeWidth={2} />
                        <TypeText tone="onDarkMuted" className="flex-1">
                            Paie avec {formatXaf(order.cash_paid_with_xaf)} · à rendre
                        </TypeText>
                        <Text className="text-accent font-title text-bodylg">{formatXaf(change)}</Text>
                    </View>
                ) : order.cash_paid_with_xaf == null && isLive(order.status) ? (
                    <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-hairline-dark">
                        <Coins color={COLORS.onDarkFaint} size={16} strokeWidth={2} />
                        <TypeText tone="onDarkFaint" className="flex-1">Le client aura l'appoint</TypeText>
                    </View>
                ) : null}
            </View>

            {action || canCancel ? (
                <View className="gap-2">
                    {action ? (
                        <Button
                            label={action.label}
                            variant={urgent ? 'accent' : 'secondary'}
                            loading={busy}
                            onPress={() => onAdvance(order, action.to)}
                        />
                    ) : null}
                    {canCancel ? (
                        <Button
                            label={urgent ? 'Refuser' : 'Annuler la commande'}
                            variant="destructive"
                            size="control"
                            disabled={busy}
                            onPress={() => onCancel(order)}
                        />
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

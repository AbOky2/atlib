import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Platform, LayoutAnimation, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown, ChevronUp, Receipt, Package, UtensilsCrossed, MapPin, LifeBuoy, Bike, ChefHat, Home, Clock, X, Smartphone, type LucideIcon } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '../../src/store/authStore';
import { useCartStore } from '../../src/store/cartStore';
import { ORDER_ERRORS, updateOrderStatus, useUserOrders } from '../../src/data/orders';
import { findActiveOrder, statusIndex, statusMeta, STATUS_FLOW, STATUS_META, type OrderStatus } from '../../src/lib/orderStatus';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { getEstimatedDeliveryTime } from '../../src/lib/localities';
import { liveActivityRunning } from '../../src/lib/liveActivity';
import { arrivalTimeLabel } from '../../src/lib/eta';
import { formatXaf } from '../../src/lib/pricing';
import { shadowSoft } from '../../src/lib/elevation';
import { COLORS } from '../../src/lib/palette';

import { openSupportChat, SUPPORT_ORDER_MESSAGE } from '../../src/lib/support';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STEP_ICON: Record<OrderStatus, LucideIcon> = {
    PENDING: Receipt,
    ACCEPTED: Check,
    PREPARING: ChefHat,
    READY: Package,
    OUT_FOR_DELIVERY: Bike,
    DELIVERED: Home,
    CANCELLED: X,
};

/** Soft expanding ring used behind the live elements. */
function PulseRing({ size, color }: { size: number; color: string }) {
    const pulse = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        );
        loop.start();
        return () => loop.stop();
    }, [pulse]);
    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] }) }],
            }}
        />
    );
}

/** Status hero: a breathing brand disc + headline. No numbers — the Live
 *  Activity / Dynamic Island owns the ETA once the restaurant confirms. */
function StatusHero({ status }: { status: string }) {
    const meta = statusMeta(status);
    const cancelled = status === 'CANCELLED';
    const delivered = status === 'DELIVERED';
    const live = !cancelled && !delivered;
    const Icon = STEP_ICON[(status as OrderStatus)] ?? Clock;

    const discColor = cancelled ? '#ef4444' : delivered ? '#22c55e' : COLORS.accent;

    return (
        <View className="items-center pt-2 pb-8">
            <View className="items-center justify-center mb-5" style={{ width: 84, height: 84 }}>
                {live && <PulseRing size={72} color={COLORS.accent} />}
                <View
                    className="items-center justify-center rounded-full"
                    style={[{ width: 72, height: 72, backgroundColor: discColor }, shadowSoft]}
                >
                    <Icon color="#fff" size={30} strokeWidth={2.2} />
                </View>
            </View>
            <Text className="text-h1 font-display tracking-tight text-ink text-center">
                {cancelled ? 'Commande annulée' : meta.headline}
            </Text>
            <Text className="text-label font-body text-ink-muted text-center mt-1.5 px-8">
                {cancelled ? 'Aucun montant ne vous sera facturé.' : delivered ? 'Bon appétit ! 🎉' : meta.description}
            </Text>
        </View>
    );
}

/** One node of the vertical step tracker. */
function TimelineStep({
    status,
    state,
    last,
}: {
    status: OrderStatus;
    state: 'done' | 'current' | 'upcoming';
    last: boolean;
}) {
    const meta = STATUS_META[status];
    const Icon = STEP_ICON[status];
    const done = state === 'done';
    const current = state === 'current';

    return (
        <View className="flex-row">
            {/* Node + connector */}
            <View className="items-center" style={{ width: 44 }}>
                <View className="items-center justify-center" style={{ width: 36, height: 36 }}>
                    {current && <PulseRing size={36} color={COLORS.accent} />}
                    <View
                        className="items-center justify-center rounded-full"
                        style={{
                            width: 36,
                            height: 36,
                            backgroundColor: done ? COLORS.ink : current ? COLORS.accent : '#FFFFFF',
                            borderWidth: done || current ? 0 : 1.5,
                            borderColor: COLORS.hairline,
                        }}
                    >
                        {done ? (
                            <Check color="#fff" size={16} strokeWidth={2.8} />
                        ) : (
                            <Icon color={current ? '#fff' : COLORS.inkDisabled} size={16} strokeWidth={2.2} />
                        )}
                    </View>
                </View>
                {!last && (
                    <View
                        className="flex-1 rounded-full my-1"
                        style={{ width: 2.5, backgroundColor: done ? COLORS.ink : COLORS.hairline }}
                    />
                )}
            </View>

            {/* Copy */}
            <View className={`flex-1 pl-3 ${last ? '' : 'pb-7'}`} style={{ paddingTop: 6 }}>
                <Text
                    className={`text-body tracking-tight ${
                        current ? 'font-title text-ink' : done ? 'font-heading text-ink' : 'font-heading text-ink-disabled'
                    }`}
                >
                    {meta.headline}
                </Text>
                {(current || done) && (
                    <Text className={`text-label font-body mt-0.5 ${current ? 'text-ink-muted' : 'text-ink-faint'}`}>
                        {meta.description}
                    </Text>
                )}
            </View>
        </View>
    );
}

export default function TrackingScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const queryClient = useQueryClient();
    const [isOrderDetailsExpanded, setIsOrderDetailsExpanded] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [activityRunning, setActivityRunning] = useState(false);
    const user = useAuthStore(state => state.user);
    const showToast = useCartStore(state => state.showToast);
    const showDialog = useCartStore(state => state.showDialog);

    const { data: orders } = useUserOrders(user?.id);
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();

    // If a specific order was opened (e.g. from history), show it; otherwise the
    // first active order (or the most recent).
    const activeOrder = (orderId ? orders?.find(o => o.id === orderId) : undefined)
        || findActiveOrder(orders)
        || orders?.[0];

    const neighborhood = (activeOrder as any)?.delivery_zone || '';
    // Same computation the Live Activity uses, so the two can never disagree.
    const arrival = arrivalTimeLabel(
        activeOrder?.created_at,
        getEstimatedDeliveryTime(neighborhood || activeOrder?.delivery_address || '') || 15,
    );
    const index = activeOrder ? statusIndex(activeOrder.status) : 0;
    const cancelled = activeOrder?.status === 'CANCELLED';
    const delivered = activeOrder?.status === 'DELIVERED';
    const live = !!activeOrder && !cancelled && !delivered;

    // Re-check on every status change: the activity starts at confirmation and
    // ends when the order does.
    useEffect(() => {
        setActivityRunning(liveActivityRunning());
    }, [activeOrder?.status, activeOrder?.id]);

    // Let the timeline glide when the status advances (poll or realtime push).
    const prevIndex = useRef(index);
    useEffect(() => {
        if (prevIndex.current !== index) {
            LayoutAnimation.configureNext({
                duration: 420,
                update: { type: LayoutAnimation.Types.spring, springDamping: 0.85 },
            });
            if (index > prevIndex.current) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            prevIndex.current = index;
        }
    }, [index]);

    const items = useMemo(
        () =>
            activeOrder?.order_items?.map((oi: any) => ({
                id: oi.id,
                name: oi.name || 'Article',
                price: oi.price_xaf ?? 0,
                quantity: oi.qty ?? 1,
            })) ?? [],
        [activeOrder?.order_items],
    );

    const orderTotal = activeOrder ? (activeOrder.total_xaf ?? 0) : 0;

    const handleCancelOrder = () => {
        if (!activeOrder?.id || cancelling) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDialog({
            title: 'Annuler la commande ?',
            message: 'Cette action est définitive. Le restaurant ne préparera pas votre commande.',
            confirmText: 'Oui, annuler',
            cancelText: 'Garder ma commande',
            destructive: true,
            onConfirm: async () => {
                setCancelling(true);
                try {
                    // Conditional update: only succeeds while the order is still PENDING.
                    await updateOrderStatus(activeOrder.id, 'CANCELLED', 'PENDING');
                    await queryClient.invalidateQueries({ queryKey: ['orders', user?.id] });
                    showToast('Commande annulée avec succès', 'success');
                    router.replace('/home');
                } catch (error: any) {
                    if (error?.message === ORDER_ERRORS.STATUS_CONFLICT) {
                        showToast('Trop tard — le restaurant a déjà accepté votre commande.', 'error');
                        queryClient.invalidateQueries({ queryKey: ['orders', user?.id] });
                    } else {
                        showToast("Erreur lors de l'annulation", 'error');
                    }
                } finally {
                    setCancelling(false);
                }
            },
        });
    };

    if (!activeOrder) {
        return (
            <View className="flex-1 bg-background items-center justify-center px-8">
                <View className="w-20 h-20 bg-fill rounded-full items-center justify-center mb-5">
                    <Package color="#8d8a87" size={30} />
                </View>
                <Text className="text-h3 font-title text-ink">Aucune commande</Text>
                <Text className="text-body text-ink-muted font-body text-center mt-2 mb-7">
                    Votre prochaine commande apparaîtra ici, avec son suivi en direct.
                </Text>
                <Pressable
                    onPress={() => router.replace('/home')}
                    className="bg-ink px-8 py-4 rounded-full active:scale-95"
                >
                    <Text className="text-white text-caption font-labelbold">Commander</Text>
                </Pressable>
            </View>
        );
    }

    const stepState = (i: number): 'done' | 'current' | 'upcoming' => {
        if (delivered) return i <= index ? 'done' : 'upcoming';
        if (i < index) return 'done';
        if (i === index) return 'current';
        return 'upcoming';
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title="Suivi de commande"
                back="close"
                onBack={() => router.replace('/home')}
                right={
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            openSupportChat(SUPPORT_ORDER_MESSAGE);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Aide"
                        className="h-10 px-4 rounded-full bg-fill flex-row items-center gap-2 active:scale-95"
                    >
                        <LifeBuoy color="#1c1b1b" size={16} />
                        <Text className="text-caption font-labelbold text-ink">Aide</Text>
                    </Pressable>
                }
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: headerOffset + 16,
                    paddingBottom: insets.bottom + 60,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="px-6">
                    {/* Status hero */}
                    <StatusHero status={activeOrder.status} />

                    {/* Off iOS there is no Dynamic Island to own the ETA, so the
                        arrival time belongs here — otherwise those users would have
                        no time information anywhere in the product. */}
                    {live && Platform.OS !== 'ios' && index >= 1 && arrival && (
                        <View className="flex-row items-center gap-3 bg-fill rounded-card px-4 py-3.5 mb-6">
                            <View className="w-9 h-9 rounded-full bg-ink items-center justify-center">
                                <Clock color="#fff" size={16} />
                            </View>
                            <Text className="flex-1 text-label font-body text-ink-muted leading-snug">
                                Arrivée estimée vers <Text className="font-labelbold text-ink">{arrival}</Text>
                            </Text>
                        </View>
                    )}

                    {/* Live Activity hint — shown ONLY when one is really running,
                        so the app never claims a lock-screen tracker it doesn't have. */}
                    {live && Platform.OS === 'ios' && index >= 1 && activityRunning && (
                        <View className="flex-row items-center gap-3 bg-fill rounded-card px-4 py-3.5 mb-6">
                            <View className="w-9 h-9 rounded-full bg-ink items-center justify-center">
                                <Smartphone color="#fff" size={16} />
                            </View>
                            <Text className="flex-1 text-label font-body text-ink-muted leading-snug">
                                Temps estimé et progression en direct sur votre{' '}
                                <Text className="font-labelbold text-ink">écran verrouillé</Text> et la{' '}
                                <Text className="font-labelbold text-ink">Dynamic Island</Text>.
                            </Text>
                        </View>
                    )}

                    {/* Step tracker */}
                    {!cancelled && (
                        <View className="bg-white rounded-sheet border border-hairline p-6 mb-6" style={shadowSoft}>
                            <Text className="text-eyebrow font-label uppercase tracking-[0.08em] text-ink-faint mb-5">
                                Progression
                            </Text>
                            {STATUS_FLOW.map((status, i) => (
                                <TimelineStep
                                    key={status}
                                    status={status}
                                    state={stepState(i)}
                                    last={i === STATUS_FLOW.length - 1}
                                />
                            ))}
                        </View>
                    )}

                    {/* Route */}
                    <View className="bg-white rounded-sheet border border-hairline p-5 mb-6">
                        <View className="flex-row items-start gap-4 pb-4 border-b border-hairline">
                            <View className="w-10 h-10 rounded-full bg-fill items-center justify-center">
                                <UtensilsCrossed color="#1c1b1b" size={17} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-eyebrow uppercase tracking-[0.08em] text-ink-faint font-label">Restaurant</Text>
                                <Text className="text-body font-heading text-ink mt-0.5" numberOfLines={2}>
                                    {activeOrder.restaurant_name || 'Restaurant'}
                                </Text>
                                <Text className="text-eyebrow font-body text-ink-faint mt-0.5">
                                    Prépare et livre votre commande
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-start gap-4 pt-4">
                            <View className="w-10 h-10 rounded-full bg-fill items-center justify-center">
                                <MapPin color="#1c1b1b" size={17} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-eyebrow uppercase tracking-[0.08em] text-ink-faint font-label">Destination</Text>
                                <Text className="text-body font-heading text-ink mt-0.5" numberOfLines={2}>
                                    {neighborhood || activeOrder.delivery_address || 'Votre adresse'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Order summary */}
                    {items && items.length > 0 && (
                        <View className="bg-white rounded-sheet overflow-hidden border border-hairline mb-6">
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setIsOrderDetailsExpanded(!isOrderDetailsExpanded);
                                }}
                                accessibilityRole="button"
                                accessibilityState={{ expanded: isOrderDetailsExpanded }}
                                className="w-full px-5 py-5 flex-row justify-between items-center active:bg-fill"
                            >
                                <View className="flex-row items-center gap-3">
                                    <Receipt color="#1c1b1b" size={19} />
                                    <Text className="font-labelbold text-body tracking-tight text-ink">
                                        Détails · {items.length} article{items.length > 1 ? 's' : ''}
                                    </Text>
                                </View>
                                <View className="flex-row items-center gap-3">
                                    <Text className="text-body font-title text-ink">{formatXaf(orderTotal)}</Text>
                                    {isOrderDetailsExpanded
                                        ? <ChevronUp color="#8d8a87" size={19} />
                                        : <ChevronDown color="#8d8a87" size={19} />}
                                </View>
                            </Pressable>

                            {isOrderDetailsExpanded && (
                                <View className="px-5 pb-5 pt-1 flex-col gap-3.5 border-t border-hairline">
                                    <View className="pt-3.5 flex-col gap-3.5">
                                        {items.map((item: any) => (
                                            <View key={item.id} className="flex-row justify-between items-center">
                                                <View className="flex-row gap-3.5 items-center flex-1 pr-4">
                                                    <View className="w-7 h-7 bg-fill rounded-chip items-center justify-center">
                                                        <Text className="text-caption font-labelbold text-ink">{item.quantity}</Text>
                                                    </View>
                                                    <Text className="text-body font-label text-ink-muted" numberOfLines={1}>{item.name}</Text>
                                                </View>
                                                <Text className="text-body font-labelbold text-ink tracking-tight">
                                                    {formatXaf(item.price * item.quantity)}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                    <View className="flex-row justify-between items-center pt-3.5 border-t border-hairline">
                                        <Text className="text-body font-labelbold text-ink uppercase tracking-[0.08em]">Total</Text>
                                        <Text className="text-h3 font-title text-ink tracking-tight">{formatXaf(orderTotal)}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Cancel — only while the restaurant hasn't accepted yet (PENDING). */}
                    {activeOrder.status === 'PENDING' && (
                        <View className="mt-2 mb-10">
                            <Pressable
                                onPress={handleCancelOrder}
                                disabled={cancelling}
                                className="w-full py-4 rounded-full border border-red-500/20 bg-danger-soft active:scale-[0.98] items-center justify-center"
                                style={{ opacity: cancelling ? 0.6 : 1 }}
                            >
                                <Text className="text-danger font-labelbold text-body tracking-[0.08em] uppercase">
                                    {cancelling ? 'Annulation…' : 'Annuler la commande'}
                                </Text>
                            </Pressable>
                            <Text className="text-eyebrow text-ink-faint font-body text-center mt-2">
                                Possible tant que le restaurant n'a pas accepté.
                            </Text>
                        </View>
                    )}

                    {/* Terminal states — back home CTA */}
                    {(delivered || cancelled) && (
                        <Pressable
                            onPress={() => router.replace('/home')}
                            className="mb-10 w-full py-4 rounded-full bg-ink items-center active:scale-[0.98]"
                        >
                            <Text className="text-white font-labelbold text-body">
                                {delivered ? 'Commander à nouveau' : "Retour à l'accueil"}
                            </Text>
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

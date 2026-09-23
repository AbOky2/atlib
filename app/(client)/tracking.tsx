import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Platform, LayoutAnimation, UIManager, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown, ChevronUp, Receipt, Package, UtensilsCrossed, MapPin, LifeBuoy, Bike, ChefHat, Home, Clock, X, Smartphone, Phone, MessageSquare, Coins, type LucideIcon } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '../../src/store/authStore';
import { useCartStore } from '../../src/store/cartStore';
import { ORDER_ERRORS, updateOrderStatus, useUserOrders } from '../../src/data/orders';
import { cancellationMessage, selectTrackedOrder, statusIndex, statusMeta, STATUS_FLOW, STATUS_META, type OrderStatus } from '../../src/lib/orderStatus';
import { OrderRefreshError } from '../../src/components/OrderRefreshError';
import { reconcileOrderRow } from '../../src/lib/reconcile';
import type { CustomerOrder } from '../../src/data/types';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { Button, Card, Divider, EmptyState, TypeText, SCREEN_GUTTER, TOUCH_MIN } from '../../src/components/ui';
import { liveActivityRunning } from '../../src/lib/liveActivity';
import { arrivalTimeLabel } from '../../src/lib/eta';
import { changeToGive } from '../../src/lib/cash';
import { formatXaf } from '../../src/lib/pricing';
import { shadowSoft } from '../../src/lib/elevation';
import { COLORS } from '../../src/lib/palette';
import { openSupportChat, SUPPORT_ORDER_MESSAGE } from '../../src/lib/support';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** One pictogram per step, shared with the history and the banner. */
export const STEP_ICON: Record<OrderStatus, LucideIcon> = {
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
function StatusHero({ status, reason }: { status: string; reason: string | null | undefined }) {
    const meta = statusMeta(status);
    const cancelled = status === 'CANCELLED';
    const delivered = status === 'DELIVERED';
    const live = !cancelled && !delivered;
    const Icon = STEP_ICON[(status as OrderStatus)] ?? Clock;

    const discColor = cancelled ? COLORS.danger : delivered ? COLORS.success : COLORS.accent;

    return (
        <View className="items-center pt-2 pb-8">
            <View className="items-center justify-center mb-5" style={{ width: 84, height: 84 }}>
                {live && <PulseRing size={72} color={COLORS.accent} />}
                <View
                    className="items-center justify-center rounded-full"
                    style={[{ width: 72, height: 72, backgroundColor: discColor }, shadowSoft]}
                >
                    <Icon color={COLORS.white} size={30} strokeWidth={2.2} />
                </View>
            </View>
            <Text className="text-h1 font-display tracking-tight text-ink text-center" accessibilityRole="header">
                {meta.headline}
            </Text>
            <TypeText tone="secondary" className="text-center mt-2 px-8">
                {cancelled ? `${cancellationMessage(reason)} Aucun montant ne vous sera demandé.` : meta.description}
            </TypeText>
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
        <View className="flex-row" accessibilityLabel={`${meta.headline}, ${current ? 'étape en cours' : done ? 'terminée' : 'à venir'}`}>
            {/* Node + connector */}
            <View className="items-center" style={{ width: 44 }}>
                <View className="items-center justify-center" style={{ width: 36, height: 36 }}>
                    {current && <PulseRing size={36} color={COLORS.accent} />}
                    <View
                        className="items-center justify-center rounded-full"
                        style={{
                            width: 36,
                            height: 36,
                            backgroundColor: done ? COLORS.ink : current ? COLORS.accent : COLORS.surface,
                            borderWidth: done || current ? 0 : 2,
                            borderColor: COLORS.hairline,
                        }}
                    >
                        {done ? (
                            <Check color={COLORS.white} size={16} strokeWidth={2.8} />
                        ) : (
                            <Icon color={current ? COLORS.white : COLORS.inkFaint} size={16} strokeWidth={2.2} />
                        )}
                    </View>
                </View>
                {!last && (
                    <View
                        className="flex-1 rounded-full my-1"
                        style={{ width: 2, backgroundColor: done ? COLORS.ink : COLORS.hairline }}
                    />
                )}
            </View>

            {/* Copy */}
            <View className={`flex-1 pl-3 ${last ? '' : 'pb-6'}`} style={{ paddingTop: 8 }}>
                <Text className={`text-body tracking-tight ${current ? 'font-title text-ink' : done ? 'font-heading text-ink' : 'font-heading text-ink-faint'}`}>
                    {meta.headline}
                </Text>
                {(current || done) && (
                    <Text className={`text-label font-body mt-1 ${current ? 'text-ink-muted' : 'text-ink-faint'}`}>
                        {meta.description}
                    </Text>
                )}
            </View>
        </View>
    );
}

function InfoRow({ icon: Icon, label, value, muted = false }: { icon: LucideIcon; label: string; value: string; muted?: boolean }) {
    return (
        <View className="flex-row items-start" style={{ gap: 16 }}>
            <View className="w-10 h-10 rounded-full bg-fill items-center justify-center">
                <Icon color={COLORS.ink} size={18} strokeWidth={2} />
            </View>
            <View className="flex-1">
                <TypeText variant="eyebrow" tone="tertiary">{label}</TypeText>
                <TypeText variant={muted ? 'body' : 'h3'} tone={muted ? 'secondary' : 'primary'} className="mt-1" numberOfLines={3}>{value}</TypeText>
            </View>
        </View>
    );
}

export default function TrackingScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const queryClient = useQueryClient();
    const [isOrderDetailsExpanded, setIsOrderDetailsExpanded] = useState(false);
    const [mutating, setMutating] = useState(false);
    const mutationInFlight = useRef(false);
    const [activityRunning, setActivityRunning] = useState(false);
    const user = useAuthStore(state => state.user);
    const showToast = useCartStore(state => state.showToast);
    const showDialog = useCartStore(state => state.showDialog);

    const { data: orders, isLoading, isError, isFetching, refetch } = useUserOrders(user?.id);
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();

    // If a specific order was opened (e.g. from history), show it; otherwise the
    // first active order (or the most recent).
    const activeOrder = selectTrackedOrder(orders, orderId);

    const neighborhood = activeOrder?.delivery_zone || '';
    // Same computation the Live Activity uses, so the two can never disagree.
    const arrival = activeOrder?.eta_minutes != null ? arrivalTimeLabel(activeOrder.accepted_at ?? activeOrder.created_at, activeOrder.eta_minutes) : null;
    const index = activeOrder ? statusIndex(activeOrder.status) : 0;
    const cancelled = activeOrder?.status === 'CANCELLED';
    const delivered = activeOrder?.status === 'DELIVERED';
    const live = !!activeOrder && !cancelled && !delivered;
    const change = activeOrder ? changeToGive(activeOrder.total_xaf ?? 0, activeOrder.cash_paid_with_xaf) : null;

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
            activeOrder?.order_items?.map((oi) => ({
                id: oi.id,
                name: oi.name || 'Article',
                note: oi.note,
                price: oi.price_xaf ?? 0,
                quantity: oi.qty ?? 1,
            })) ?? [],
        [activeOrder?.order_items],
    );

    const orderTotal = activeOrder ? (activeOrder.total_xaf ?? 0) : 0;

    /** Conditional transition owned by the customer: cancel while PENDING, or confirm reception. */
    const customerTransition = async (to: 'CANCELLED' | 'DELIVERED', from: 'PENDING' | 'OUT_FOR_DELIVERY', successMessage: string) => {
        if (!activeOrder?.id || mutationInFlight.current || !user) return;
        if (useAuthStore.getState().user?.id !== user.id) return;
        mutationInFlight.current = true;
        setMutating(true);
        try {
            const updated = await updateOrderStatus(activeOrder.id, to, from);
            if (useAuthStore.getState().user?.id !== user.id) return;
            queryClient.setQueryData<CustomerOrder[]>(['orders', user.id], old => reconcileOrderRow(old, updated));
            void queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
            showToast(successMessage, 'success');
        } catch (error: any) {
            if (useAuthStore.getState().user?.id !== user.id) return;
            if (error?.message === ORDER_ERRORS.STATUS_CONFLICT) {
                showToast('La commande a changé entre-temps. Suivi actualisé.', 'info');
                void queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
            } else {
                showToast('Action impossible pour le moment. Vérifiez votre connexion et réessayez.', 'error');
            }
        } finally {
            mutationInFlight.current = false;
            setMutating(false);
        }
    };

    const handleCancelOrder = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDialog({
            title: 'Annuler la commande ?',
            message: 'Cette action est définitive. Le restaurant ne préparera pas votre commande.',
            confirmText: 'Oui, annuler',
            cancelText: 'Garder ma commande',
            destructive: true,
            onConfirm: () => { void customerTransition('CANCELLED', 'PENDING', 'Commande annulée.'); },
        });
    };

    const handleConfirmReception = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDialog({
            title: 'Commande reçue ?',
            message: 'Confirmez seulement une fois le repas entre vos mains.',
            confirmText: 'Oui, je l’ai reçue',
            cancelText: 'Pas encore',
            onConfirm: () => { void customerTransition('DELIVERED', 'OUT_FOR_DELIVERY', 'Bon appétit !'); },
        });
    };

    if (!activeOrder) {
        const title = !user ? 'Connectez-vous' : isLoading ? 'Chargement du suivi…' : isError ? 'Suivi indisponible' : orderId !== undefined ? 'Commande introuvable' : 'Aucune commande';
        const message = !user ? 'Connectez-vous au compte utilisé pour cette commande.' : isLoading ? 'Nous récupérons votre commande.' : isError ? 'Vérifiez votre connexion puis réessayez.' : orderId !== undefined ? 'Cette commande n’est pas disponible dans ce compte.' : 'Votre prochaine commande apparaîtra ici, avec son suivi en direct.';
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Suivi de commande" back="close" onBack={() => router.replace('/home')} />
                <View className="flex-1 items-center justify-center" style={{ paddingTop: headerOffset }}>
                    {isLoading ? <ActivityIndicator color={COLORS.ink} className="mb-6" /> : null}
                    <EmptyState
                        icon={Package}
                        title={title}
                        message={message}
                        action={
                            user && isError
                                ? <OrderRefreshError busy={isFetching} retry={() => { void refetch(); }} />
                                : <Button label={user ? 'Mes commandes' : 'Se connecter'} variant="secondary" onPress={() => router.replace(user ? '/orders' : '/login')} />
                        }
                    />
                </View>
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
                            void openSupportChat(SUPPORT_ORDER_MESSAGE);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Contacter l'assistance"
                        className="px-4 rounded-full bg-fill flex-row items-center active:scale-95"
                        style={{ gap: 8, height: TOUCH_MIN }}
                    >
                        <LifeBuoy color={COLORS.ink} size={18} strokeWidth={2} />
                        <Text className="text-label font-labelbold text-ink">Aide</Text>
                    </Pressable>
                }
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: SCREEN_GUTTER,
                    paddingTop: headerOffset + 16,
                    paddingBottom: Math.max(insets.bottom, 24) + 24,
                }}
                showsVerticalScrollIndicator={false}
            >
                {isError ? <OrderRefreshError busy={isFetching} retry={() => { void refetch(); }} /> : null}
                <StatusHero status={activeOrder.status} reason={activeOrder.cancellation_reason} />

                {/* Off iOS there is no Dynamic Island to own the ETA, so the
                    arrival time belongs here — otherwise those users would have
                    no time information anywhere in the product. */}
                {live && Platform.OS !== 'ios' && index >= 1 && arrival && (
                    <View className="flex-row items-center bg-fill rounded-card px-4 py-3 mb-6" style={{ gap: 12 }}>
                        <View className="w-9 h-9 rounded-full bg-ink items-center justify-center">
                            <Clock color={COLORS.white} size={16} strokeWidth={2} />
                        </View>
                        <Text className="flex-1 text-label font-body text-ink-muted">
                            Arrivée estimée vers <Text className="font-labelbold text-ink">{arrival}</Text>
                        </Text>
                    </View>
                )}

                {/* Live Activity hint — shown ONLY when one is really running,
                    so the app never claims a lock-screen tracker it doesn't have. */}
                {live && Platform.OS === 'ios' && index >= 1 && activityRunning && (
                    <View className="flex-row items-center bg-fill rounded-card px-4 py-3 mb-6" style={{ gap: 12 }}>
                        <View className="w-9 h-9 rounded-full bg-ink items-center justify-center">
                            <Smartphone color={COLORS.white} size={16} strokeWidth={2} />
                        </View>
                        <Text className="flex-1 text-label font-body text-ink-muted">
                            Heure d’arrivée et progression en direct sur votre{' '}
                            <Text className="font-labelbold text-ink">écran verrouillé</Text> et la{' '}
                            <Text className="font-labelbold text-ink">Dynamic Island</Text>.
                        </Text>
                    </View>
                )}

                {/* Reception — the customer closes the loop if the kitchen forgets to. */}
                {activeOrder.status === 'OUT_FOR_DELIVERY' && (
                    <Button label="J’ai reçu ma commande" onPress={handleConfirmReception} loading={mutating} className="mb-6" />
                )}

                {/* Step tracker */}
                {!cancelled && (
                    <Card className="p-6 mb-6">
                        <TypeText variant="eyebrow" tone="tertiary" className="mb-5">Progression</TypeText>
                        {STATUS_FLOW.map((status, i) => (
                            <TimelineStep
                                key={status}
                                status={status}
                                state={stepState(i)}
                                last={i === STATUS_FLOW.length - 1}
                            />
                        ))}
                    </Card>
                )}

                {/* Route and delivery details */}
                <Card className="p-5 mb-6" style={{ gap: 16 }}>
                    <InfoRow icon={UtensilsCrossed} label="Restaurant" value={activeOrder.restaurant_name || 'Restaurant'} />
                    <Divider />
                    <InfoRow icon={MapPin} label="Livraison" value={activeOrder.delivery_address || neighborhood || 'Votre adresse'} />
                    {activeOrder.delivery_note ? <InfoRow icon={MessageSquare} label="Consigne" value={activeOrder.delivery_note} muted /> : null}
                    {activeOrder.customer_phone ? <InfoRow icon={Phone} label="Numéro à joindre" value={activeOrder.customer_phone} muted /> : null}
                    {live ? (
                        <InfoRow
                            icon={Coins}
                            label="Paiement en espèces"
                            value={activeOrder.cash_paid_with_xaf
                                ? `Vous payez avec ${formatXaf(activeOrder.cash_paid_with_xaf)}${change && change > 0 ? ` · ${formatXaf(change)} à vous rendre` : ''}`
                                : 'Vous avez l’appoint'}
                            muted
                        />
                    ) : null}
                </Card>

                {/* Order summary */}
                {items.length > 0 && (
                    <Card className="overflow-hidden mb-6">
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setIsOrderDetailsExpanded(!isOrderDetailsExpanded);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: isOrderDetailsExpanded }}
                            accessibilityLabel={`Détails de la commande, ${items.length} article${items.length > 1 ? 's' : ''}, total ${formatXaf(orderTotal)}`}
                            className="w-full px-5 py-5 flex-row justify-between items-center active:bg-fill"
                        >
                            <View className="flex-row items-center" style={{ gap: 12 }}>
                                <Receipt color={COLORS.ink} size={20} strokeWidth={2} />
                                <Text className="font-labelbold text-body tracking-tight text-ink">
                                    Détails · {items.length} article{items.length > 1 ? 's' : ''}
                                </Text>
                            </View>
                            <View className="flex-row items-center" style={{ gap: 12 }}>
                                <Text className="text-body font-title text-ink">{formatXaf(orderTotal)}</Text>
                                {isOrderDetailsExpanded
                                    ? <ChevronUp color={COLORS.inkFaint} size={20} strokeWidth={2} />
                                    : <ChevronDown color={COLORS.inkFaint} size={20} strokeWidth={2} />}
                            </View>
                        </Pressable>

                        {isOrderDetailsExpanded && (
                            <View className="px-5 pb-5 border-t border-hairline">
                                <View className="pt-4" style={{ gap: 12 }}>
                                    {items.map((item) => (
                                        <View key={item.id} className="flex-row justify-between items-start">
                                            <View className="flex-row items-start flex-1 pr-4" style={{ gap: 12 }}>
                                                <View className="w-7 h-7 bg-fill rounded-chip items-center justify-center">
                                                    <Text className="text-caption font-labelbold text-ink">{item.quantity}</Text>
                                                </View>
                                                <View className="flex-1">
                                                    <TypeText numberOfLines={2}>{item.name}</TypeText>
                                                    {item.note ? <TypeText variant="caption" tone="secondary">{item.note}</TypeText> : null}
                                                </View>
                                            </View>
                                            <Text className="text-body font-labelbold text-ink tracking-tight">
                                                {formatXaf(item.price * item.quantity)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                                <View className="flex-row justify-between items-center pt-4 mt-4 border-t border-hairline">
                                    <TypeText variant="label" tone="secondary" className="uppercase tracking-eyebrow">Total</TypeText>
                                    <Text className="text-h3 font-title text-ink tracking-tight">{formatXaf(orderTotal)}</Text>
                                </View>
                            </View>
                        )}
                    </Card>
                )}

                {/* Cancel — only while the restaurant hasn't accepted yet (PENDING). */}
                {activeOrder.status === 'PENDING' && (
                    <View className="mt-2 mb-4">
                        <Button label="Annuler la commande" variant="destructive" onPress={handleCancelOrder} loading={mutating} />
                        <TypeText variant="caption" tone="tertiary" className="text-center mt-3">
                            Possible tant que le restaurant n’a pas accepté.
                        </TypeText>
                    </View>
                )}

                {/* Terminal states — back home CTA */}
                {(delivered || cancelled) && (
                    <Button
                        label={delivered ? 'Commander à nouveau' : 'Retour à l’accueil'}
                        onPress={() => router.replace('/home')}
                        className="mb-4"
                    />
                )}
            </ScrollView>
        </View>
    );
}

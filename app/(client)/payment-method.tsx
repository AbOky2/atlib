import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banknote, ShieldCheck, Clock, MapPin, Pencil, MessageSquare, Phone, Coins } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { createOrder } from '../../src/data/orders';
import { refreshMenu } from '../../src/data/catalogue';
import { ORDER_ERRORS, isMenuRefusal, orderErrorMessage } from '../../src/lib/orderErrors';
import { isTerminal } from '../../src/lib/orderStatus';
import { getEstimatedDeliveryTime } from '../../src/lib/localities';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import {
    Button, Card, Chip, Divider, SummaryRow, TypeText,
    BottomActionBar, BOTTOM_BAR_CLEARANCE, SCREEN_GUTTER } from '../../src/components/ui';
import { DELIVERY_FEE_XAF, SERVICE_FEE_XAF, computeOrderTotal, formatXaf } from '../../src/lib/pricing';
import { COLORS } from '../../src/lib/palette';
import { suggestedCashAmounts, changeToGive } from '../../src/lib/cash';

/** Icon disc + text row inside a grouped card: 44 pt disc, 16 pt gap, 20 pt padding. */
const ROW_TEXT_INSET = 20 + 44 + 16;

function Radio({ selected }: { selected: boolean }) {
    return (
        <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                selected ? 'border-ink bg-ink' : 'border-hairline'
            }`}
        >
            {selected && <View className="w-2 h-2 rounded-full bg-white" />}
        </View>
    );
}

export default function PaymentMethodScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    // Hard re-entrancy guard — state updates are async, refs are not.
    const inFlightRef = useRef(false);

    const user = useAuthStore(state => state.user);
    const items = useCartStore(state => state.items);
    const cartTotal = useCartStore(state => state.getTotalPrice());
    const clearCart = useCartStore(state => state.clearCart);
    const showToast = useCartStore(state => state.showToast);
    const showDialog = useCartStore(state => state.showDialog);
    const currentRestaurantName = useCartStore(state => state.currentRestaurantName);
    const deliveryAddress = useCartStore(state => state.deliveryAddress);
    // null = exact change ("j'ai l'appoint"), a number = the note handed over.
    const cashPaidWith = useCartStore(state => state.cashPaidWith);
    const setCashPaidWith = useCartStore(state => state.setCashPaidWith);

    const finalTotal = computeOrderTotal(cartTotal);
    const eta = deliveryAddress ? getEstimatedDeliveryTime(deliveryAddress.locality) : null;
    const cashOptions = suggestedCashAmounts(finalTotal);
    const change = changeToGive(finalTotal, cashPaidWith);

    /** The basket the server refused no longer matches the menu: realign, then explain. */
    const handleMenuRefusal = async (code: string, restaurantId: string) => {
        try {
            const dishes = await refreshMenu(queryClient, restaurantId);
            useCartStore.getState().reconcileWithMenu(restaurantId, dishes);
        } catch { /* The next visit to the restaurant refetches anyway. */ }
        showToast(orderErrorMessage(code), 'error');
        if (code === ORDER_ERRORS.RESTAURANT_CLOSED) router.dismissAll();
        else router.dismissTo('/cart');
    };

    const handleConfirmOrder = async () => {
        if (inFlightRef.current) return;
        if (!user) {
            showToast('Veuillez vous connecter pour commander.', 'error');
            router.push('/login');
            return;
        }
        if (items.length === 0) return;
        // The address AND the contact number are captured on the previous screen —
        // without either, the restaurant cannot deliver. Send the user back.
        if (!deliveryAddress || !deliveryAddress.phone) {
            router.replace('/checkout-address');
            return;
        }

        inFlightRef.current = true;
        setIsSubmitting(true);
        const restaurantId = items[0].restaurantId;
        try {
            const formattedAddress = `${deliveryAddress.locality} — ${deliveryAddress.description}`;
            const fingerprint = JSON.stringify({ user: user.id, items, deliveryAddress, cashPaidWith });
            const submit = () => createOrder({
                customer_id: user.id,
                customer_name: user.user_metadata?.full_name || 'Client',
                customer_phone: deliveryAddress.phone!,
                restaurant_id: restaurantId,
                restaurant_name: items[0].restaurantName || 'Restaurant',
                delivery_address: formattedAddress,
                delivery_zone: deliveryAddress.locality,
                delivery_note: deliveryAddress.note || undefined,
                subtotal_xaf: cartTotal,
                delivery_fee_xaf: DELIVERY_FEE_XAF,
                total_xaf: finalTotal,
                payment_method: 'cash',
                // null means "exact change"; the restaurant then owes nothing back.
                cash_paid_with_xaf: cashPaidWith,
                eta_minutes: eta,
                client_request_id: useCartStore.getState().getCheckoutRequestId(fingerprint),
                items: items.map(item => ({
                    dish_id: item.id,
                    name: item.name,
                    qty: item.quantity,
                    price_xaf: item.price,
                    note: item.note,
                    options: item.options,
                })),
            });

            let createdOrder = await submit();
            // A key that survived past its order's delivery must never "confirm" that
            // old order again: start a fresh attempt and submit for real.
            if (isTerminal(createdOrder.status)) {
                useCartStore.getState().resetCheckoutAttempt();
                createdOrder = await submit();
            }

            // A response from the previous account must not clear a new cart
            // or navigate the next user to this customer's confirmation.
            if (useAuthStore.getState().user?.id !== user.id) return;
            // Fetch the updated orders list BEFORE navigating so the UI doesn't render a stale order.
            await queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
            if (useAuthStore.getState().user?.id !== user.id) return;
            // GlobalOrderSync starts the activity at PENDING, awaiting acceptance.

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Back navigation can leave this request running while a new cart
            // is edited. Only clear the exact cart that was submitted.
            const currentCart = useCartStore.getState();
            if (currentCart.items === items && currentCart.deliveryAddress === deliveryAddress) clearCart();
            // The checkout screens are done: going back from the confirmation must
            // land on Home, never on a payment screen for an order already placed.
            router.dismissAll();
            router.push({ pathname: '/order-confirmed', params: { orderId: createdOrder.id } });
        } catch (error: any) {
            if (useAuthStore.getState().user?.id !== user.id) return;
            const code: string = error?.message ?? '';
            if (code === ORDER_ERRORS.ACTIVE_ORDER_EXISTS) {
                showDialog({
                    title: 'Commande en cours',
                    message: orderErrorMessage(code),
                    confirmText: 'Voir ma commande',
                    cancelText: 'Fermer',
                    onConfirm: () => { router.dismissAll(); router.push('/tracking'); },
                });
            } else if (isMenuRefusal(code)) {
                await handleMenuRefusal(code, restaurantId);
            } else if (code === ORDER_ERRORS.FORBIDDEN) {
                showToast(orderErrorMessage(code), 'error');
                router.push('/login');
            } else if (code === ORDER_ERRORS.INVALID_ZONE || code === ORDER_ERRORS.INVALID_CHECKOUT) {
                showToast(orderErrorMessage(code), 'error');
                router.replace('/checkout-address');
            } else {
                if (!(code in ORDER_ERRORS)) console.error('Error creating order:', error);
                void queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
                showToast(orderErrorMessage(code), 'error');
            }
        } finally {
            inFlightRef.current = false;
            setIsSubmitting(false);
        }
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Récapitulatif" back="arrow" onBack={() => router.back()} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: headerOffset + 16,
                    paddingBottom: insets.bottom + BOTTOM_BAR_CLEARANCE,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ paddingHorizontal: SCREEN_GUTTER }} className="pb-8">
                    {/* Intro */}
                    <View className="mb-8">
                        <TypeText variant="h1">Dernière étape</TypeText>
                        <TypeText tone="secondary" className="mt-2">
                            Le restaurant doit accepter votre commande avant de la préparer.
                        </TypeText>
                    </View>

                    {/* Delivery block */}
                    <TypeText variant="eyebrow" tone="tertiary" className="mb-3">Livraison</TypeText>
                    <Card className="mb-8 overflow-hidden">
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.back();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Modifier l'adresse de livraison"
                            className="p-5 flex-row items-start gap-4 active:bg-fill"
                        >
                            <View className="w-11 h-11 rounded-card items-center justify-center bg-accent-soft">
                                <MapPin color={COLORS.accentDark} size={20} strokeWidth={2} />
                            </View>
                            <View className="flex-1">
                                <TypeText variant="h3">{deliveryAddress?.locality ?? 'Adresse à confirmer'}</TypeText>
                                {deliveryAddress?.description ? (
                                    <TypeText tone="secondary" className="mt-1" numberOfLines={2}>
                                        {deliveryAddress.description}
                                    </TypeText>
                                ) : null}
                            </View>
                            <Pencil color={COLORS.inkFaint} size={16} strokeWidth={2} style={{ marginTop: 4 }} />
                        </Pressable>

                        {deliveryAddress?.phone ? (
                            <View className="pb-3 flex-row items-center gap-2" style={{ paddingLeft: ROW_TEXT_INSET, paddingRight: 20 }}>
                                <Phone color={COLORS.inkFaint} size={14} strokeWidth={2} />
                                <TypeText variant="caption" tone="tertiary" className="flex-1" numberOfLines={1}>
                                    {deliveryAddress.phone}
                                </TypeText>
                            </View>
                        ) : null}

                        {deliveryAddress?.note ? (
                            <View className="pb-4 flex-row items-center gap-2" style={{ paddingLeft: ROW_TEXT_INSET, paddingRight: 20 }}>
                                <MessageSquare color={COLORS.inkFaint} size={14} strokeWidth={2} />
                                <TypeText variant="caption" tone="tertiary" className="flex-1" numberOfLines={2}>
                                    {deliveryAddress.note}
                                </TypeText>
                            </View>
                        ) : null}

                        {eta ? (
                            <View className="flex-row items-center gap-2 px-5 py-3 border-t border-hairline bg-fill">
                                <Clock color={COLORS.ink} size={16} strokeWidth={2} />
                                <TypeText variant="label" tone="secondary" className="flex-1">Arrivée estimée</TypeText>
                                <TypeText variant="label" className="font-labelbold">~{eta} min</TypeText>
                            </View>
                        ) : null}
                    </Card>

                    {/* Payment */}
                    <TypeText variant="eyebrow" tone="tertiary" className="mb-3">Paiement</TypeText>
                    <Card className="mb-8 overflow-hidden">
                        <View
                            accessibilityRole="radio"
                            accessibilityState={{ checked: true }}
                            accessibilityLabel="Espèces à la livraison, seul mode de paiement"
                            className="p-5 flex-row items-center gap-4"
                        >
                            <View className="w-11 h-11 rounded-card items-center justify-center bg-accent-soft">
                                <Banknote color={COLORS.accentDark} size={20} strokeWidth={2} />
                            </View>
                            <View className="flex-1">
                                <TypeText variant="h3">Espèces à la livraison</TypeText>
                                <TypeText variant="caption" tone="tertiary" className="mt-1">
                                    Réglez directement à la réception.
                                </TypeText>
                            </View>
                            <Radio selected />
                        </View>
                    </Card>

                    {/* Change — the question that saves the doorstep conversation.
                        Kept prominent because it is a real local advantage, not a
                        settings detail. */}
                    <TypeText variant="eyebrow" tone="tertiary" className="mb-3">Avec quel billet paierez-vous ?</TypeText>
                    <Card className="mb-8 p-5">
                        <TypeText tone="secondary" className="mb-4">
                            Cela aide le restaurant à préparer votre monnaie.
                        </TypeText>

                        <View className="flex-row flex-wrap gap-2">
                            <Chip
                                label="J'ai l'appoint"
                                selected={cashPaidWith === null}
                                onPress={() => setCashPaidWith(null)}
                            />
                            {cashOptions.map((amount) => (
                                <Chip
                                    key={amount}
                                    label={formatXaf(amount)}
                                    selected={cashPaidWith === amount}
                                    onPress={() => setCashPaidWith(amount)}
                                />
                            ))}
                        </View>

                        {change != null && change > 0 ? (
                            <>
                                <Divider className="my-4" />
                                <View className="flex-row items-center gap-3">
                                    <Coins color={COLORS.accentDark} size={18} strokeWidth={2} />
                                    <TypeText tone="secondary" className="flex-1">
                                        Le restaurant vous rendra
                                    </TypeText>
                                    <TypeText variant="bodylg" className="font-title">{formatXaf(change)}</TypeText>
                                </View>
                            </>
                        ) : null}
                    </Card>

                    {/* Order summary */}
                    <TypeText variant="eyebrow" tone="tertiary" className="mb-3">{`Récapitulatif · ${currentRestaurantName ?? 'votre commande'}`}</TypeText>
                    <Card className="p-5 mb-6">
                        <View className="gap-3">
                            {items.map(item => (
                                <View key={item.lineId} className="flex-row justify-between items-center">
                                    <View className="flex-row items-center gap-3 flex-1 pr-4">
                                        <View className="w-7 h-7 bg-fill rounded-chip items-center justify-center">
                                            <Text className="text-caption font-labelbold text-ink">{item.quantity}</Text>
                                        </View>
                                        <View className="flex-1">
                                            <TypeText numberOfLines={2}>{item.name}</TypeText>
                                            {item.note ? <TypeText variant="caption" tone="secondary">{item.note}</TypeText> : null}
                                        </View>
                                    </View>
                                    <TypeText className="font-labelbold">{formatXaf(item.price * item.quantity)}</TypeText>
                                </View>
                            ))}
                        </View>

                        <Divider className="my-4" />

                        <View className="gap-3">
                            <SummaryRow label="Sous-total" value={formatXaf(cartTotal)} />
                            <SummaryRow label="Livraison" value={formatXaf(DELIVERY_FEE_XAF)} />
                            <SummaryRow label="Service" value={formatXaf(SERVICE_FEE_XAF)} />
                        </View>

                        <Divider className="my-4" />

                        <SummaryRow label="Total" value={formatXaf(finalTotal)} emphasis />
                    </Card>

                    {/* Trust note */}
                    <View className="flex-row items-start gap-3 px-1">
                        <ShieldCheck color={COLORS.inkMuted} size={16} strokeWidth={2} style={{ marginTop: 2 }} />
                        <TypeText variant="caption" tone="secondary" className="flex-1">
                            Aucun prélèvement en ligne : vous réglez à la réception de votre commande.
                        </TypeText>
                    </View>
                </View>
            </ScrollView>

            <BottomActionBar>
                <Button
                    label="Envoyer au restaurant"
                    onPress={handleConfirmOrder}
                    loading={isSubmitting}
                    trailing={<Text className="text-bodylg font-title text-white tracking-tight">{formatXaf(finalTotal)}</Text>}
                    accessibilityLabel={`Envoyer au restaurant, total ${formatXaf(finalTotal)}`}
                />
            </BottomActionBar>
        </View>
    );
}

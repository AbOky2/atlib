import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreditCard, Banknote, ShieldCheck, Clock, MapPin, Pencil, MessageSquare, Phone, Coins } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { createOrder, ORDER_ERRORS } from '../../src/hooks/useSupabase';
import { getEstimatedDeliveryTime } from '../../src/lib/localities';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { DELIVERY_FEE_XAF, SERVICE_FEE_XAF, computeOrderTotal, formatXaf as formatPrice } from '../../src/lib/pricing';
import { shadowSoft, shadowFloat } from '../../src/lib/elevation';
import { COLORS } from '../../src/lib/palette';
import { uuidv4 } from '../../src/lib/ids';
import { suggestedCashAmounts, changeToGive } from '../../src/lib/cash';

function SectionLabel({ children }: { children: string }) {
    return (
        <Text className="text-[11px] font-label uppercase tracking-[0.08em] text-ink-faint mb-3">
            {children}
        </Text>
    );
}

function Radio({ selected }: { selected: boolean }) {
    return (
        <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                selected ? 'border-[#1c1b1b] bg-[#1c1b1b]' : 'border-[#d8d4d2]'
            }`}
        >
            {selected && <View className="w-2 h-2 rounded-full bg-white" />}
        </View>
    );
}

export default function PaymentMethodScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const [selectedMethod, setSelectedMethod] = useState<'cash'>('cash');
    const [isSubmitting, setIsSubmitting] = useState(false);
    // null = exact change ("j'ai l'appoint"), a number = the note handed over.
    const [cashPaidWith, setCashPaidWith] = useState<number | null>(null);
    const queryClient = useQueryClient();

    // Idempotency key: one per checkout attempt. Survives retries (a lost
    // response + retry dedupes server-side); a fresh checkout remounts the
    // screen and gets a fresh key.
    const requestIdRef = useRef(uuidv4());
    // Hard re-entrancy guard — state updates are async, refs are not.
    const inFlightRef = useRef(false);

    const user = useAuthStore(state => state.user);
    const items = useCartStore(state => state.items);
    const cartTotal = useCartStore(state => state.getTotalPrice());
    const clearCart = useCartStore(state => state.clearCart);
    const showToast = useCartStore(state => state.showToast);
    const currentRestaurantName = useCartStore(state => state.currentRestaurantName);
    const deliveryAddress = useCartStore(state => state.deliveryAddress);

    const finalTotal = computeOrderTotal(cartTotal);
    const eta = deliveryAddress ? getEstimatedDeliveryTime(deliveryAddress.locality) : null;
    const cashOptions = suggestedCashAmounts(finalTotal);
    const change = changeToGive(finalTotal, cashPaidWith);

    const handleConfirmOrder = async () => {
        if (inFlightRef.current) return;
        if (!user) {
            showToast("Veuillez vous connecter pour commander.", 'error');
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
        try {
            const formattedAddress = `${deliveryAddress.locality} — ${deliveryAddress.description}`;

            const createdOrder = await createOrder({
                customer_id: user.id,
                customer_name: user.user_metadata?.full_name || 'Client',
                customer_phone: deliveryAddress.phone,
                restaurant_id: items[0].restaurantId,
                restaurant_name: items[0].restaurantName || 'Restaurant',
                delivery_address: formattedAddress,
                delivery_zone: deliveryAddress.locality,
                delivery_note: deliveryAddress.note || undefined,
                subtotal_xaf: cartTotal,
                delivery_fee_xaf: DELIVERY_FEE_XAF,
                total_xaf: finalTotal,
                payment_method: selectedMethod,
                // null means "exact change"; the restaurant then owes nothing back.
                cash_paid_with_xaf: cashPaidWith,
                eta_minutes: eta,
                client_request_id: requestIdRef.current,
                items: items.map(item => ({
                    dish_id: item.id,
                    name: item.name,
                    qty: item.quantity,
                    price_xaf: item.price
                }))
            });

            // Fetch the updated orders list BEFORE navigating so the UI doesn't render a stale order.
            await queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
            // The Live Activity starts when the restaurant CONFIRMS (GlobalOrderSync),
            // not here — the lock screen only tracks a confirmed order.

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            clearCart();
            router.replace({
                pathname: '/order-confirmed',
                params: { orderId: createdOrder?.id ?? '' },
            });
        } catch (error: any) {
            if (error?.message === ORDER_ERRORS.ACTIVE_ORDER_EXISTS) {
                showToast('Vous avez déjà une commande en cours. Veuillez patienter jusqu\'à sa livraison.', 'error');
            } else {
                console.error('Error creating order:', error);
                showToast('Impossible de confirmer la commande. Veuillez réessayer.', 'error');
            }
        } finally {
            inFlightRef.current = false;
            setIsSubmitting(false);
        }
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Paiement" back="arrow" onBack={() => router.back()} />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: headerOffset + 16,
                    paddingBottom: insets.bottom + 130
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="px-6 pb-10">
                    {/* Intro */}
                    <View className="mb-7">
                        <Text className="font-title text-3xl tracking-tight text-ink">Dernière étape</Text>
                        <Text className="text-ink-muted mt-2 text-sm font-body leading-relaxed">
                            Vérifiez votre commande, elle part en cuisine dès la confirmation.
                        </Text>
                    </View>

                    {/* Delivery block */}
                    <SectionLabel>Livraison</SectionLabel>
                    <View className="bg-white rounded-sheet border border-surface-container-highest mb-8 overflow-hidden" style={shadowSoft}>
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.back();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Modifier l'adresse de livraison"
                            className="p-5 flex-row items-start gap-4 active:bg-surface-container-low"
                        >
                            <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: COLORS.accentTint }}>
                                <MapPin color={COLORS.accent} size={20} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-heading tracking-tight text-ink">
                                    {deliveryAddress?.locality ?? 'Adresse à confirmer'}
                                </Text>
                                {deliveryAddress?.description ? (
                                    <Text className="text-sm text-ink-muted font-body leading-relaxed mt-0.5" numberOfLines={2}>
                                        {deliveryAddress.description}
                                    </Text>
                                ) : null}
                            </View>
                            <Pencil color={COLORS.inkFaint} size={16} style={{ marginTop: 4 }} />
                        </Pressable>

                        {deliveryAddress?.phone ? (
                            <View className="px-5 pb-3 -mt-1 flex-row items-center gap-2.5 pl-[76px]">
                                <Phone color={COLORS.inkFaint} size={13} />
                                <Text className="flex-1 text-[12px] font-body text-ink-faint" numberOfLines={1}>
                                    {deliveryAddress.phone}
                                </Text>
                            </View>
                        ) : null}

                        {deliveryAddress?.note ? (
                            <View className="px-5 pb-4 -mt-1 flex-row items-center gap-2.5 pl-[76px]">
                                <MessageSquare color={COLORS.inkFaint} size={13} />
                                <Text className="flex-1 text-[12px] font-body text-ink-faint" numberOfLines={2}>
                                    {deliveryAddress.note}
                                </Text>
                            </View>
                        ) : null}

                        {eta ? (
                            <View className="flex-row items-center gap-2.5 px-5 py-3.5 border-t border-surface-container-highest bg-surface-container-low">
                                <Clock color={COLORS.ink} size={15} />
                                <Text className="text-[13px] font-label text-ink-muted flex-1">Arrivée estimée</Text>
                                <Text className="text-[13px] font-labelbold text-ink">~{eta} min</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Payment methods */}
                    <SectionLabel>Méthode de paiement</SectionLabel>
                    <View className="bg-white rounded-sheet border border-surface-container-highest mb-8 overflow-hidden" style={shadowSoft}>
                        {/* Cash — active */}
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedMethod('cash');
                            }}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selectedMethod === 'cash' }}
                            className="p-5 flex-row items-center gap-4 active:bg-surface-container-low"
                        >
                            <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: COLORS.accentTint }}>
                                <Banknote color={COLORS.accent} size={20} />
                            </View>
                            <View className="flex-1">
                                <Text className="font-heading text-base text-ink">Espèces à la livraison</Text>
                                <Text className="text-ink-faint text-xs mt-0.5 leading-relaxed font-body">
                                    Réglez directement à la réception.
                                </Text>
                            </View>
                            <Radio selected={selectedMethod === 'cash'} />
                        </Pressable>

                        {/* Card — coming soon */}
                        <Pressable
                            onPress={() => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                showToast('Le paiement par carte sera disponible très prochainement.', 'info');
                            }}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: false, disabled: true }}
                            className="p-5 flex-row items-center gap-4 border-t border-surface-container-highest opacity-50"
                        >
                            <View className="w-11 h-11 rounded-2xl bg-surface-container-low items-center justify-center">
                                <CreditCard color={COLORS.inkMuted} size={20} />
                            </View>
                            <View className="flex-1">
                                <View className="flex-row items-center gap-2">
                                    <Text className="font-heading text-base text-ink">Carte bancaire</Text>
                                    <View className="bg-surface-container-low px-2 py-0.5 rounded-full">
                                        <Text className="text-[9px] font-labelbold uppercase tracking-[0.08em] text-ink-muted">
                                            Bientôt
                                        </Text>
                                    </View>
                                </View>
                                <Text className="text-ink-faint text-xs mt-0.5 leading-relaxed font-body">
                                    Visa, Mastercard — paiement sécurisé.
                                </Text>
                            </View>
                            <Radio selected={false} />
                        </Pressable>
                    </View>

                    {/* Change — the question that saves the doorstep conversation */}
                    <SectionLabel>Vous payez avec</SectionLabel>
                    <View className="bg-white rounded-sheet border border-surface-container-highest mb-8 p-5" style={shadowSoft}>
                        <Text className="text-[13px] font-body text-ink-muted leading-relaxed mb-4">
                            Indiquez le billet que vous aurez, pour que le restaurant prépare votre monnaie.
                        </Text>

                        <View className="flex-row flex-wrap gap-2.5">
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setCashPaidWith(null);
                                }}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: cashPaidWith === null }}
                                className={`px-4 h-11 rounded-full items-center justify-center border active:scale-[0.97] ${
                                    cashPaidWith === null
                                        ? 'bg-[#1c1b1b] border-[#1c1b1b]'
                                        : 'bg-white border-surface-container-highest'
                                }`}
                            >
                                <Text className={`text-[13px] font-labelbold ${cashPaidWith === null ? 'text-white' : 'text-ink'}`}>
                                    J'ai l'appoint
                                </Text>
                            </Pressable>

                            {cashOptions.map((amount) => {
                                const selected = cashPaidWith === amount;
                                return (
                                    <Pressable
                                        key={amount}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setCashPaidWith(amount);
                                        }}
                                        accessibilityRole="radio"
                                        accessibilityState={{ checked: selected }}
                                        className={`px-4 h-11 rounded-full items-center justify-center border active:scale-[0.97] ${
                                            selected
                                                ? 'bg-[#1c1b1b] border-[#1c1b1b]'
                                                : 'bg-white border-surface-container-highest'
                                        }`}
                                    >
                                        <Text className={`text-[13px] font-labelbold ${selected ? 'text-white' : 'text-ink'}`}>
                                            {formatPrice(amount)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {change != null && change > 0 ? (
                            <View className="flex-row items-center gap-2.5 mt-4 pt-4 border-t border-surface-container-highest">
                                <Coins color={COLORS.accent} size={16} />
                                <Text className="flex-1 text-[13px] font-body text-ink-muted">
                                    Le restaurant vous rendra
                                </Text>
                                <Text className="text-[15px] font-title text-ink">{formatPrice(change)}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Order summary */}
                    <SectionLabel>{`Récapitulatif · ${currentRestaurantName ?? 'votre commande'}`}</SectionLabel>
                    <View className="bg-white rounded-sheet border border-surface-container-highest p-5 mb-6" style={shadowSoft}>
                        <View className="flex-col gap-3.5 mb-5">
                            {items.map(item => (
                                <View key={item.lineId} className="flex-row justify-between items-center">
                                    <View className="flex-row items-center gap-3.5 flex-1 pr-4">
                                        <View className="w-7 h-7 bg-surface-container-low rounded-lg items-center justify-center">
                                            <Text className="text-[11px] font-labelbold text-ink">{item.quantity}</Text>
                                        </View>
                                        <Text className="text-sm font-label text-ink flex-1" numberOfLines={1}>{item.name}</Text>
                                    </View>
                                    <Text className="text-sm font-labelbold text-ink">{formatPrice(item.price * item.quantity)}</Text>
                                </View>
                            ))}
                        </View>

                        <View className="flex-col gap-2.5 pt-4 border-t border-surface-container-highest">
                            <View className="flex-row justify-between">
                                <Text className="text-[13px] text-ink-faint font-body">Sous-total</Text>
                                <Text className="text-[13px] font-label text-ink">{formatPrice(cartTotal)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[13px] text-ink-faint font-body">Livraison</Text>
                                <Text className="text-[13px] font-label text-ink">{formatPrice(DELIVERY_FEE_XAF)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-[13px] text-ink-faint font-body">Service</Text>
                                <Text className="text-[13px] font-label text-ink">{formatPrice(SERVICE_FEE_XAF)}</Text>
                            </View>
                        </View>

                        <View className="flex-row justify-between items-end pt-4 mt-4 border-t border-surface-container-highest">
                            <Text className="text-sm font-labelbold uppercase tracking-[0.08em] text-ink">Total</Text>
                            <Text className="text-[26px] font-display tracking-tight text-ink">{formatPrice(finalTotal)}</Text>
                        </View>
                    </View>

                    {/* Trust note */}
                    <View className="flex-row items-center gap-3 px-1">
                        <ShieldCheck color={COLORS.inkFaint} size={16} />
                        <Text className="flex-1 text-[12px] font-body text-ink-faint leading-relaxed">
                            Aucun prélèvement en ligne — vous réglez à la réception de votre commande.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom action bar */}
            <View
                className="absolute bottom-0 left-0 w-full bg-white/95 border-t border-surface-container-highest px-6 z-50"
                style={{ paddingBottom: Math.max(insets.bottom, 20), paddingTop: 16 }}
            >
                <Pressable
                    onPress={handleConfirmOrder}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel={`Confirmer la commande, total ${formatPrice(finalTotal)}`}
                    className="w-full bg-[#FF5733] h-14 rounded-full flex-row items-center justify-between px-7 active:scale-[0.98]"
                    style={[shadowFloat, { opacity: isSubmitting ? 0.75 : 1 }]}
                >
                    {isSubmitting ? (
                        <View className="flex-1 flex-row items-center justify-center gap-3">
                            <ActivityIndicator color="#fff" />
                            <Text className="text-white font-labelbold text-sm">Confirmation…</Text>
                        </View>
                    ) : (
                        <>
                            <Text className="text-white font-labelbold text-sm">Confirmer la commande</Text>
                            <Text className="text-white font-title text-lg tracking-tight">{formatPrice(finalTotal)}</Text>
                        </>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

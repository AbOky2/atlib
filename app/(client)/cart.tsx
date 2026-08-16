import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Minus, Plus, ArrowRight, ShoppingBag, Utensils } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../src/store/cartStore';
import { RemoteImage } from '../../src/components/RemoteImage';
import { useAuthStore } from '../../src/store/authStore';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import {
    Button, Card, Divider, SummaryRow, TypeText, QuantityStepper,
    BottomActionBar, BOTTOM_BAR_CLEARANCE, SCREEN_GUTTER } from '../../src/components/ui';
import { COLORS } from '../../src/lib/palette';
import { DELIVERY_FEE_XAF, SERVICE_FEE_XAF, computeOrderTotal, formatXaf as formatPrice } from '../../src/lib/pricing';
import { restaurantEtaRange, formatEtaRange } from '../../src/lib/eta';
import { shadowSoft, shadowFloat } from '../../src/lib/elevation';

export default function CartScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const [promoCode, setPromoCode] = useState('');

    const items = useCartStore(state => state.items);
    const cartTotal = useCartStore(state => state.getTotalPrice());
    const cartItemsCount = useCartStore(state => state.getTotalItems());
    const updateQuantity = useCartStore(state => state.updateQuantity);
    const removeItem = useCartStore(state => state.removeItem);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const currentRestaurantName = useCartStore(state => state.currentRestaurantName);
    const currentRestaurantId = useCartStore(state => state.currentRestaurantId);
    const showToast = useCartStore(state => state.showToast);

    const handleApplyPromo = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!promoCode.trim()) {
            showToast('Veuillez saisir un code promo.', 'info');
            return;
        }
        // No promo backend yet — acknowledge clearly instead of failing silently.
        showToast("Ce code n'est pas valide ou a expiré.", 'error');
    };

    const deliveryFee = DELIVERY_FEE_XAF;
    const serviceFee = SERVICE_FEE_XAF;
    const finalTotal = cartItemsCount > 0 ? computeOrderTotal(cartTotal) : 0;

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title="Mon Panier"
                back="close"
                onBack={() => router.replace('/home')}
                right={
                    <Text className="text-eyebrow font-label uppercase tracking-[0.08em] text-ink-faint">
                        {cartItemsCount} Article{cartItemsCount > 1 ? 's' : ''}
                    </Text>
                }
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: headerOffset + 16,
                    paddingBottom: insets.bottom + BOTTOM_BAR_CLEARANCE,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ paddingHorizontal: SCREEN_GUTTER }} className="pb-8">

                    {cartItemsCount === 0 ? (
                        <View className="py-20 items-center justify-center flex-col gap-4">
                            <View className="w-20 h-20 bg-fill rounded-full items-center justify-center mb-2">
                                <ShoppingBag color="#8d8a87" size={32} />
                            </View>
                            <Text className="text-h3 font-title text-ink">Votre panier est vide</Text>
                            <Text className="text-ink-muted text-center font-body text-body mb-6">Ajoutez des articles savoureux de nos restaurants.</Text>
                            <Pressable
                                onPress={() => router.back()}
                                className="bg-ink px-8 py-4 rounded-full active:scale-95"
                            >
                                <Text className="text-white text-caption font-labelbold">Parcourir les plats</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            {/* Restaurant group — a compact header, not a card. */}
                            <View className="flex-row items-center justify-between mb-5">
                                <View className="flex-1 pr-3">
                                    <TypeText variant="h3" numberOfLines={1}>{currentRestaurantName || 'Restaurant'}</TypeText>
                                    <TypeText variant="label" tone="secondary" className="mt-0.5">
                                        Livraison estimée · {currentRestaurantId ? formatEtaRange(restaurantEtaRange(currentRestaurantId)) : '—'}
                                    </TypeText>
                                </View>
                                <ChevronRight color={COLORS.inkFaint} size={20} />
                            </View>

                            <View className="gap-4 mb-8">
                                {items.map((item) => (
                                    <View key={item.lineId} className="flex-row gap-4 items-center">
                                        <View className="w-[88px] h-[88px] rounded-card overflow-hidden bg-fill-strong items-center justify-center">
                                            {item.image_url ? (
                                                <RemoteImage uri={item.image_url} displayWidth={88} className="w-full h-full" />
                                            ) : (
                                                <Utensils color={COLORS.inkFaint} size={26} />
                                            )}
                                        </View>

                                        <View className="flex-1 justify-center">
                                            <View className="flex-row items-start justify-between gap-3">
                                                <TypeText variant="bodylg" numberOfLines={2} className="flex-1 font-heading">
                                                    {item.name}
                                                </TypeText>
                                                <Text className="text-bodylg font-labelbold text-ink">
                                                    {formatPrice(item.price * item.quantity)}
                                                </Text>
                                            </View>

                                            {/* Unit price beside the total removes any ambiguity about
                                                what the line is charging for. */}
                                            <TypeText variant="caption" tone="secondary" className="mt-0.5">
                                                {item.quantity} × {formatPrice(item.price)}
                                                {item.note?.trim() ? ` · ${item.note}` : ''}
                                            </TypeText>

                                            <View className="flex-row items-center justify-between mt-2.5">
                                                <QuantityStepper
                                                    value={item.quantity}
                                                    min={0}
                                                    onChange={(next) => updateQuantity(item.lineId, next)}
                                                />
                                                <Pressable
                                                    onPress={() => {
                                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                                        removeItem(item.lineId);
                                                    }}
                                                    hitSlop={10}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Supprimer ${item.name}`}
                                                    className="active:opacity-60"
                                                >
                                                    <TypeText variant="label" tone="danger">Supprimer</TypeText>
                                                </Pressable>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Promo — one row, not a panel. The old block was
                                three times taller than the information it carried. */}
                            <View className="mb-8">
                                <TypeText variant="eyebrow" tone="tertiary" className="mb-2">Code promotionnel</TypeText>
                                <View className="flex-row gap-2.5">
                                    <View
                                        className="flex-1 bg-surface rounded-card border border-hairline px-4 justify-center"
                                        style={{ height: 52 }}
                                    >
                                        <TextInput
                                            className="text-body font-body text-ink"
                                            placeholder="Entrez votre code"
                                            placeholderTextColor={COLORS.inkFaint}
                                            value={promoCode}
                                            onChangeText={setPromoCode}
                                            autoCapitalize="characters"
                                            style={{ paddingVertical: 0 }}
                                        />
                                    </View>
                                    <Pressable
                                        onPress={handleApplyPromo}
                                        accessibilityRole="button"
                                        className="px-5 rounded-card bg-fill items-center justify-center active:bg-fill-strong"
                                        style={{ height: 52 }}
                                    >
                                        <TypeText variant="label" className="font-labelbold">Appliquer</TypeText>
                                    </Pressable>
                                </View>
                            </View>

                            <Card className="p-5">
                                <View className="gap-3">
                                    <SummaryRow label="Sous-total" value={formatPrice(cartTotal)} />
                                    <SummaryRow label="Frais de livraison" value={formatPrice(deliveryFee)} />
                                    <SummaryRow label="Frais de service" value={formatPrice(serviceFee)} />
                                </View>
                                <Divider className="my-4" />
                                <SummaryRow label="Total à régler" value={formatPrice(finalTotal)} emphasis />
                                <TypeText variant="caption" tone="tertiary" className="mt-2">
                                    Paiement à la livraison
                                </TypeText>
                            </Card>
                        </>
                    )}
                </View>
            </ScrollView>

            {cartItemsCount > 0 && (
                <BottomActionBar>
                    <Button
                        label="Commander"
                        onPress={() => router.push(isAuthenticated ? '/checkout-address' : '/login')}
                        trailing={
                            <View className="flex-row items-center gap-3">
                                <Text className="text-bodylg font-title text-white tracking-tight">{formatPrice(finalTotal)}</Text>
                                <ArrowRight color="#fff" size={20} />
                            </View>
                        }
                        variant="dark"
                        accessibilityLabel={`Commander, total ${formatPrice(finalTotal)}`}
                    />
                </BottomActionBar>
            )}
        </View>
    );
}

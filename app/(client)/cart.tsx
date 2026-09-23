import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ArrowRight, ShoppingBag, Utensils, Bike } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useCartStore } from '../../src/store/cartStore';
import { RemoteImage } from '../../src/components/RemoteImage';
import { useAuthStore } from '../../src/store/authStore';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import {
    Button, Card, Divider, EmptyState, SummaryRow, TypeText, QuantityStepper,
    BottomActionBar, BOTTOM_BAR_CLEARANCE, SCREEN_GUTTER, TOUCH_MIN } from '../../src/components/ui';
import { COLORS } from '../../src/lib/palette';
import { DELIVERY_FEE_XAF, SERVICE_FEE_XAF, computeOrderTotal, formatXaf } from '../../src/lib/pricing';

export default function CartScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();

    const items = useCartStore(state => state.items);
    const cartTotal = useCartStore(state => state.getTotalPrice());
    const cartItemsCount = useCartStore(state => state.getTotalItems());
    const updateQuantity = useCartStore(state => state.updateQuantity);
    const removeItem = useCartStore(state => state.removeItem);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const currentRestaurantName = useCartStore(state => state.currentRestaurantName);
    const currentRestaurantId = useCartStore(state => state.currentRestaurantId);

    const finalTotal = cartItemsCount > 0 ? computeOrderTotal(cartTotal) : 0;

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title="Mon panier"
                back="close"
                onBack={() => router.back()}
                right={
                    <TypeText variant="eyebrow" tone="tertiary">
                        {cartItemsCount} article{cartItemsCount > 1 ? 's' : ''}
                    </TypeText>
                }
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: SCREEN_GUTTER,
                    paddingTop: headerOffset + 16,
                    paddingBottom: cartItemsCount > 0 ? insets.bottom + BOTTOM_BAR_CLEARANCE : Math.max(insets.bottom, 24) + 24,
                }}
                showsVerticalScrollIndicator={false}
            >
                {cartItemsCount === 0 ? (
                    <EmptyState
                        icon={ShoppingBag}
                        title="Votre panier est vide"
                        message="Choisissez un restaurant et ajoutez vos plats préférés."
                        action={<Button label="Parcourir les restaurants" onPress={() => router.back()} />}
                        className="py-16"
                    />
                ) : (
                    <>
                        {/* Restaurant group — a compact header that leads back to the menu. */}
                        <Pressable
                            onPress={() => currentRestaurantId && router.navigate({ pathname: '/restaurant', params: { id: currentRestaurantId } })}
                            accessibilityRole="button"
                            accessibilityLabel={`Retourner à la carte de ${currentRestaurantName || 'ce restaurant'}`}
                            className="flex-row items-center justify-between mb-5 active:opacity-70"
                            style={{ minHeight: TOUCH_MIN }}
                        >
                            <View className="flex-1 pr-3">
                                <TypeText variant="h3" numberOfLines={1}>{currentRestaurantName || 'Restaurant'}</TypeText>
                                <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
                                    <Bike color={COLORS.inkFaint} size={14} strokeWidth={2} />
                                    <TypeText variant="label" tone="secondary">Livré par le restaurant · {formatXaf(DELIVERY_FEE_XAF)}</TypeText>
                                </View>
                            </View>
                            <ChevronRight color={COLORS.inkFaint} size={20} strokeWidth={2} />
                        </Pressable>

                        <View className="mb-8" style={{ gap: 16 }}>
                            {items.map((item) => (
                                <View key={item.lineId} className="flex-row items-center" style={{ gap: 16 }}>
                                    <View className="w-20 h-20 rounded-card overflow-hidden bg-fill-strong items-center justify-center">
                                        {item.image_url ? (
                                            <RemoteImage uri={item.image_url} displayWidth={80} className="w-full h-full" />
                                        ) : (
                                            <Utensils color={COLORS.inkFaint} size={26} strokeWidth={1.8} />
                                        )}
                                    </View>

                                    <View className="flex-1 justify-center">
                                        <View className="flex-row items-start justify-between" style={{ gap: 12 }}>
                                            <TypeText variant="bodylg" numberOfLines={2} className="flex-1 font-heading">{item.name}</TypeText>
                                            <Text className="text-bodylg font-labelbold text-ink">{formatXaf(item.price * item.quantity)}</Text>
                                        </View>

                                        {/* Unit price beside the total removes any ambiguity about
                                            what the line is charging for. */}
                                        <TypeText variant="caption" tone="secondary" className="mt-1" numberOfLines={2}>
                                            {item.quantity} × {formatXaf(item.price)}
                                            {item.note?.trim() ? ` · ${item.note}` : ''}
                                        </TypeText>

                                        <View className="flex-row items-center justify-between mt-2">
                                            <QuantityStepper value={item.quantity} min={0} onChange={(next) => updateQuantity(item.lineId, next)} />
                                            <Pressable
                                                onPress={() => {
                                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                                    removeItem(item.lineId);
                                                }}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Supprimer ${item.name}`}
                                                className="active:opacity-60 items-center justify-center px-2"
                                                style={{ minHeight: TOUCH_MIN }}
                                            >
                                                <TypeText variant="label" tone="danger">Supprimer</TypeText>
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <Card className="p-5">
                            <View className="" style={{ gap: 12 }}>
                                <SummaryRow label="Sous-total" value={formatXaf(cartTotal)} />
                                <SummaryRow label="Frais de livraison" value={formatXaf(DELIVERY_FEE_XAF)} />
                                <SummaryRow label="Frais de service" value={formatXaf(SERVICE_FEE_XAF)} />
                            </View>
                            <Divider className="my-4" />
                            <SummaryRow label="Total à régler" value={formatXaf(finalTotal)} emphasis />
                            <TypeText variant="caption" tone="tertiary" className="mt-2">Paiement en espèces à la livraison</TypeText>
                        </Card>
                    </>
                )}
            </ScrollView>

            {cartItemsCount > 0 && (
                <BottomActionBar>
                    <Button
                        label="Commander"
                        onPress={() => router.push(isAuthenticated ? '/checkout-address' : '/login')}
                        trailing={
                            <View className="flex-row items-center" style={{ gap: 12 }}>
                                <Text className="text-bodylg font-title text-white tracking-tight">{formatXaf(finalTotal)}</Text>
                                <ArrowRight color={COLORS.white} size={20} strokeWidth={2} />
                            </View>
                        }
                        accessibilityLabel={`Commander, total ${formatXaf(finalTotal)}`}
                    />
                </BottomActionBar>
            )}
        </View>
    );
}

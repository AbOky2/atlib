import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Minus, Plus, ArrowRight, ShoppingBag } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { DELIVERY_FEE_XAF, SERVICE_FEE_XAF, computeOrderTotal, formatXaf as formatPrice } from '../../src/lib/pricing';
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
                onBack={() => router.replace('/(client)/home' as any)}
                right={
                    <Text className="text-[10px] font-label uppercase tracking-[0.08em] text-ink-faint">
                        {cartItemsCount} Article{cartItemsCount > 1 ? 's' : ''}
                    </Text>
                }
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: headerOffset + 12,
                    paddingBottom: insets.bottom + 120
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="px-6 pb-10">

                    {cartItemsCount === 0 ? (
                        <View className="py-20 items-center justify-center flex-col gap-4">
                            <View className="w-20 h-20 bg-surface-container-low rounded-full items-center justify-center mb-2">
                                <ShoppingBag color="#8d8a87" size={32} />
                            </View>
                            <Text className="text-xl font-title text-ink">Votre panier est vide</Text>
                            <Text className="text-ink-muted text-center font-body text-sm mb-6">Ajoutez des articles savoureux de nos restaurants.</Text>
                            <Pressable
                                onPress={() => router.back()}
                                className="bg-[#1c1b1b] px-8 py-4 rounded-full active:scale-95"
                            >
                                <Text className="text-white text-xs font-labelbold">Parcourir les plats</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            {/* Restaurant Group */}
                            <View className="mb-10">
                                <View className="flex-row items-center justify-between mb-6">
                                    <View>
                                        <Text className="text-xl font-title tracking-tight text-ink">{currentRestaurantName || 'Restaurant'}</Text>
                                        <Text className="text-xs text-[#444748] font-label">Livraison estimée • 20-35 min</Text>
                                    </View>
                                    <ChevronRight color="#444748" size={24} />
                                </View>

                                <View className="flex-col gap-6">
                                    {items.map((item) => (
                                        <View key={item.lineId} className="flex-row gap-5 items-start p-4 -mx-4 rounded-3xl bg-white" style={shadowSoft}>
                                            <View className="w-24 h-24 rounded-2xl overflow-hidden bg-surface-container-highest flex-shrink-0 relative items-center justify-center">
                                                <Image
                                                    source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1544025162-811114bd4760?q=80&w=400&auto=format&fit=crop' }}
                                                    className="w-full h-full object-cover"
                                                    style={{ width: '100%', height: '100%' }}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                            <View className="flex-1 flex-col h-24 justify-between">
                                                <View>
                                                    <View className="flex-row justify-between items-start">
                                                        <Text className="font-heading text-base leading-tight text-ink flex-1 pr-2" numberOfLines={1}>{item.name}</Text>
                                                        <Text className="font-labelbold text-sm text-ink">{formatPrice(item.price * item.quantity)}</Text>
                                                    </View>
                                                    <Text className="text-xs text-[#444748] mt-1 font-body leading-relaxed" numberOfLines={1}>{item.note?.trim() ? item.note : 'Portion standard'}</Text>
                                                </View>
                                                <View className="flex-row items-center justify-between mt-2">
                                                    <View className="flex-row items-center bg-surface-container-highest rounded-full p-1 h-9">
                                                        <Pressable
                                                            onPress={() => {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                updateQuantity(item.lineId, item.quantity - 1);
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-surface-container-highest active:scale-95 transition-transform"
                                                        >
                                                            <Minus color="#1c1b1b" size={16} />
                                                        </Pressable>
                                                        <Text className="px-3 text-xs font-labelbold text-ink">{item.quantity}</Text>
                                                        <Pressable
                                                            onPress={() => {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                updateQuantity(item.lineId, item.quantity + 1);
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-surface-container-highest active:scale-95 transition-transform"
                                                        >
                                                            <Plus color="#1c1b1b" size={16} />
                                                        </Pressable>
                                                    </View>
                                                    <Pressable
                                                        onPress={() => {
                                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                                            removeItem(item.lineId);
                                                        }}
                                                        className="p-2 -mr-2 active:scale-95 transition-transform"
                                                    >
                                                        <Text className="text-xs font-labelbold text-[#ba1a1a]">Supprimer</Text>
                                                    </Pressable>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Promo Section */}
                            <View className="mb-10 p-5 bg-surface-container-low rounded-2xl border border-surface-container-highest">
                                <Text className="text-xs font-label tracking-[0.08em] uppercase text-ink-faint mb-4">Code Promotionnel</Text>
                                <View className="flex-row gap-3">
                                    <View className="flex-1 bg-white rounded-xl overflow-hidden border border-surface-variant">
                                        <TextInput
                                            className="w-full h-12 px-4 text-sm font-body text-ink"
                                            placeholder="Entrez votre code"
                                            placeholderTextColor="#8d8a87"
                                            value={promoCode}
                                            onChangeText={setPromoCode}
                                        />
                                    </View>
                                    <Pressable onPress={handleApplyPromo} className="px-6 h-12 bg-[#FF5733] flex items-center justify-center rounded-xl active:scale-95">
                                        <Text className="text-white text-xs font-labelbold">Appliquer</Text>
                                    </Pressable>
                                </View>
                            </View>

                            {/* Summary */}
                            <View className="mb-4 flex-col gap-4">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-sm text-[#444748] font-body">Sous-total</Text>
                                    <Text className="text-sm font-label text-ink">{formatPrice(cartTotal)}</Text>
                                </View>
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-sm text-[#444748] font-body">Frais de livraison</Text>
                                    <Text className="text-sm font-label text-ink">{formatPrice(deliveryFee)}</Text>
                                </View>
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-sm text-[#444748] font-body">Frais de service</Text>
                                    <Text className="text-sm font-label text-ink">{formatPrice(serviceFee)}</Text>
                                </View>

                                <View className="pt-5 mt-2 border-t border-surface-variant flex-row justify-between items-end">
                                    <View>
                                        <Text className="block text-xs font-label text-ink-faint uppercase tracking-[0.08em] mb-1">Total à régler</Text>
                                        <Text className="text-3xl font-display tracking-tight text-ink">{formatPrice(finalTotal)}</Text>
                                    </View>
                                    <View className="pb-1">
                                        <Text className="text-[10px] text-[#444748] italic font-body">TVA incluse</Text>
                                    </View>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Action Area */}
            {cartItemsCount > 0 && (
                <View
                    className="absolute bottom-0 left-0 w-full px-6 bg-white/90 border-t border-surface-container-highest"
                    style={{ paddingBottom: Math.max(insets.bottom, 20), paddingTop: 20 }}
                >
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            if (isAuthenticated) {
                                router.push('/(client)/checkout-address');
                            } else {
                                router.push('/login');
                            }
                        }}
                        className="w-full bg-[#1c1b1b] h-14 rounded-full flex-row items-center justify-between px-8 active:scale-[0.98] transition-transform"
                        style={shadowFloat}
                    >
                        <Text className="text-sm font-labelbold text-white">Commander</Text>
                        <View className="flex-row items-center gap-3">
                            <Text className="text-lg font-title text-white">{formatPrice(finalTotal)}</Text>
                            <ArrowRight color="#fff" size={20} />
                        </View>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Tag, ChevronRight, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BRAND } from '../../src/lib/brand';
import { useCartStore } from '../../src/store/cartStore';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';

export default function PromotionsScreen() {
    const headerOffset = useHeaderOffset();
    const showToast = useCartStore(state => state.showToast);
    const [promoCode, setPromoCode] = useState('');

    const handleApplyCode = () => {
        if (!promoCode.trim()) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // No promo backend yet — same honest behaviour as the cart.
        showToast("Ce code n'est pas valide ou a expiré.", 'error');
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 bg-white"
        >
            <ScreenHeader title="Promotions" back="arrow" onBack={() => router.back()} centerTitle />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingTop: headerOffset }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View className="p-6">
                    {/* Add Promo Code Input */}
                    <Text className="font-bold text-lg text-[#1c1b1b] mb-4">Ajouter une promotion</Text>
                    <View className="flex-row items-center gap-3 mb-8">
                        <View className="flex-1 bg-gray-100 rounded-xl px-4 py-4 border border-gray-200">
                            <TextInput
                                className="font-semibold text-base text-[#1c1b1b]"
                                placeholder="Saisir le code promotionnel"
                                placeholderTextColor="#9ca3af"
                                value={promoCode}
                                onChangeText={setPromoCode}
                                autoCapitalize="characters"
                            />
                        </View>
                        <Pressable
                            className={`px-6 py-4 rounded-xl items-center justify-center ${promoCode.trim() ? 'bg-[#1c1b1b] active:scale-[0.98]' : 'bg-gray-200'}`}
                            onPress={handleApplyCode}
                            disabled={!promoCode.trim()}
                        >
                            <Text className={`font-bold text-sm ${promoCode.trim() ? 'text-white' : 'text-gray-400'}`}>
                                Appliquer
                            </Text>
                        </Pressable>
                    </View>

                    {/* NOIR+ Subscription Banner */}
                    <View className="mb-10">
                        <Text className="font-bold text-lg text-[#1c1b1b] mb-4">Abonnements</Text>
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                showToast(`${BRAND}+ arrive très bientôt. Restez à l'écoute !`, 'info');
                            }}
                            className="bg-[#1c1b1b] p-6 rounded-[2rem] flex-row justify-between items-center relative overflow-hidden active:scale-[0.99]"
                        >
                            {/* Decorative element */}
                            <View className="absolute -right-6 -top-6 bg-white/10 w-32 h-32 rounded-full" />

                            <View className="flex-1 pr-6 relative z-10">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <Sparkles color="#FFD700" size={16} />
                                    <Text className="text-[#FFD700] font-bold text-xs uppercase tracking-widest">
                                        Nouveau
                                    </Text>
                                </View>
                                <Text className="font-black text-2xl text-white mb-1 tracking-tighter">
                                    {BRAND}+
                                </Text>
                                <Text className="text-gray-300 text-sm font-medium leading-relaxed">
                                    0 F de frais de livraison sur toutes vos commandes, essayez gratuitement pendant 3 mois.
                                </Text>
                            </View>
                            <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center relative z-10">
                                <ChevronRight color="#fff" size={20} />
                            </View>
                        </Pressable>
                    </View>

                    <View className="h-[1px] bg-gray-100 mb-8" />

                    {/* Active Promotions List */}
                    <Text className="font-bold text-lg text-[#1c1b1b] mb-4">Vos promotions actives</Text>

                    <View className="gap-4">
                        <View className="bg-white border border-gray-100 p-5 rounded-2xl flex-row items-start gap-4 shadow-sm shadow-black/5">
                            <View className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                                <Tag color="#FF5733" size={24} />
                            </View>
                            <View className="flex-1">
                                <View className="flex-row items-center gap-2 mb-1">
                                    <Text className="font-black text-lg tracking-tight text-[#1c1b1b]">-2 000 F</Text>
                                    <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                                        <Text className="text-[#FF5733] text-[10px] font-bold uppercase tracking-wider">Actif</Text>
                                    </View>
                                </View>
                                <Text className="text-[#444748] text-sm mb-2">Valable sur votre prochaine commande (min. 15 000 F d'achat).</Text>
                                <Text className="text-gray-400 text-xs font-medium">Expire le 15 Avril 2026</Text>
                            </View>
                        </View>

                        <View className="bg-white border border-gray-100 p-5 rounded-2xl flex-row items-start gap-4 shadow-sm shadow-black/5 opacity-60">
                            <View className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                <Tag color="#9ca3af" size={24} />
                            </View>
                            <View className="flex-1">
                                <Text className="font-black text-lg tracking-tight text-[#1c1b1b] mb-1">Livraison Gratuite</Text>
                                <Text className="text-[#444748] text-sm mb-2">Exclusivement pour le restaurant "La Tchadienne" le week-end.</Text>
                                <Text className="text-gray-400 text-xs font-medium">Utilisé il y a 2 jours</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

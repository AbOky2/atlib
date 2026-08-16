import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Tag, ChevronRight, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BRAND } from '../../src/lib/brand';
import { useCartStore } from '../../src/store/cartStore';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { COLORS } from '../../src/lib/palette';

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
            className="flex-1 bg-background"
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
                    <Text className="text-[11px] font-label uppercase tracking-[0.08em] text-ink-faint mb-3">
                        Ajouter une promotion
                    </Text>
                    <View className="flex-row items-center gap-3 mb-10">
                        <View className="flex-1 bg-white rounded-2xl px-4 border border-surface-container-highest" style={{ height: 56, justifyContent: 'center' }}>
                            <TextInput
                                className="font-label text-base text-ink"
                                placeholder="Saisir le code promotionnel"
                                placeholderTextColor={COLORS.inkFaint}
                                value={promoCode}
                                onChangeText={setPromoCode}
                                autoCapitalize="characters"
                            />
                        </View>
                        <Pressable
                            className={`px-6 rounded-2xl items-center justify-center ${promoCode.trim() ? 'bg-[#1c1b1b] active:scale-[0.98]' : 'bg-surface-container-highest'}`}
                            style={{ height: 56 }}
                            onPress={handleApplyCode}
                            disabled={!promoCode.trim()}
                        >
                            <Text className={`font-labelbold text-sm ${promoCode.trim() ? 'text-white' : 'text-ink-faint'}`}>
                                Appliquer
                            </Text>
                        </Pressable>
                    </View>

                    {/* NOIR+ teaser — no fake free-trial promise, just what's coming */}
                    <Text className="text-[11px] font-label uppercase tracking-[0.08em] text-ink-faint mb-3">
                        Abonnements
                    </Text>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            showToast(`${BRAND}+ arrive très bientôt. Restez à l'écoute !`, 'info');
                        }}
                        className="bg-[#1c1b1b] p-6 rounded-sheet flex-row justify-between items-center relative overflow-hidden active:scale-[0.99] mb-10"
                    >
                        {/* Decorative element */}
                        <View className="absolute -right-6 -top-6 bg-white/10 w-32 h-32 rounded-full" />

                        <View className="flex-1 pr-6 relative z-10">
                            <View className="flex-row items-center gap-2 mb-2">
                                <Sparkles color="#FFD700" size={16} />
                                <Text className="text-[#FFD700] font-labelbold text-[10px] uppercase tracking-[0.12em]">
                                    Bientôt disponible
                                </Text>
                            </View>
                            <Text className="font-display text-2xl text-white mb-1 tracking-tight">
                                {BRAND}+
                            </Text>
                            <Text className="text-white/60 text-sm font-body leading-relaxed">
                                0 F de frais de livraison en illimité. Lancement très prochainement.
                            </Text>
                        </View>
                        <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center relative z-10">
                            <ChevronRight color="#fff" size={20} />
                        </View>
                    </Pressable>

                    <View className="h-px bg-hairline mb-8" />

                    {/* Active promotions — honest empty state until a promo backend exists */}
                    <Text className="text-[11px] font-label uppercase tracking-[0.08em] text-ink-faint mb-3">
                        Vos promotions actives
                    </Text>
                    <View className="bg-white border border-surface-container-highest px-6 py-12 rounded-sheet items-center">
                        <View className="w-14 h-14 rounded-full items-center justify-center mb-4" style={{ backgroundColor: COLORS.accentTint }}>
                            <Tag color={COLORS.accent} size={24} />
                        </View>
                        <Text className="font-heading text-lg text-ink text-center">
                            Aucune promotion active
                        </Text>
                        <Text className="text-sm text-center text-ink-muted font-body mt-2 leading-relaxed">
                            Vos offres et récompenses apparaîtront ici dès qu'elles seront disponibles.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

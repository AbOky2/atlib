import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, ArrowRight, Clock, Pencil, MessageSquare, AlertCircle, Phone } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { useAddressStore } from '../../src/store/addressStore';
import { supabase } from '../../src/lib/supabase';
import { getEstimatedDeliveryTime } from '../../src/lib/localities';
import { isValidChadPhone, normalizeChadPhone } from '../../src/lib/phone';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { shadowFloat } from '../../src/lib/elevation';
import { COLORS } from '../../src/lib/palette';

export default function CheckoutAddressScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const saveAddress = useCartStore(state => state.setDeliveryAddress);
    const previousDelivery = useCartStore(state => state.deliveryAddress);
    const selectedAddress = useAddressStore(state => state.currentAddress);
    const user = useAuthStore(state => state.user);
    const [note, setNote] = useState('');
    // The restaurant delivers itself and must be able to CALL the customer —
    // a real phone number is as critical as the address.
    const [phone, setPhone] = useState(() => {
        const remembered = previousDelivery?.phone || user?.user_metadata?.phone || '';
        // Ne préremplir qu'avec un numéro réellement valide : un « 00000000 »
        // hérité d'une ancienne version se réinstallait sinon à chaque commande.
        return isValidChadPhone(remembered) ? remembered : '';
    });
    const [phoneError, setPhoneError] = useState<string | null>(null);

    const eta = selectedAddress ? getEstimatedDeliveryTime(selectedAddress.locality) : null;

    const handleContinue = () => {
        if (!selectedAddress) {
            router.push('/addresses');
            return;
        }
        // `isValidChadPhone` plutôt qu'un simple comptage de chiffres : « 00000000 »
        // en fait huit et passait le contrôle, si bien que l'ancien numéro bidon du
        // code se réinstallait tout seul dans le formulaire. Un mobile tchadien
        // commence par 6, 7 ou 9.
        if (!isValidChadPhone(phone)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setPhoneError('Numéro invalide. Un mobile tchadien commence par 6, 7 ou 9 (ex : 66 12 34 56).');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const cleanPhone = normalizeChadPhone(phone) ?? phone.trim();
        saveAddress({
            locality: selectedAddress.locality,
            description: selectedAddress.description,
            note: note.trim() || undefined,
            phone: cleanPhone,
        });
        // Remember the number on the account so future checkouts prefill it.
        supabase.auth.updateUser({ data: { phone: cleanPhone } }).catch(() => {});
        router.push('/payment-method');
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Adresse de livraison" back="arrow" onBack={() => router.back()} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
                keyboardVerticalOffset={headerOffset}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingTop: headerOffset + 16, paddingBottom: insets.bottom + 140 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="px-6">
                        {/* Intro */}
                        <View className="mb-7">
                            <Text className="font-title text-3xl tracking-tight text-ink">
                                Où livrons-nous ?
                            </Text>
                            <Text className="text-ink-muted mt-2 text-sm font-body leading-relaxed">
                                Confirmez le point de livraison. À N'Djamena, une bonne description vaut mieux qu'une rue.
                            </Text>
                        </View>

                        {selectedAddress ? (
                            <>
                                {/* Selected address card */}
                                <View className="bg-white rounded-3xl border border-surface-container-highest overflow-hidden mb-5">
                                    <View className="p-5 flex-row items-start gap-4">
                                        <View className="w-12 h-12 rounded-2xl bg-[#FF5733]/10 items-center justify-center">
                                            <MapPin color="#FF5733" size={22} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-[10px] text-ink-faint uppercase tracking-[0.08em] font-label">
                                                Livraison à
                                            </Text>
                                            <Text className="text-xl font-heading tracking-tight text-ink mt-0.5">
                                                {selectedAddress.locality}
                                            </Text>
                                            <Text className="text-sm text-ink-muted font-body leading-relaxed mt-1">
                                                {selectedAddress.description}
                                            </Text>
                                        </View>
                                    </View>
                                    <Pressable
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            router.push('/addresses');
                                        }}
                                        className="flex-row items-center justify-center gap-2 py-4 border-t border-surface-container-highest active:bg-surface-container-low"
                                    >
                                        <Pencil color="#1c1b1b" size={14} />
                                        <Text className="text-ink font-labelbold text-xs uppercase tracking-[0.08em]">
                                            Changer d'adresse
                                        </Text>
                                    </Pressable>
                                </View>

                                {/* ETA pill */}
                                {eta ? (
                                    <View className="flex-row items-center gap-3 bg-surface-container-low rounded-2xl px-5 py-4 mb-5">
                                        <Clock color="#1c1b1b" size={18} />
                                        <Text className="text-sm text-ink-muted font-body flex-1">
                                            Temps de livraison estimé
                                        </Text>
                                        <Text className="text-sm font-heading text-ink">~{eta} min</Text>
                                    </View>
                                ) : null}

                                {/* Contact phone — the restaurant calls this number on arrival */}
                                <View className="mb-5">
                                    <View className="flex-row items-center gap-2 mb-3">
                                        <Phone color="#8d8a87" size={16} />
                                        <Text className="text-xs uppercase tracking-[0.08em] text-ink-faint font-label">
                                            Numéro de téléphone
                                        </Text>
                                    </View>
                                    <View
                                        className="bg-white rounded-2xl border"
                                        style={{ borderColor: phoneError ? COLORS.red : COLORS.fillStrong }}
                                    >
                                        <TextInput
                                            className="px-4 h-14 text-base font-body text-ink"
                                            placeholder="Ex : 66 00 00 00"
                                            placeholderTextColor="#8d8a87"
                                            keyboardType="phone-pad"
                                            value={phone}
                                            onChangeText={(v) => {
                                                setPhone(v);
                                                if (phoneError && isValidChadPhone(v)) setPhoneError(null);
                                            }}
                                            maxLength={20}
                                        />
                                    </View>
                                    <Text
                                        className="text-[11px] font-body mt-2"
                                        style={{ color: phoneError ? COLORS.red : COLORS.inkFaint }}
                                    >
                                        {phoneError ?? 'Le restaurant vous appellera à ce numéro en arrivant.'}
                                    </Text>
                                </View>

                                {/* Courier note */}
                                <View className="mb-2">
                                    <View className="flex-row items-center gap-2 mb-3">
                                        <MessageSquare color="#8d8a87" size={16} />
                                        <Text className="text-xs uppercase tracking-[0.08em] text-ink-faint font-label">
                                            Instructions pour le livreur
                                        </Text>
                                    </View>
                                    <View className="bg-white rounded-2xl border border-surface-container-highest">
                                        <TextInput
                                            className="px-4 py-4 text-sm font-body text-ink min-h-[88px]"
                                            placeholder="Ex : Portail bleu face à la pharmacie, appelez en arrivant…"
                                            placeholderTextColor="#8d8a87"
                                            multiline
                                            textAlignVertical="top"
                                            value={note}
                                            onChangeText={setNote}
                                            maxLength={180}
                                        />
                                    </View>
                                    <Text className="text-[10px] text-ink-faint font-body mt-2 text-right">{note.length}/180</Text>
                                </View>
                            </>
                        ) : (
                            /* Empty state */
                            <View className="bg-white rounded-3xl border border-surface-container-highest px-6 py-10 items-center">
                                <View className="w-16 h-16 rounded-full bg-[#FF5733]/10 items-center justify-center mb-4">
                                    <AlertCircle color="#FF5733" size={28} />
                                </View>
                                <Text className="font-heading text-lg text-ink text-center">
                                    Aucune adresse enregistrée
                                </Text>
                                <Text className="text-sm text-center text-ink-muted font-body mt-2 mb-6 leading-relaxed">
                                    Ajoutez une adresse de livraison pour continuer.
                                </Text>
                                <Pressable
                                    onPress={() => router.push('/addresses')}
                                    className="bg-[#1c1b1b] px-8 py-4 rounded-full active:scale-95"
                                >
                                    <Text className="text-white font-labelbold text-xs uppercase tracking-[0.08em]">
                                        Choisir une adresse
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom action */}
            <View
                className="absolute bottom-0 left-0 right-0 bg-white/95 border-t border-surface-container-highest px-6"
                style={{ paddingBottom: Math.max(insets.bottom, 20), paddingTop: 18 }}
            >
                <Pressable
                    onPress={handleContinue}
                    className="w-full h-[54px] rounded-full flex-row items-center justify-between px-6 active:scale-[0.98] bg-[#1c1b1b]"
                    style={shadowFloat}
                >
                    <Text className="text-sm font-labelbold text-white">
                        {selectedAddress ? 'Vers le paiement' : 'Ajouter une adresse'}
                    </Text>
                    <ArrowRight color="#fff" size={20} />
                </Pressable>
            </View>
        </View>
    );
}

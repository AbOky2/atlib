import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, ArrowRight, Clock, Pencil, MessageSquare, AlertCircle, Phone } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { useAddressStore } from '../../src/store/addressStore';
import { getEstimatedDeliveryTime } from '../../src/lib/localities';
import { isValidChadPhone, normalizeChadPhone } from '../../src/lib/phone';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import {
    Button, Card, Divider, Field, TypeText,
    BottomActionBar, BOTTOM_BAR_CLEARANCE, SCREEN_GUTTER } from '../../src/components/ui';
import { shadowFloat } from '../../src/lib/elevation';
import { COLORS } from '../../src/lib/palette';

export default function CheckoutAddressScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const saveAddress = useCartStore(state => state.setDeliveryAddress);
    const previousDelivery = useCartStore(state => state.deliveryAddress);
    const selectedAddress = useAddressStore(state => state.currentAddress);
    const user = useAuthStore(state => state.user);
    const rememberPhone = useAuthStore(state => state.rememberPhone);
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
        rememberPhone(cleanPhone);
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
                    contentContainerStyle={{ paddingTop: headerOffset + 16, paddingBottom: insets.bottom + BOTTOM_BAR_CLEARANCE }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
                        {/* Intro */}
                        <View className="mb-6">
                            <TypeText variant="h1">Où livrons-nous ?</TypeText>
                            <TypeText variant="body" tone="secondary" className="mt-2">
                                Confirmez le point de livraison. À N'Djamena, une bonne description vaut mieux qu'une rue.
                            </TypeText>
                        </View>

                        {selectedAddress ? (
                            <>
                                {/* Address and ETA are one group: where we go and
                                    when we arrive. Two cards for four facts was the
                                    single tallest block of the flow. */}
                                <Card className="mb-6 overflow-hidden">
                                    <Pressable
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            router.push('/addresses');
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Changer d'adresse de livraison"
                                        className="flex-row items-center gap-3 p-4 active:bg-fill"
                                    >
                                        <View
                                            className="w-11 h-11 rounded-card items-center justify-center"
                                            style={{ backgroundColor: COLORS.accentSoft }}
                                        >
                                            <MapPin color={COLORS.accent} size={20} />
                                        </View>
                                        <View className="flex-1">
                                            <TypeText variant="eyebrow" tone="tertiary">Livraison à</TypeText>
                                            <TypeText variant="h3" numberOfLines={1}>{selectedAddress.locality}</TypeText>
                                            <TypeText variant="caption" tone="secondary" numberOfLines={1} className="mt-0.5">
                                                {selectedAddress.description}
                                            </TypeText>
                                        </View>
                                        <Pencil color={COLORS.inkFaint} size={17} />
                                    </Pressable>

                                    {eta ? (
                                        <>
                                            <Divider />
                                            <View className="flex-row items-center gap-3 px-4 py-3">
                                                <Clock color={COLORS.inkMuted} size={17} />
                                                <TypeText variant="body" tone="secondary" className="flex-1">
                                                    Temps estimé
                                                </TypeText>
                                                <TypeText variant="body" className="font-labelbold">~{eta} min</TypeText>
                                            </View>
                                        </>
                                    ) : null}
                                </Card>

                                {/* The restaurant calls this number on arrival, so it
                                    carries the same weight as the address itself. */}
                                <Field
                                    label="Numéro de téléphone"
                                    icon={Phone}
                                    placeholder="66 12 34 56"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={(v) => {
                                        setPhone(v);
                                        if (phoneError && isValidChadPhone(v)) setPhoneError(null);
                                    }}
                                    maxLength={20}
                                    error={phoneError}
                                    helper="Le restaurant vous appellera à ce numéro en arrivant."
                                    className="mb-6"
                                />

                                <Field
                                    label="Instructions pour le livreur"
                                    placeholder="Ex : Portail bleu face à la pharmacie, appelez en arrivant…"
                                    multiline
                                    value={note}
                                    onChangeText={setNote}
                                    maxLength={180}
                                    counter={`${note.length}/180`}
                                    helper="Optionnel"
                                />
                            </>
                        ) : (
                            /* Empty state */
                            <View className="bg-white rounded-panel border border-hairline px-6 py-10 items-center">
                                <View className="w-16 h-16 rounded-full bg-accent/10 items-center justify-center mb-4">
                                    <AlertCircle color="#FF5733" size={28} />
                                </View>
                                <Text className="font-heading text-h3 text-ink text-center">
                                    Aucune adresse enregistrée
                                </Text>
                                <Text className="text-body text-center text-ink-muted font-body mt-2 mb-6 leading-relaxed">
                                    Ajoutez une adresse de livraison pour continuer.
                                </Text>
                                <Pressable
                                    onPress={() => router.push('/addresses')}
                                    className="bg-ink px-8 py-4 rounded-full active:scale-95"
                                >
                                    <Text className="text-white font-labelbold text-caption uppercase tracking-[0.08em]">
                                        Choisir une adresse
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <BottomActionBar>
                <Button
                    label={selectedAddress ? 'Vers le paiement' : 'Ajouter une adresse'}
                    onPress={handleContinue}
                    variant="dark"
                    trailing={<ArrowRight color="#fff" size={20} />}
                />
            </BottomActionBar>
        </View>
    );
}

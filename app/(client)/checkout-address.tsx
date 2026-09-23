import React, { useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, ArrowRight, Clock, Pencil, Phone } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { useAddressStore } from '../../src/store/addressStore';
import { getEstimatedDeliveryTime } from '../../src/lib/localities';
import { verifiedAccountPhone } from '../../src/lib/phoneAuth';
import { isValidChadPhone, normalizeChadPhone } from '../../src/lib/phone';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import {
    Button, Card, Divider, EmptyState, Field, TypeText,
    BottomActionBar, BOTTOM_BAR_CLEARANCE, SCREEN_GUTTER } from '../../src/components/ui';
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
        const remembered = previousDelivery?.phone || verifiedAccountPhone(user) || user?.user_metadata?.delivery_phone || user?.user_metadata?.phone || '';
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

            {/* The view starts at y = 0 under the absolute header: no vertical offset. */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingTop: headerOffset + 16, paddingBottom: insets.bottom + BOTTOM_BAR_CLEARANCE }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
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
                                        className="flex-row items-center p-4 active:bg-fill" style={{ gap: 12 }}
                                    >
                                        <View className="w-11 h-11 rounded-card items-center justify-center bg-accent-soft">
                                            <MapPin color={COLORS.accentDark} size={20} strokeWidth={2} />
                                        </View>
                                        <View className="flex-1">
                                            <TypeText variant="eyebrow" tone="tertiary">Livraison à</TypeText>
                                            <TypeText variant="h3" numberOfLines={1}>{selectedAddress.locality}</TypeText>
                                            <TypeText variant="caption" tone="secondary" numberOfLines={1} className="mt-1">
                                                {selectedAddress.description}
                                            </TypeText>
                                        </View>
                                        <Pencil color={COLORS.inkFaint} size={16} strokeWidth={2} />
                                    </Pressable>

                                    {eta ? (
                                        <>
                                            <Divider />
                                            <View className="flex-row items-center px-4 py-3" style={{ gap: 12 }}>
                                                <Clock color={COLORS.inkMuted} size={16} strokeWidth={2} />
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
                                    label="Numéro pour la livraison"
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
                                    autoComplete="tel"
                                    textContentType="telephoneNumber"
                                    helper="Le restaurant appellera ce numéro à l’arrivée. Votre compte n’est pas modifié."
                                    className="mb-6"
                                />

                                <Field
                                    label="Instructions pour la livraison"
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
                            <EmptyState
                                icon={MapPin}
                                title="Aucune adresse enregistrée"
                                message="Ajoutez un point de livraison pour continuer."
                                action={<Button label="Choisir une adresse" variant="secondary" onPress={() => router.push('/addresses')} />}
                                className="py-8"
                            />
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <BottomActionBar>
                <Button
                    label={selectedAddress ? 'Vers le paiement' : 'Ajouter une adresse'}
                    onPress={handleContinue}
                    trailing={<ArrowRight color={COLORS.white} size={20} strokeWidth={2} />}
                />
            </BottomActionBar>
        </View>
    );
}

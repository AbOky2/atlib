import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Plus, Check, Clock, Trash2, Lightbulb, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { NDJAMENA_LOCALITIES, getEstimatedDeliveryTime, type Locality } from '../../src/lib/localities';
import { useAddressStore, type SavedAddress } from '../../src/store/addressStore';
import { useCartStore } from '../../src/store/cartStore';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { Button, Card, EmptyState, Field, SearchField, TypeText, BottomActionBar, BOTTOM_BAR_CLEARANCE, SCREEN_GUTTER, TOUCH_MIN } from '../../src/components/ui';
import { COLORS } from '../../src/lib/palette';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateNext = () =>
    LayoutAnimation.configureNext({
        duration: 380,
        create: { type: LayoutAnimation.Types.easeOut, property: LayoutAnimation.Properties.opacity, duration: 200 },
        update: { type: LayoutAnimation.Types.spring, springDamping: 0.85 },
        delete: { type: LayoutAnimation.Types.easeIn, property: LayoutAnimation.Properties.opacity, duration: 120 },
    });

/** One saved address — selectable card with quiet delete. */
function AddressCard({ address, selected, onSelect, onRemove }: {
    address: SavedAddress; selected: boolean; onSelect: () => void; onRemove: () => void;
}) {
    const eta = getEstimatedDeliveryTime(address.locality);
    return (
        <Pressable
            onPress={onSelect}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${address.locality}, ${address.description}${selected ? ', adresse actuelle' : ''}`}
            className={`bg-surface rounded-panel p-4 active:scale-[0.99] ${selected ? 'border-2 border-ink' : 'border border-hairline'}`}
        >
            <View className="flex-row items-start" style={{ gap: 16 }}>
                <View className={`w-11 h-11 rounded-card items-center justify-center ${selected ? 'bg-accent-soft' : 'bg-fill'}`}>
                    <MapPin color={selected ? COLORS.accentDark : COLORS.ink} size={20} strokeWidth={2} />
                </View>
                <View className="flex-1">
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                        <Text className="text-bodylg font-heading tracking-tight text-ink flex-shrink" numberOfLines={1}>{address.locality}</Text>
                        {selected && (
                            <View className="w-5 h-5 rounded-full bg-ink items-center justify-center">
                                <Check color={COLORS.white} size={12} strokeWidth={3} />
                            </View>
                        )}
                    </View>
                    <TypeText tone="secondary" className="mt-1" numberOfLines={2}>{address.description}</TypeText>
                    <View className="flex-row items-center mt-2" style={{ gap: 4 }}>
                        <Clock color={COLORS.inkFaint} size={14} strokeWidth={2} />
                        <TypeText variant="caption" tone="tertiary">Livraison ~{eta} min</TypeText>
                    </View>
                </View>
                <Pressable
                    onPress={onRemove}
                    accessibilityRole="button"
                    accessibilityLabel={`Supprimer l'adresse ${address.locality}`}
                    className="rounded-full items-center justify-center active:bg-fill -mr-2 -mt-2"
                    style={{ width: TOUCH_MIN, height: TOUCH_MIN }}
                >
                    <Trash2 color={COLORS.inkFaint} size={18} strokeWidth={2} />
                </Pressable>
            </View>
        </Pressable>
    );
}

export default function AddressesScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const { savedAddresses, currentAddress, selectAddress, addAddress, removeAddress } = useAddressStore();
    const showToast = useCartStore((s) => s.showToast);
    const showDialog = useCartStore((s) => s.showDialog);

    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newLocality, setNewLocality] = useState<Locality | null>(null);
    const [newDescription, setNewDescription] = useState('');

    const handleSelectExisting = (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        selectAddress(id);
        router.back();
    };

    const handleRemove = (address: SavedAddress) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDialog({
            title: 'Supprimer cette adresse ?',
            message: `${address.locality} — ${address.description}`,
            confirmText: 'Supprimer',
            cancelText: 'Garder',
            destructive: true,
            onConfirm: () => {
                animateNext();
                removeAddress(address.id);
                showToast('Adresse supprimée');
            },
        });
    };

    const handleSaveNew = () => {
        if (!newLocality || !newDescription.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        addAddress({ locality: newLocality.name, description: newDescription.trim() });
        showToast('Adresse enregistrée');
        setIsAddingNew(false);
        setNewLocality(null);
        setNewDescription('');
        router.back();
    };

    const enterAddMode = (adding: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        animateNext();
        setIsAddingNew(adding);
        setSearchQuery('');
        if (!adding) {
            setNewLocality(null);
            setNewDescription('');
        }
    };

    const filteredLocalities = useMemo(
        () => NDJAMENA_LOCALITIES.filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase())),
        [searchQuery],
    );

    const visibleSaved = savedAddresses.filter(
        (a) =>
            !searchQuery.trim() ||
            a.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const canSave = !!newLocality && newDescription.trim().length >= 8;

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title={isAddingNew ? 'Nouvelle adresse' : 'Adresses'}
                back="arrow"
                onBack={() => (isAddingNew ? enterAddMode(false) : router.back())}
                centerTitle
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: headerOffset + 16, paddingBottom: insets.bottom + BOTTOM_BAR_CLEARANCE }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    {!isAddingNew ? (
                        <>
                            <View className="mb-6">
                                <TypeText variant="h1">Où vous livrer ?</TypeText>
                                <TypeText tone="secondary" className="mt-2">Vos points de livraison enregistrés, prêts en un geste.</TypeText>
                            </View>

                            {savedAddresses.length > 0 ? (
                                <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Rechercher une adresse" className="mb-6" />
                            ) : null}

                            {visibleSaved.length === 0 ? (
                                <EmptyState
                                    icon={MapPin}
                                    title={searchQuery ? 'Aucun résultat' : 'Aucune adresse enregistrée'}
                                    message={searchQuery ? 'Essayez un autre terme.' : 'Ajoutez votre premier point de livraison.'}
                                    className="py-12"
                                />
                            ) : (
                                <View className="" style={{ gap: 16 }}>
                                    {visibleSaved.map((addr) => (
                                        <AddressCard
                                            key={addr.id}
                                            address={addr}
                                            selected={currentAddress?.id === addr.id}
                                            onSelect={() => handleSelectExisting(addr.id)}
                                            onRemove={() => handleRemove(addr)}
                                        />
                                    ))}
                                </View>
                            )}
                        </>
                    ) : !newLocality ? (
                        <>
                            {/* Step 1 — pick the quartier */}
                            <View className="mb-6">
                                <TypeText variant="eyebrow" tone="tertiary" className="mb-1">Étape 1 sur 2</TypeText>
                                <TypeText variant="h1">Votre quartier</TypeText>
                            </View>

                            <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Rechercher un quartier" autoFocus className="mb-5" />

                            <Card className="overflow-hidden">
                                {filteredLocalities.length === 0 && (
                                    <View className="items-center py-10">
                                        <TypeText tone="tertiary">Aucun quartier trouvé.</TypeText>
                                    </View>
                                )}
                                {filteredLocalities.map((loc, i) => (
                                    <Pressable
                                        key={loc.id}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            animateNext();
                                            setNewLocality(loc);
                                            setSearchQuery('');
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${loc.name}, livraison environ ${loc.baseDeliveryTimeMins} minutes`}
                                        className={`flex-row items-center px-4 active:bg-fill ${i < filteredLocalities.length - 1 ? 'border-b border-hairline' : ''}`}
                                        style={{ minHeight: 64 }}
                                    >
                                        <View className="w-10 h-10 rounded-full bg-fill items-center justify-center mr-4">
                                            <MapPin color={COLORS.ink} size={18} strokeWidth={2} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-heading text-body text-ink">{loc.name}</Text>
                                            <TypeText variant="caption" tone="tertiary" className="mt-1">Livraison ~{loc.baseDeliveryTimeMins} min</TypeText>
                                        </View>
                                        <ChevronRight color={COLORS.inkFaint} size={18} strokeWidth={2} />
                                    </Pressable>
                                ))}
                            </Card>
                        </>
                    ) : (
                        <>
                            {/* Step 2 — describe the spot */}
                            <View className="mb-6">
                                <TypeText variant="eyebrow" tone="tertiary" className="mb-1">Étape 2 sur 2</TypeText>
                                <TypeText variant="h1">Décrivez le point exact</TypeText>
                            </View>

                            {/* Chosen quartier */}
                            <Card className="p-4 flex-row items-center mb-5" style={{ gap: 16 }}>
                                <View className="w-11 h-11 rounded-card items-center justify-center bg-accent-soft">
                                    <MapPin color={COLORS.accentDark} size={20} strokeWidth={2} />
                                </View>
                                <View className="flex-1">
                                    <Text className="font-heading text-bodylg text-ink">{newLocality.name}</Text>
                                    <TypeText variant="caption" tone="tertiary" className="mt-1">Livraison ~{newLocality.baseDeliveryTimeMins} min</TypeText>
                                </View>
                                <Pressable
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        animateNext();
                                        setNewLocality(null);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Changer de quartier"
                                    className="justify-center px-2"
                                    style={{ minHeight: TOUCH_MIN }}
                                >
                                    <Text className="text-caption font-labelbold text-ink underline">Changer</Text>
                                </Pressable>
                            </Card>

                            <Field
                                label="Repère précis"
                                placeholder="Ex : Portail bleu face à la pharmacie centrale, 2ᵉ rue après le rond-point…"
                                multiline
                                value={newDescription}
                                onChangeText={setNewDescription}
                                maxLength={180}
                                counter={`${newDescription.length}/180`}
                                helper="8 caractères minimum."
                                autoFocus
                                className="mb-4"
                            />

                            {/* Tip */}
                            <View className="flex-row items-start bg-fill rounded-card px-4 py-3" style={{ gap: 12 }}>
                                <Lightbulb color={COLORS.accentDark} size={16} strokeWidth={2} style={{ marginTop: 2 }} />
                                <TypeText variant="caption" tone="secondary" className="flex-1">
                                    À N’Djamena, un bon repère vaut mieux qu’un nom de rue : portail, couleur du mur, commerce voisin…
                                </TypeText>
                            </View>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <BottomActionBar>
                {!isAddingNew ? (
                    <Button
                        label="Ajouter une adresse"
                        onPress={() => enterAddMode(true)}
                        leading={<Plus color={COLORS.white} size={18} strokeWidth={2.5} />}
                    />
                ) : (
                    <Button
                        label={newLocality ? 'Enregistrer l’adresse' : 'Choisissez un quartier'}
                        onPress={handleSaveNew}
                        disabled={!canSave}
                    />
                )}
            </BottomActionBar>
        </View>
    );
}

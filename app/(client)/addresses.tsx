import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Search, Plus, Check, Clock, Trash2, Lightbulb, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { NDJAMENA_LOCALITIES, getEstimatedDeliveryTime, type Locality } from '../../src/lib/localities';
import { useAddressStore, type SavedAddress } from '../../src/store/addressStore';
import { useCartStore } from '../../src/store/cartStore';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { shadowSoft, shadowFloat } from '../../src/lib/elevation';
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
function AddressCard({
    address,
    selected,
    onSelect,
    onRemove,
}: {
    address: SavedAddress;
    selected: boolean;
    onSelect: () => void;
    onRemove: () => void;
}) {
    const eta = getEstimatedDeliveryTime(address.locality);
    return (
        <Pressable
            onPress={onSelect}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`bg-white rounded-3xl p-5 active:scale-[0.99] ${
                selected ? 'border-2 border-[#1c1b1b]' : 'border border-surface-container-highest'
            }`}
            style={shadowSoft}
        >
            <View className="flex-row items-start gap-4">
                <View
                    className="w-11 h-11 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: selected ? COLORS.accentTint : COLORS.fill }}
                >
                    <MapPin color={selected ? COLORS.accent : COLORS.ink} size={20} />
                </View>
                <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                        <Text className="text-base font-heading tracking-tight text-ink">{address.locality}</Text>
                        {selected && (
                            <View className="w-5 h-5 rounded-full bg-[#1c1b1b] items-center justify-center">
                                <Check color="#fff" size={12} strokeWidth={3} />
                            </View>
                        )}
                    </View>
                    <Text className="text-sm text-ink-muted font-body leading-relaxed mt-1" numberOfLines={2}>
                        {address.description}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-2.5">
                        <Clock color={COLORS.inkFaint} size={12} />
                        <Text className="text-[11px] font-label text-ink-faint">Livraison ~{eta} min</Text>
                    </View>
                </View>
                <Pressable
                    onPress={(e) => {
                        e.stopPropagation?.();
                        onRemove();
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Supprimer l'adresse ${address.locality}`}
                    className="w-9 h-9 rounded-full items-center justify-center active:bg-surface-container-low"
                >
                    <Trash2 color={COLORS.inkFaint} size={16} />
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
                    contentContainerStyle={{ paddingTop: headerOffset + 16, paddingBottom: insets.bottom + 140 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {!isAddingNew ? (
                        <View className="px-6">
                            {/* Intro */}
                            <View className="mb-6">
                                <Text className="font-title text-3xl tracking-tight text-ink">Où vous livrer ?</Text>
                                <Text className="text-ink-muted mt-2 text-sm font-body leading-relaxed">
                                    Vos points de livraison enregistrés, prêts en un geste.
                                </Text>
                            </View>

                            {/* Search */}
                            <View className="bg-white rounded-full border border-surface-container-highest flex-row items-center px-5 h-13 mb-6" style={{ height: 52 }}>
                                <Search color={COLORS.inkFaint} size={19} />
                                <TextInput
                                    className="flex-1 ml-3 font-body text-[15px] text-ink"
                                    placeholder="Rechercher une adresse"
                                    placeholderTextColor={COLORS.inkFaint}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    style={{ paddingVertical: 0 }}
                                />
                            </View>

                            {/* Saved addresses */}
                            {visibleSaved.length === 0 ? (
                                <View className="bg-white rounded-sheet border border-surface-container-highest px-6 py-12 items-center">
                                    <View className="w-16 h-16 rounded-full bg-[#FF5733]/10 items-center justify-center mb-4">
                                        <MapPin color={COLORS.accent} size={26} />
                                    </View>
                                    <Text className="font-heading text-lg text-ink text-center">
                                        {searchQuery ? 'Aucun résultat' : 'Aucune adresse enregistrée'}
                                    </Text>
                                    <Text className="text-sm text-center text-ink-muted font-body mt-2 leading-relaxed">
                                        {searchQuery
                                            ? 'Essayez un autre terme.'
                                            : 'Ajoutez votre premier point de livraison.'}
                                    </Text>
                                </View>
                            ) : (
                                <View className="gap-3.5">
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
                        </View>
                    ) : (
                        <View className="px-6">
                            {!newLocality ? (
                                <>
                                    {/* Step 1 — pick the quartier */}
                                    <View className="mb-6">
                                        <Text className="text-[11px] font-label uppercase tracking-[0.08em] text-ink-faint mb-1">
                                            Étape 1 sur 2
                                        </Text>
                                        <Text className="font-title text-3xl tracking-tight text-ink">
                                            Votre quartier
                                        </Text>
                                    </View>

                                    <View className="bg-white rounded-full border border-surface-container-highest flex-row items-center px-5 mb-5" style={{ height: 52 }}>
                                        <Search color={COLORS.inkFaint} size={19} />
                                        <TextInput
                                            className="flex-1 ml-3 font-body text-[15px] text-ink"
                                            placeholder="Rechercher un quartier…"
                                            placeholderTextColor={COLORS.inkFaint}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            autoFocus
                                            style={{ paddingVertical: 0 }}
                                        />
                                    </View>

                                    <View className="bg-white rounded-sheet border border-surface-container-highest overflow-hidden">
                                        {filteredLocalities.length === 0 && (
                                            <View className="items-center py-10">
                                                <Text className="text-ink-faint text-sm font-body">Aucun quartier trouvé.</Text>
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
                                                className={`flex-row items-center px-5 py-4 active:bg-surface-container-low ${
                                                    i < filteredLocalities.length - 1 ? 'border-b border-surface-container-highest' : ''
                                                }`}
                                            >
                                                <View className="w-10 h-10 rounded-full bg-surface-container-low items-center justify-center mr-4">
                                                    <MapPin color={COLORS.ink} size={18} />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="font-heading text-[15px] text-ink">{loc.name}</Text>
                                                    <Text className="text-[11px] font-label text-ink-faint mt-0.5">
                                                        Livraison ~{loc.baseDeliveryTimeMins} min
                                                    </Text>
                                                </View>
                                                <ChevronRight color={COLORS.inkFaint} size={18} />
                                            </Pressable>
                                        ))}
                                    </View>
                                </>
                            ) : (
                                <>
                                    {/* Step 2 — describe the spot */}
                                    <View className="mb-6">
                                        <Text className="text-[11px] font-label uppercase tracking-[0.08em] text-ink-faint mb-1">
                                            Étape 2 sur 2
                                        </Text>
                                        <Text className="font-title text-3xl tracking-tight text-ink">
                                            Décrivez le point exact
                                        </Text>
                                    </View>

                                    {/* Chosen quartier */}
                                    <View className="bg-white rounded-3xl border border-surface-container-highest p-4 flex-row items-center gap-4 mb-5">
                                        <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: COLORS.accentTint }}>
                                            <MapPin color={COLORS.accent} size={20} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-heading text-base text-ink">{newLocality.name}</Text>
                                            <Text className="text-[11px] font-label text-ink-faint mt-0.5">
                                                Livraison ~{newLocality.baseDeliveryTimeMins} min
                                            </Text>
                                        </View>
                                        <Pressable
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                animateNext();
                                                setNewLocality(null);
                                            }}
                                            hitSlop={8}
                                        >
                                            <Text className="text-xs font-labelbold text-ink underline">Changer</Text>
                                        </Pressable>
                                    </View>

                                    {/* Description */}
                                    <View className="bg-white rounded-3xl border border-surface-container-highest mb-3">
                                        <TextInput
                                            className="px-5 py-4 text-[15px] font-body text-ink min-h-[110px]"
                                            placeholder="Ex : Portail bleu face à la pharmacie centrale, 2ᵉ rue après le rond-point…"
                                            placeholderTextColor={COLORS.inkFaint}
                                            multiline
                                            textAlignVertical="top"
                                            value={newDescription}
                                            onChangeText={setNewDescription}
                                            maxLength={180}
                                            autoFocus
                                        />
                                        <Text className="text-[10px] text-ink-faint font-body text-right px-5 pb-3">
                                            {newDescription.length}/180
                                        </Text>
                                    </View>

                                    {/* Tip */}
                                    <View className="flex-row items-start gap-3 bg-surface-container-low rounded-2xl px-4 py-3.5">
                                        <Lightbulb color={COLORS.accent} size={16} style={{ marginTop: 1 }} />
                                        <Text className="flex-1 text-[12px] font-body text-ink-muted leading-relaxed">
                                            À N'Djamena, un bon repère vaut mieux qu'un nom de rue : portail,
                                            couleur du mur, commerce voisin…
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom action */}
            <View
                className="absolute bottom-0 left-0 right-0 bg-white/95 border-t border-surface-container-highest px-6"
                style={{ paddingBottom: Math.max(insets.bottom, 20), paddingTop: 16 }}
            >
                {!isAddingNew ? (
                    <Pressable
                        onPress={() => enterAddMode(true)}
                        accessibilityRole="button"
                        className="w-full h-14 rounded-full flex-row items-center justify-center gap-2.5 bg-[#1c1b1b] active:scale-[0.98]"
                        style={shadowFloat}
                    >
                        <Plus color="#fff" size={18} strokeWidth={2.5} />
                        <Text className="text-sm font-labelbold text-white">Ajouter une adresse</Text>
                    </Pressable>
                ) : (
                    <Pressable
                        onPress={handleSaveNew}
                        disabled={!canSave}
                        accessibilityRole="button"
                        className={`w-full h-14 rounded-full items-center justify-center active:scale-[0.98] ${
                            canSave ? 'bg-[#1c1b1b]' : 'bg-surface-container-highest'
                        }`}
                        style={canSave ? shadowFloat : undefined}
                    >
                        <Text className={`text-sm font-labelbold ${canSave ? 'text-white' : 'text-ink-faint'}`}>
                            {newLocality ? "Enregistrer l'adresse" : 'Choisissez un quartier'}
                        </Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

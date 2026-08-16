import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Animated,
    PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Minus, Plus, Utensils } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { Dish } from '../data/types';
import { shadowSheet } from '../lib/elevation';
import { RemoteImage } from './RemoteImage';
import { formatXaf as formatPrice } from '../lib/pricing';

/**
 * A single option a dish can expose (drink, supplement, condiment…). The DB has
 * no options table yet, so `dish.options` is always empty today and the modal
 * degrades to quantity + special instructions. The structure is here so options
 * render automatically the day a real options source is added — no fabricated data.
 */
export interface DishOption {
    id: string;
    label: string;
    priceDelta?: number;
}
export interface DishOptionGroup {
    id: string;
    title: string;
    /** How many options can be selected: undefined/1 = single choice, >1 = multi. */
    max?: number;
    required?: boolean;
    options: DishOption[];
}

interface DishCustomizationModalProps {
    dish: (Dish & { optionGroups?: DishOptionGroup[] }) | null;
    restaurantName?: string;
    onClose: () => void;
    onConfirm: (payload: { quantity: number; note?: string; options?: string[]; unitPrice: number }) => void;
}

export function DishCustomizationModal({ dish, restaurantName, onClose, onConfirm }: DishCustomizationModalProps) {
    const insets = useSafeAreaInsets();
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [selected, setSelected] = useState<Record<string, string[]>>({});

    const visible = !!dish;

    // Swipe-down-to-dismiss: the drag handle owns the gesture so it never fights
    // the inner ScrollView.
    const dragY = useRef(new Animated.Value(0)).current;
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_e, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
            onPanResponderMove: (_e, g) => {
                if (g.dy > 0) dragY.setValue(g.dy);
            },
            onPanResponderRelease: (_e, g) => {
                if (g.dy > 110 || g.vy > 0.6) {
                    Animated.timing(dragY, { toValue: 600, duration: 180, useNativeDriver: true }).start(() => onClose());
                } else {
                    Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
                }
            },
        }),
    ).current;

    // Reset transient state whenever a new dish is opened.
    useEffect(() => {
        if (dish) {
            setQuantity(1);
            setNote('');
            setSelected({});
            dragY.setValue(0);
        }
    }, [dish?.id]);

    const groups = dish?.optionGroups ?? [];

    const optionsDelta = useMemo(() => {
        let delta = 0;
        for (const g of groups) {
            for (const optId of selected[g.id] ?? []) {
                const opt = g.options.find((o) => o.id === optId);
                if (opt?.priceDelta) delta += opt.priceDelta;
            }
        }
        return delta;
    }, [groups, selected]);

    // Render NOTHING when there is no dish.
    //
    // This used to return `<Modal visible={false} />`, which still mounts a
    // native modal host. On iOS that host can survive the screen being popped
    // and re-pushed, leaving an invisible full-screen view that swallows every
    // touch — the blank, unresponsive screen seen when opening a restaurant a
    // second time. A modal that isn't needed should not exist.
    if (!dish) return null;

    const unitPrice = dish.price_xaf + optionsDelta;
    const total = unitPrice * quantity;

    const selectedLabels = groups
        .flatMap((g) => (selected[g.id] ?? []).map((id) => g.options.find((o) => o.id === id)?.label))
        .filter(Boolean) as string[];

    const toggleOption = (group: DishOptionGroup, optId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelected((prev) => {
            const current = prev[group.id] ?? [];
            const max = group.max ?? 1;
            let next: string[];
            if (current.includes(optId)) {
                next = current.filter((id) => id !== optId);
            } else if (max === 1) {
                next = [optId];
            } else {
                next = current.length >= max ? current : [...current, optId];
            }
            return { ...prev, [group.id]: next };
        });
    };

    const handleConfirm = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onConfirm({
            quantity,
            note: note.trim() || undefined,
            options: selectedLabels.length ? selectedLabels : undefined,
            unitPrice,
        });
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            {/* The sheet is anchored to the bottom of a full-height container, so
                it reaches the physical edge of the screen.
                It used to sit inside a KeyboardAvoidingView that had no height of
                its own, which made `maxHeight: '90%'` resolve against nothing: the
                sheet floated with a strip of the page still visible underneath —
                and the action bar looked detached from the card it belongs to. */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1, justifyContent: 'flex-end' }}
            >
                {/* Backdrop — tap anywhere outside the sheet to close. */}
                <Pressable
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
                    onPress={onClose}
                    accessibilityLabel="Fermer"
                />

                <Animated.View
                    className="bg-white rounded-t-sheet overflow-hidden"
                    style={{ maxHeight: '92%', transform: [{ translateY: dragY }], ...shadowSheet }}
                >
                        {/* The whole image header IS the swipe-to-dismiss zone — a big target,
                            and it lives OUTSIDE the ScrollView so the pan never fights scrolling. */}
                        <View
                            {...panResponder.panHandlers}
                            className="relative w-full h-56 bg-fill-strong items-center justify-center"
                        >
                            {dish.image_url ? (
                                <RemoteImage uri={dish.image_url} displayWidth={430} className="w-full h-full" />
                            ) : (
                                <Utensils color="#a8a29e" size={48} />
                            )}
                            {/* Grabber */}
                            <View className="absolute top-2.5 left-0 right-0 items-center">
                                <View className="w-10 h-1.5 rounded-full bg-white/70" />
                            </View>
                            {/* Close */}
                            <Pressable
                                onPress={onClose}
                                hitSlop={10}
                                style={{ top: insets.top > 20 ? 12 : insets.top + 12 }}
                                className="absolute left-4 w-10 h-10 rounded-full bg-white items-center justify-center active:scale-95"
                            >
                                <X color="#1c1b1b" size={22} />
                            </Pressable>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            bounces={false}
                        >
                            <View className="px-6 pt-6">
                                {restaurantName ? (
                                    <Text className="text-eyebrow font-label uppercase tracking-[0.08em] text-ink-faint mb-2">
                                        {restaurantName}
                                    </Text>
                                ) : null}
                                <Text className="text-h1 font-display tracking-tight text-ink">
                                    {dish.name}
                                </Text>
                                {dish.short_description ? (
                                    <Text className="text-body text-ink-muted font-body leading-relaxed mt-2">
                                        {dish.short_description}
                                    </Text>
                                ) : null}
                                <Text className="text-h3 font-title text-ink mt-3">
                                    {formatPrice(dish.price_xaf)}
                                </Text>

                                {/* Option groups (rendered only if the dish actually has them) */}
                                {groups.map((group) => (
                                    <View key={group.id} className="mt-7">
                                        <View className="flex-row items-center justify-between mb-3">
                                            <Text className="text-bodylg font-heading text-ink">
                                                {group.title}
                                            </Text>
                                            {group.required ? (
                                                <View className="bg-ink px-2 py-0.5 rounded-full">
                                                    <Text className="text-eyebrow font-label uppercase tracking-[0.08em] text-white">
                                                        Requis
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        <View className="gap-2">
                                            {group.options.map((opt) => {
                                                const isSel = (selected[group.id] ?? []).includes(opt.id);
                                                return (
                                                    <Pressable
                                                        key={opt.id}
                                                        onPress={() => toggleOption(group, opt.id)}
                                                        className={`flex-row items-center justify-between px-4 py-3.5 rounded-card border ${
                                                            isSel
                                                                ? 'border-ink bg-fill'
                                                                : 'border-hairline bg-white'
                                                        }`}
                                                    >
                                                        <Text className="text-body font-label text-ink flex-1 pr-3">
                                                            {opt.label}
                                                        </Text>
                                                        <View className="flex-row items-center gap-3">
                                                            {opt.priceDelta ? (
                                                                <Text className="text-caption font-labelbold text-ink-muted">
                                                                    +{formatPrice(opt.priceDelta)}
                                                                </Text>
                                                            ) : null}
                                                            <View
                                                                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                                                                    isSel ? 'border-ink bg-ink' : 'border-hairline'
                                                                }`}
                                                            >
                                                                {isSel ? (
                                                                    <View className="w-2 h-2 rounded-full bg-white" />
                                                                ) : null}
                                                            </View>
                                                        </View>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    </View>
                                ))}

                                {/* Special instructions — always available, real free text */}
                                <View className="mt-7">
                                    <Text className="text-bodylg font-heading text-ink mb-1">
                                        Instructions spéciales
                                    </Text>
                                    <Text className="text-caption text-ink-faint font-body mb-3">
                                        Une demande particulière pour ce plat ? (optionnel)
                                    </Text>
                                    <View className="bg-fill rounded-card border border-hairline">
                                        <TextInput
                                            className="px-4 py-3.5 text-body font-body text-ink min-h-[76px]"
                                            placeholder="Ex : sans oignon, sauce à part…"
                                            placeholderTextColor="#8d8a87"
                                            multiline
                                            textAlignVertical="top"
                                            value={note}
                                            onChangeText={setNote}
                                            maxLength={160}
                                        />
                                    </View>
                                </View>

                            </View>

                            <View style={{ height: 24 }} />
                        </ScrollView>

                        {/* Sticky action bar — stepper + CTA on one line (the Eats pattern). */}
                        <View
                            className="px-5 border-t border-hairline bg-white flex-row items-center gap-3"
                            style={{ paddingBottom: Math.max(insets.bottom, 16), paddingTop: 14 }}
                        >
                            <View className="flex-row items-center bg-fill rounded-full p-1" style={{ height: 50 }}>
                                <Pressable
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setQuantity((q) => Math.max(1, q - 1));
                                    }}
                                    hitSlop={6}
                                    accessibilityRole="button"
                                    accessibilityLabel="Réduire la quantité"
                                    className="w-10 h-10 rounded-full bg-white items-center justify-center active:scale-95 border border-hairline"
                                >
                                    <Minus color={quantity <= 1 ? '#c4c7c7' : '#1c1b1b'} size={18} />
                                </Pressable>
                                <Text className="w-9 text-center text-bodylg font-title text-ink">
                                    {quantity}
                                </Text>
                                <Pressable
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setQuantity((q) => Math.min(99, q + 1));
                                    }}
                                    hitSlop={6}
                                    accessibilityRole="button"
                                    accessibilityLabel="Augmenter la quantité"
                                    className="w-10 h-10 rounded-full bg-white items-center justify-center active:scale-95 border border-hairline"
                                >
                                    <Plus color="#1c1b1b" size={18} />
                                </Pressable>
                            </View>
                            <Pressable
                                onPress={handleConfirm}
                                accessibilityRole="button"
                                accessibilityLabel={`Ajouter au panier, ${formatPrice(total)}`}
                                className="flex-1 bg-ink rounded-full flex-row items-center justify-between px-5 active:scale-[0.98]"
                                style={{ height: 50 }}
                            >
                                <Text className="text-white font-labelbold text-body">Ajouter</Text>
                                <Text className="text-white font-title text-bodylg tracking-tight">
                                    {formatPrice(total)}
                                </Text>
                            </Pressable>
                        </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

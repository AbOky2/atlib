import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    useWindowDimensions,
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
    PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Utensils } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { Dish } from '../data/types';
import { shadowSheet } from '../lib/elevation';
import { RemoteImage } from './RemoteImage';
import { formatXaf as formatPrice } from '../lib/pricing';
import { COLORS } from '../lib/palette';
import { Button, Field, QuantityStepper, TypeText, SCREEN_GUTTER } from './ui';

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

/** The photo is the argument: tall enough to make the dish wanted, not a thumbnail. */
const DISH_PHOTO_HEIGHT = 236;

interface DishCustomizationModalProps {
    dish: (Dish & { optionGroups?: DishOptionGroup[] }) | null;
    restaurantName?: string;
    onClose: () => void;
    onConfirm: (payload: { quantity: number; note?: string; options?: string[]; unitPrice: number }) => void;
}

export function DishCustomizationModal({ dish, restaurantName, onClose, onConfirm }: DishCustomizationModalProps) {
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
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

                <Animated.View accessibilityViewIsModal
                    className="bg-surface rounded-t-sheet overflow-hidden"
                    style={{ maxHeight: height - insets.top - 16, transform: [{ translateY: dragY }], ...shadowSheet }}
                >
                        {/* The whole image header IS the swipe-to-dismiss zone — a big target,
                            and it lives OUTSIDE the ScrollView so the pan never fights scrolling. */}
                        <View
                            {...panResponder.panHandlers}
                            className="relative w-full bg-fill-strong items-center justify-center"
                            style={{ height: DISH_PHOTO_HEIGHT }}
                        >
                            {dish.image_url ? (
                                <RemoteImage uri={dish.image_url} displayWidth={430} className="w-full h-full" />
                            ) : (
                                <Utensils color={COLORS.inkFaint} size={48} strokeWidth={1.6} />
                            )}
                            {/* Grabber */}
                            <View className="absolute top-2 left-0 right-0 items-center">
                                <View className="w-10 h-1 rounded-full bg-white/70" />
                            </View>
                            {/* Close */}
                            <Pressable
                                onPress={onClose}
                                hitSlop={10}
                                accessibilityRole="button"
                                accessibilityLabel="Fermer"
                                style={{ top: insets.top > 20 ? 12 : insets.top + 12 }}
                                className="absolute left-4 w-11 h-11 rounded-full bg-surface items-center justify-center active:scale-95"
                            >
                                <X color={COLORS.ink} size={22} strokeWidth={2} />
                            </Pressable>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            bounces={false}
                        >
                            <View className="pt-5" style={{ paddingHorizontal: SCREEN_GUTTER }}>
                                {restaurantName ? (
                                    <TypeText variant="eyebrow" tone="tertiary" className="mb-2">{restaurantName}</TypeText>
                                ) : null}
                                {/* Name and price on one line: the two things a sheet must answer first. */}
                                <View className="flex-row items-start" style={{ gap: 16 }}>
                                    <Text className="flex-1 text-h2 font-title tracking-tight text-ink" accessibilityRole="header">
                                        {dish.name}
                                    </Text>
                                    <Text className="text-h3 font-title text-ink" style={{ paddingTop: 2 }}>
                                        {formatPrice(dish.price_xaf)}
                                    </Text>
                                </View>
                                {dish.short_description ? (
                                    <TypeText tone="secondary" className="mt-2">{dish.short_description}</TypeText>
                                ) : null}

                                {/* Option groups (rendered only if the dish actually has them) */}
                                {groups.map((group) => (
                                    <View key={group.id} className="mt-8">
                                        <View className="flex-row items-center justify-between mb-3">
                                            <Text className="text-bodylg font-heading text-ink">
                                                {group.title}
                                            </Text>
                                            {group.required ? (
                                                <View className="bg-ink px-2 py-1 rounded-full">
                                                    <Text className="text-eyebrow font-label uppercase tracking-eyebrow text-white">
                                                        Requis
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        <View className="" style={{ gap: 8 }}>
                                            {group.options.map((opt) => {
                                                const isSel = (selected[group.id] ?? []).includes(opt.id);
                                                return (
                                                    <Pressable
                                                        key={opt.id}
                                                        onPress={() => toggleOption(group, opt.id)}
                                                        accessibilityRole={(group.max ?? 1) > 1 ? 'checkbox' : 'radio'}
                                                        accessibilityState={{ checked: isSel }}
                                                        className={`flex-row items-center justify-between px-4 rounded-card border ${
                                                            isSel
                                                                ? 'border-ink bg-fill'
                                                                : 'border-hairline bg-surface'
                                                        }`}
                                                        style={{ minHeight: 52 }}
                                                    >
                                                        <Text className="text-body font-label text-ink flex-1 pr-3">
                                                            {opt.label}
                                                        </Text>
                                                        <View className="flex-row items-center" style={{ gap: 12 }}>
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
                                <Field
                                    label="Instructions spéciales"
                                    helper="Optionnel : sans oignon, sauce à part…"
                                    placeholder="Une demande particulière pour ce plat ?"
                                    multiline
                                    value={note}
                                    onChangeText={setNote}
                                    maxLength={160}
                                    counter={`${note.length}/160`}
                                    className="mt-6"
                                />

                            </View>

                            <View style={{ height: 24 }} />
                        </ScrollView>

                        {/* Sticky action bar — the shared stepper and CTA on one line. */}
                        <View
                            className="border-t border-hairline bg-surface flex-row items-center"
                            style={{ gap: 12, paddingHorizontal: SCREEN_GUTTER, paddingBottom: Math.max(insets.bottom, 16), paddingTop: 12 }}
                        >
                            <QuantityStepper value={quantity} onChange={setQuantity} />
                            <View className="flex-1">
                                <Button
                                    label="Ajouter"
                                    onPress={handleConfirm}
                                    trailing={<Text className="text-white font-title text-bodylg tracking-tight">{formatPrice(total)}</Text>}
                                    accessibilityLabel={`Ajouter au panier, ${quantity} × ${dish.name}, ${formatPrice(total)}`}
                                />
                            </View>
                        </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

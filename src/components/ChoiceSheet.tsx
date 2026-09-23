import React from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { TypeText, Button, TOUCH_MIN } from './ui';
import { shadowSheet } from '../lib/elevation';
import { COLORS } from '../lib/palette';

export interface ChoiceOption<K extends string> { key: K; label: string; hint?: string }

/**
 * A single-choice bottom sheet: « why ? » before a consequential action.
 *
 * Same geometry as GlobalDialog (28 pt sheet, 40×4 grabber, 24 pt gutter) so
 * the two surfaces read as one family. Each option is a full-width 56 pt row.
 */
export function ChoiceSheet<K extends string>({
    visible,
    title,
    message,
    options,
    selected,
    confirmLabel,
    destructive = false,
    busy = false,
    onSelect,
    onConfirm,
    onClose,
}: {
    visible: boolean;
    title: string;
    message?: string;
    options: readonly ChoiceOption<K>[];
    selected: K | null;
    confirmLabel: string;
    destructive?: boolean;
    busy?: boolean;
    onSelect: (key: K) => void;
    onConfirm: () => void;
    onClose: () => void;
}) {
    const insets = useSafeAreaInsets();
    if (!visible) return null;
    return (
        <Modal transparent animationType="fade" visible onRequestClose={onClose}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={busy ? undefined : onClose} accessibilityLabel="Fermer" />
            <View
                accessibilityViewIsModal
                className="bg-surface rounded-t-sheet px-6 pt-3"
                style={[shadowSheet, { paddingBottom: Math.max(insets.bottom, 20), maxHeight: '85%' }]}
            >
                <View className="items-center mb-5">
                    <View className="w-10 h-1 rounded-full bg-fill-strong" />
                </View>
                <TypeText variant="h2" className="text-center mb-2">{title}</TypeText>
                {message ? <TypeText tone="secondary" className="text-center mb-6 px-2">{message}</TypeText> : <View className="mb-4" />}
                <ScrollView bounces={false} className="mb-4">
                    {options.map((option) => {
                        const active = option.key === selected;
                        return (
                            <Pressable
                                key={option.key}
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(option.key); }}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: active }}
                                className={`flex-row items-center gap-4 px-4 rounded-card mb-2 ${active ? 'bg-ink' : 'bg-fill active:bg-fill-strong'}`}
                                style={{ minHeight: 56 }}
                            >
                                <View className="flex-1 py-3">
                                    <Text className={`text-body font-labelbold ${active ? 'text-white' : 'text-ink'}`}>{option.label}</Text>
                                    {option.hint ? <Text className={`text-caption font-body mt-1 ${active ? 'text-white/60' : 'text-ink-faint'}`}>{option.hint}</Text> : null}
                                </View>
                                <View className="items-center justify-center" style={{ width: TOUCH_MIN - 20, height: TOUCH_MIN - 20 }}>
                                    {active ? <Check color={COLORS.white} size={20} strokeWidth={2.4} /> : null}
                                </View>
                            </Pressable>
                        );
                    })}
                </ScrollView>
                <Button
                    label={confirmLabel}
                    variant={destructive ? 'destructive' : 'primary'}
                    disabled={selected === null}
                    loading={busy}
                    onPress={onConfirm}
                    className="mb-2"
                />
                <Button label="Retour" variant="secondary" onPress={onClose} disabled={busy} />
            </View>
        </Modal>
    );
}

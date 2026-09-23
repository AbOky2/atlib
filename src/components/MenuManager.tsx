import { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Utensils } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { setDishAvailability, useMenuDishes } from '../data/restaurantAdmin';
import type { MenuDish } from '../data/types';
import { useCartStore } from '../store/cartStore';
import { RemoteImage } from './RemoteImage';
import { EmptyState, TypeText, SCREEN_GUTTER } from './ui';
import { formatXaf } from '../lib/pricing';
import { COLORS } from '../lib/palette';

/**
 * Menu availability, from the kitchen's side.
 *
 * `dishes.is_available` has existed since the first schema, but nothing in the
 * product could write it: a restaurant that ran out of a dish had no way to say
 * so, and kept receiving orders for it. Paid in cash, that ends as a phone call
 * and a cancellation — the most expensive kind of disappointment, because the
 * customer already waited.
 *
 * Switching a dish off is optimistic: the toggle answers instantly, and rolls
 * back if the server refuses.
 */
export function MenuManager({ restaurantId }: { restaurantId: string | undefined }) {
    const { data: dishes, isLoading } = useMenuDishes(restaurantId);
    const queryClient = useQueryClient();
    const showToast = useCartStore((s) => s.showToast);
    const [pending, setPending] = useState<Record<string, boolean>>({});

    // Group by category so the kitchen scans its own menu, not an alphabet.
    const sections = useMemo(() => {
        const groups = new Map<string, MenuDish[]>();
        for (const dish of dishes ?? []) {
            const name = dish.categories?.name ?? 'Divers';
            const list = groups.get(name) ?? [];
            list.push(dish);
            groups.set(name, list);
        }
        return [...groups.entries()];
    }, [dishes]);

    const unavailableCount = (dishes ?? []).filter((d) => d.is_available === false).length;

    const toggle = async (dish: MenuDish) => {
        const next = !dish.is_available;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPending((p) => ({ ...p, [dish.id]: true }));

        const key = ['menu-dishes', restaurantId];
        const previous = queryClient.getQueryData<MenuDish[]>(key);
        queryClient.setQueryData<MenuDish[]>(key, (old) =>
            Array.isArray(old) ? old.map((d) => (d.id === dish.id ? { ...d, is_available: next } : d)) : old,
        );

        try {
            await setDishAvailability(dish.id, next);
            // The customer-facing menu is a different cache — refresh it too.
            void queryClient.invalidateQueries({ queryKey: ['dishes', restaurantId] });
        } catch {
            queryClient.setQueryData(key, previous);
            showToast('Impossible de mettre à jour ce plat. Réessayez.', 'error');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setPending((p) => ({ ...p, [dish.id]: false }));
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    if (!dishes || dishes.length === 0) {
        return (
            <EmptyState
                tone="dark"
                icon={Utensils}
                title="Carte vide"
                message="Vos plats apparaîtront ici dès qu’ils seront ajoutés depuis l’espace restaurant web."
                className="mt-16"
            />
        );
    }

    return (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View className="bg-ink-800 rounded-panel px-5 py-4 mb-6 border border-hairline-dark">
                <Text className="text-on-dark font-labelbold text-body">
                    {unavailableCount === 0
                        ? 'Toute la carte est disponible'
                        : `${unavailableCount} plat${unavailableCount > 1 ? 's' : ''} retiré${unavailableCount > 1 ? 's' : ''} de la carte`}
                </Text>
                <TypeText variant="label" tone="onDarkMuted" className="mt-1">
                    Un plat retiré disparaît immédiatement de l’application, sans toucher au reste de votre carte.
                </TypeText>
            </View>

            {sections.map(([category, items]) => (
                <View key={category} className="mb-8">
                    <TypeText variant="eyebrow" tone="onDarkFaint" className="mb-3">{category}</TypeText>
                    <View className="gap-2">
                        {items.map((dish) => {
                            const available = dish.is_available !== false;
                            const busy = !!pending[dish.id];
                            return (
                                <Pressable
                                    key={dish.id}
                                    onPress={() => !busy && toggle(dish)}
                                    accessibilityRole="switch"
                                    accessibilityState={{ checked: available, disabled: busy }}
                                    accessibilityLabel={`${dish.name}, ${available ? 'disponible' : 'retiré de la carte'}`}
                                    className="flex-row items-center gap-4 bg-ink-800 rounded-panel p-3 border border-hairline-dark active:scale-[0.99]"
                                    style={{ opacity: busy ? 0.6 : 1, minHeight: 80 }}
                                >
                                    <View className="w-14 h-14 rounded-card overflow-hidden bg-ink-900 items-center justify-center" style={{ opacity: available ? 1 : 0.35 }}>
                                        {dish.image_url ? (
                                            <RemoteImage uri={dish.image_url} displayWidth={56} className="w-full h-full" />
                                        ) : (
                                            <Utensils color={COLORS.onDarkFaint} size={20} strokeWidth={2} />
                                        )}
                                    </View>

                                    <View className="flex-1">
                                        <Text numberOfLines={1} className={`font-labelbold text-body ${available ? 'text-on-dark' : 'text-on-dark-faint'}`}>
                                            {dish.name}
                                        </Text>
                                        <TypeText variant="label" tone="onDarkMuted" className="mt-1">{formatXaf(dish.price_xaf)}</TypeText>
                                    </View>

                                    {/* Switch: 48×28 track, 24 pt knob */}
                                    <View
                                        className={`justify-center rounded-full ${available ? 'bg-success' : 'bg-fill-dark-strong'}`}
                                        style={{ width: 48, height: 28, padding: 2, alignItems: available ? 'flex-end' : 'flex-start' }}
                                    >
                                        <View className="bg-white rounded-full" style={{ width: 24, height: 24 }} />
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

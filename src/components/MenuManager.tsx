import { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Utensils } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useMenuDishes, setDishAvailability } from '../hooks/useSupabase';
import { useCartStore } from '../store/cartStore';
import { RemoteImage } from './RemoteImage';
import { formatXaf } from '../lib/pricing';

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
        const groups = new Map<string, any[]>();
        for (const dish of (dishes ?? []) as any[]) {
            const name = dish.categories?.name ?? 'Divers';
            const list = groups.get(name) ?? [];
            list.push(dish);
            groups.set(name, list);
        }
        return [...groups.entries()];
    }, [dishes]);

    const unavailableCount = ((dishes ?? []) as any[]).filter((d) => d.is_available === false).length;

    const toggle = async (dish: any) => {
        const next = !dish.is_available;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPending((p) => ({ ...p, [dish.id]: true }));

        const key = ['menu-dishes', restaurantId];
        const previous = queryClient.getQueryData(key);
        queryClient.setQueryData(key, (old: any) =>
            Array.isArray(old) ? old.map((d: any) => (d.id === dish.id ? { ...d, is_available: next } : d)) : old,
        );

        try {
            await setDishAvailability(dish.id, next);
            // The customer-facing menu is a different cache — refresh it too.
            queryClient.invalidateQueries({ queryKey: ['dishes', restaurantId] });
        } catch {
            queryClient.setQueryData(key, previous);
            showToast("Impossible de mettre à jour ce plat. Réessayez.", 'error');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setPending((p) => ({ ...p, [dish.id]: false }));
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color="#FF5733" />
            </View>
        );
    }

    if (!dishes || dishes.length === 0) {
        return (
            <View className="items-center justify-center mt-20 px-6">
                <Utensils color="#444" size={44} />
                <Text className="text-white font-title text-xl mt-4">Carte vide</Text>
                <Text className="text-[#a1a1aa] font-body text-center mt-2">
                    Vos plats apparaîtront ici dès qu'ils seront ajoutés au catalogue.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            <View className="bg-[#1c1b1b] rounded-3xl px-5 py-4 mb-6 border border-white/5">
                <Text className="text-white font-labelbold text-[15px]">
                    {unavailableCount === 0
                        ? 'Toute la carte est disponible'
                        : `${unavailableCount} plat${unavailableCount > 1 ? 's' : ''} retiré${unavailableCount > 1 ? 's' : ''} de la carte`}
                </Text>
                <Text className="text-[#a1a1aa] font-body text-[13px] mt-1 leading-relaxed">
                    Un plat retiré disparaît immédiatement de l'application, sans toucher au reste de votre carte.
                </Text>
            </View>

            {sections.map(([category, items]) => (
                <View key={category} className="mb-7">
                    <Text className="font-label text-[11px] uppercase tracking-[0.12em] text-[#6b6b70] mb-3">
                        {category}
                    </Text>
                    <View className="gap-2.5">
                        {items.map((dish) => {
                            const available = dish.is_available !== false;
                            const busy = pending[dish.id];
                            return (
                                <Pressable
                                    key={dish.id}
                                    onPress={() => !busy && toggle(dish)}
                                    accessibilityRole="switch"
                                    accessibilityState={{ checked: available, disabled: busy }}
                                    accessibilityLabel={`${dish.name}, ${available ? 'disponible' : 'retiré de la carte'}`}
                                    className="flex-row items-center gap-4 bg-[#1c1b1b] rounded-3xl p-3.5 border border-white/5 active:scale-[0.99]"
                                    style={{ opacity: busy ? 0.6 : 1 }}
                                >
                                    <View
                                        className="w-14 h-14 rounded-2xl overflow-hidden bg-black/40 items-center justify-center"
                                        style={{ opacity: available ? 1 : 0.35 }}
                                    >
                                        {dish.image_url ? (
                                            <RemoteImage uri={dish.image_url} displayWidth={56} className="w-full h-full" />
                                        ) : (
                                            <Utensils color="#5f5e5e" size={20} />
                                        )}
                                    </View>

                                    <View className="flex-1">
                                        <Text
                                            numberOfLines={1}
                                            className="font-labelbold text-[15px]"
                                            style={{ color: available ? '#ffffff' : '#6b6b70' }}
                                        >
                                            {dish.name}
                                        </Text>
                                        <Text className="font-body text-[13px] text-[#a1a1aa] mt-0.5">
                                            {formatXaf(dish.price_xaf)}
                                        </Text>
                                    </View>

                                    {/* Switch */}
                                    <View
                                        className="justify-center rounded-full"
                                        style={{
                                            width: 50,
                                            height: 30,
                                            padding: 3,
                                            backgroundColor: available ? '#22c55e' : 'rgba(255,255,255,0.14)',
                                            alignItems: available ? 'flex-end' : 'flex-start',
                                        }}
                                    >
                                        <View className="bg-white rounded-full" style={{ width: 24, height: 24 }} />
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            ))}
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

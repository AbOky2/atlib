import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, X } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { prefetchRestaurant, useRestaurants } from '../../src/data/catalogue';
import type { Restaurant } from '../../src/data/types';
import { useFavoritesStore } from '../../src/store/favoritesStore';
import { useCartStore } from '../../src/store/cartStore';
import { useAddressStore } from '../../src/store/addressStore';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { RestaurantRow, RESTAURANT_ROW_HEIGHT } from '../../src/components/RestaurantRow';
import { Button, EmptyState, TOUCH_MIN } from '../../src/components/ui';
import { getEstimatedDeliveryTime } from '../../src/lib/localities';
import { COLORS } from '../../src/lib/palette';

export default function FavoritesScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const queryClient = useQueryClient();
    const { data: restaurants } = useRestaurants();
    const { favoriteIds, toggleFavorite } = useFavoritesStore();
    const showToast = useCartStore(state => state.showToast);
    const selectedAddress = useAddressStore(state => state.currentAddress);
    const estimate = selectedAddress ? `~${getEstimatedDeliveryTime(selectedAddress.locality)} min` : null;

    const favorites = restaurants?.filter(r => favoriteIds.includes(r.id)) ?? [];

    const removeFavorite = (restaurant: Restaurant) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        toggleFavorite(restaurant.id);
        showToast(`${restaurant.name} retiré des favoris`);
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title="Mes favoris"
                back="arrow"
                onBack={() => router.back()}
                right={
                    <View className="flex-row items-center gap-1" accessible accessibilityLabel={`${favorites.length} favori${favorites.length > 1 ? 's' : ''}`}>
                        <Heart fill={COLORS.accent} color={COLORS.accent} size={18} strokeWidth={2} />
                        <Text className="text-body font-labelbold text-accent-dark">{favorites.length}</Text>
                    </View>
                }
            />

            <FlatList
                data={favorites}
                keyExtractor={(item) => item.id}
                getItemLayout={(_, index) => ({ length: RESTAURANT_ROW_HEIGHT, offset: RESTAURANT_ROW_HEIGHT * index, index })}
                contentContainerStyle={{ paddingTop: headerOffset + 8, paddingBottom: Math.max(insets.bottom, 24) + 24, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View className="flex-1 justify-center">
                        <EmptyState
                            icon={Heart}
                            title="Aucun favori"
                            message="Appuyez sur le cœur d’un restaurant pour le retrouver ici."
                            action={<Button label="Explorer les restaurants" onPress={() => router.back()} />}
                        />
                    </View>
                }
                renderItem={({ item }) => (
                    <RestaurantRow
                        restaurant={item}
                        estimate={estimate}
                        onPressIn={() => prefetchRestaurant(queryClient, item.id)}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push({ pathname: '/restaurant', params: { id: item.id } });
                        }}
                        trailing={
                            <Pressable
                                onPress={() => removeFavorite(item)}
                                accessibilityRole="button"
                                accessibilityLabel={`Retirer ${item.name} des favoris`}
                                className="items-center justify-center rounded-full active:bg-fill"
                                style={{ width: TOUCH_MIN, height: TOUCH_MIN }}
                            >
                                <X color={COLORS.inkFaint} size={20} strokeWidth={2} />
                            </Pressable>
                        }
                    />
                )}
            />
        </View>
    );
}

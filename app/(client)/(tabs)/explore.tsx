import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Star, Clock, Truck, X } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useQueryClient } from '@tanstack/react-query';
import { useRestaurants, prefetchRestaurant } from '../../../src/hooks/useSupabase';
import { RemoteImage } from '../../../src/components/RemoteImage';
import { CategoryRail } from '../../../src/components/CategoryRail';
import { ClosedBadge } from '../../../src/components/ClosedBadge';
import { isAcceptingOrders } from '../../../src/lib/availability';
import { FOOD_CATEGORIES, ALL_CATEGORY_ID, matchesCategory } from '../../../src/lib/categories';
import { useHeaderInsetTop } from '../../../src/components/ScreenHeader';
import { restaurantEtaRange, formatEtaRange } from '../../../src/lib/eta';
import { DELIVERY_FEE_XAF, formatXaf } from '../../../src/lib/pricing';
import { shadowSoft } from '../../../src/lib/elevation';

export default function ExploreScreen() {
    const insets = useSafeAreaInsets();
    const insetTop = useHeaderInsetTop();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY_ID);
    const { data: restaurants, isLoading } = useRestaurants();

    const filteredRestaurants = useMemo(() => {
        if (!restaurants) return [];
        let result = restaurants;

        result = result.filter((r) => matchesCategory(r.genre, activeCategory));

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.name.toLowerCase().includes(query) ||
                r.genre?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [restaurants, activeCategory, searchQuery]);

    return (
        <View className="flex-1 bg-background">
            {/* Header — solid white */}
            <View
                className="absolute top-0 left-0 right-0 z-50 px-6 pb-4 bg-white border-b border-hairline"
                style={{ paddingTop: insetTop + 6, ...shadowSoft }}
            >
                <Text className="text-h1 font-title tracking-tight text-ink mb-4">Explorer</Text>

                {/* Search Bar */}
                <View className="relative justify-center">
                    <View className="absolute left-4 z-10">
                        <Search color="#8d8a87" size={20} />
                    </View>
                    <TextInput
                        className="w-full bg-fill h-14 pl-12 pr-12 rounded-card text-bodylg font-body text-ink"
                        placeholder="Rechercher un restaurant, un plat..."
                        placeholderTextColor="#8d8a87"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus={false}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable
                            onPress={() => setSearchQuery('')}
                            className="absolute right-4 z-10 w-7 h-7 bg-fill-strong rounded-full items-center justify-center"
                        >
                            <X color="#8d8a87" size={14} />
                        </Pressable>
                    )}
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: insetTop + 152,
                    paddingBottom: insets.bottom + 120,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Categories — spaced away from the search bar */}
                <View className="mb-8">
                    <CategoryRail
                        items={FOOD_CATEGORIES}
                        activeId={activeCategory}
                        onSelect={(id) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveCategory(id);
                        }}
                    />
                </View>

                {/* Results */}
                <View className="px-6">
                    {isLoading && (
                        <View className="items-center py-20">
                            <ActivityIndicator size="large" color="#FF5733" />
                        </View>
                    )}

                    {!isLoading && filteredRestaurants.length === 0 && (
                        <View className="items-center py-16">
                            <Text className="text-h1 mb-4">🔍</Text>
                            <Text className="text-h3 font-heading text-ink mb-2">Aucun résultat</Text>
                            <Text className="text-body text-ink-faint text-center font-body">Essayez un autre terme ou catégorie.</Text>
                        </View>
                    )}

                    {!isLoading && filteredRestaurants.length > 0 && (
                        <>
                            <Text className="text-eyebrow font-label tracking-[0.08em] uppercase text-ink-faint mb-4">
                                {filteredRestaurants.length} restaurant{filteredRestaurants.length > 1 ? 's' : ''}
                            </Text>
                            <View className="gap-4">
                                {filteredRestaurants.map(restaurant => (
                                    <Pressable
                                        key={restaurant.id}
                                        onPressIn={() => prefetchRestaurant(queryClient, restaurant.id)}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            router.push({ pathname: '/restaurant', params: { id: restaurant.id } });
                                        }}
                                        className="flex-row gap-4 p-4 bg-white rounded-panel border border-hairline active:scale-[0.99]"
                                    >
                                        <View
                                            className="w-20 h-20 rounded-card overflow-hidden bg-black flex-shrink-0"
                                            style={{ opacity: isAcceptingOrders(restaurant) ? 1 : 0.45 }}
                                        >
                                            <RemoteImage uri={restaurant.image_url} displayWidth={80} className="w-full h-full" />
                                        </View>
                                        <View className="flex-1 justify-center">
                                            <View className="flex-row items-center gap-2">
                                                <Text className="text-bodylg font-heading tracking-tight text-ink flex-shrink" numberOfLines={1}>{restaurant.name}</Text>
                                                {!isAcceptingOrders(restaurant) && <ClosedBadge tone="onSurface" />}
                                            </View>
                                            <Text className="text-caption text-ink-faint font-body mt-1" numberOfLines={1}>{restaurant.genre}</Text>
                                            <View className="flex-row items-center gap-4 mt-2">
                                                <View className="flex-row items-center gap-1">
                                                    <Star fill="#1c1b1b" color="#1c1b1b" size={12} />
                                                    <Text className="text-caption font-labelbold text-ink">{restaurant.rating}</Text>
                                                </View>
                                                <View className="flex-row items-center gap-1">
                                                    <Clock color="#8d8a87" size={12} />
                                                    <Text className="text-caption text-ink-faint font-body">{formatEtaRange(restaurantEtaRange(restaurant.id))}</Text>
                                                </View>
                                                <View className="flex-row items-center gap-1">
                                                    <Truck color="#8d8a87" size={12} />
                                                    <Text className="text-caption text-ink-faint font-body">{formatXaf(DELIVERY_FEE_XAF)}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>


        </View>
    );
}

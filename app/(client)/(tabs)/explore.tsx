import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, type LayoutChangeEvent } from 'react-native';
import { SearchX, WifiOff } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { type Restaurant } from '../../../src/data/types';
import { prefetchRestaurant, useRestaurants } from '../../../src/data/catalogue';
import { CategoryRail } from '../../../src/components/CategoryRail';
import { RestaurantRow, RESTAURANT_ROW_HEIGHT } from '../../../src/components/RestaurantRow';
import { useBottomClearance } from '../../../src/components/ActiveOrderBanner';
import { useHeaderInsetTop } from '../../../src/components/ScreenHeader';
import { Button, EmptyState, SearchField, TypeText, SCREEN_GUTTER } from '../../../src/components/ui';
import { useAddressStore } from '../../../src/store/addressStore';
import { FOOD_CATEGORIES, ALL_CATEGORY_ID, matchesCategory } from '../../../src/lib/categories';
import { getEstimatedDeliveryTime } from '../../../src/lib/localities';
import { COLORS } from '../../../src/lib/palette';

export default function ExploreScreen() {
    const insetTop = useHeaderInsetTop();
    const bottomClearance = useBottomClearance();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY_ID);
    const [headerHeight, setHeaderHeight] = useState(0);
    const { data: restaurants, isLoading, isError, refetch } = useRestaurants();
    const selectedAddress = useAddressStore(state => state.currentAddress);
    const estimate = selectedAddress ? `~${getEstimatedDeliveryTime(selectedAddress.locality)} min` : null;

    // The search covers what it can see: restaurant names and cuisines.
    const filteredRestaurants = useMemo(() => {
        if (!restaurants) return [];
        const query = searchQuery.trim().toLowerCase();
        return restaurants
            .filter((r) => matchesCategory(r.genre, activeCategory))
            .filter((r) => !query || r.name.toLowerCase().includes(query) || (r.genre ?? '').toLowerCase().includes(query));
    }, [restaurants, activeCategory, searchQuery]);

    const openRestaurant = useCallback((id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ pathname: '/restaurant', params: { id } });
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: Restaurant }) => (
            <RestaurantRow
                restaurant={item}
                estimate={estimate}
                onPressIn={() => prefetchRestaurant(queryClient, item.id)}
                onPress={() => openRestaurant(item.id)}
            />
        ),
        [queryClient, openRestaurant, estimate],
    );

    const count = filteredRestaurants.length;
    const header = (
        <>
            <View className="mb-6">
                <CategoryRail
                    items={FOOD_CATEGORIES}
                    activeId={activeCategory}
                    onSelect={(id) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setActiveCategory(id);
                    }}
                />
            </View>
            {isLoading ? (
                <View className="items-center py-20">
                    <ActivityIndicator size="large" color={COLORS.ink} />
                </View>
            ) : isError ? (
                <EmptyState
                    icon={WifiOff}
                    title="Connexion impossible"
                    message="Vérifiez votre connexion internet et réessayez."
                    action={<Button label="Réessayer" variant="secondary" onPress={() => { void refetch(); }} />}
                    className="py-12"
                />
            ) : count === 0 ? (
                <EmptyState
                    icon={SearchX}
                    title="Aucun résultat"
                    message="Essayez un autre nom de restaurant ou une autre cuisine."
                    action={searchQuery || activeCategory !== ALL_CATEGORY_ID
                        ? <Button label="Effacer les filtres" variant="secondary" onPress={() => { setSearchQuery(''); setActiveCategory(ALL_CATEGORY_ID); }} />
                        : undefined}
                    className="py-12"
                />
            ) : (
                // The page already says « Explorer » in its bar: the list only
                // needs to state what it holds.
                <TypeText variant="eyebrow" tone="tertiary" className="mb-2" style={{ paddingHorizontal: SCREEN_GUTTER }} accessibilityRole="header">
                    {searchQuery.trim()
                        ? `${count} résultat${count > 1 ? 's' : ''} pour « ${searchQuery.trim()} »`
                        : `${count} restaurant${count > 1 ? 's' : ''}`}
                </TypeText>
            )}
        </>
    );

    return (
        <View className="flex-1 bg-background">
            {/* Solid app bar: title + search, measured so the list starts exactly below it. */}
            <View
                onLayout={(e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height)}
                className="absolute top-0 left-0 right-0 z-50 bg-surface border-b border-hairline pb-4"
                style={{ paddingTop: insetTop + 8, paddingHorizontal: SCREEN_GUTTER }}
            >
                <TypeText variant="h1" className="mb-3" accessibilityRole="header">Explorer</TypeText>
                <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Un restaurant, une cuisine…" />
            </View>

            <FlatList
                data={isLoading || isError ? [] : filteredRestaurants}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={header}
                getItemLayout={(_, index) => ({ length: RESTAURANT_ROW_HEIGHT, offset: RESTAURANT_ROW_HEIGHT * index, index })}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                initialNumToRender={8}
                windowSize={7}
                contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: bottomClearance }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

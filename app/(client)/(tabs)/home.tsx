import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChevronDown, Star, Heart, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { useRestaurants, useUserOrders, prefetchRestaurant, type Restaurant } from '../../../src/hooks/useSupabase';
import { useCartStore } from '../../../src/store/cartStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useFavoritesStore } from '../../../src/store/favoritesStore';
import { useAddressStore } from '../../../src/store/addressStore';
import { useHeaderInsetTop, HEADER_CONTENT_HEIGHT } from '../../../src/components/ScreenHeader';
import { CategoryRail } from '../../../src/components/CategoryRail';
import { RemoteImage } from '../../../src/components/RemoteImage';
import { ClosedBadge } from '../../../src/components/ClosedBadge';
import { RestaurantRow, RESTAURANT_ROW_HEIGHT } from '../../../src/components/RestaurantRow';
import { isAcceptingOrders } from '../../../src/lib/availability';
import { FOOD_CATEGORIES, ALL_CATEGORY_ID, matchesCategory } from '../../../src/lib/categories';
import { BRAND_CITY } from '../../../src/lib/brand';
import { useNotifications } from '../../../src/hooks/useNotifications';
import { restaurantEtaRange, formatEtaRange } from '../../../src/lib/eta';
import { shadowSoft } from '../../../src/lib/elevation';
import { COLORS } from '../../../src/lib/palette';

export default function ClientHomeScreen() {
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY_ID);
    const { data: restaurants, isLoading, isError, refetch } = useRestaurants();
    const { refetch: refetchOrders } = useUserOrders(useAuthStore(state => state.user)?.id);
    const showToast = useCartStore(state => state.showToast);
    const { isFavorite, toggleFavorite } = useFavoritesStore();
    const selectedAddress = useAddressStore(state => state.currentAddress);
    const insetTop = useHeaderInsetTop();
    const { unreadCount } = useNotifications();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await Promise.all([refetch(), refetchOrders()]);
        setRefreshing(false);
    }, [refetch, refetchOrders]);

    // Filter by cuisine, then push closed kitchens down: a restaurant you cannot
    // order from should never headline the screen or lead the list.
    const filteredRestaurants = useMemo(() => {
        if (!restaurants) return [];
        return restaurants
            .filter((r) => matchesCategory(r.genre, activeCategory))
            .sort((a, b) => Number(isAcceptingOrders(b)) - Number(isAcceptingOrders(a)));
    }, [restaurants, activeCategory]);

    // One featured restaurant and an optional rail sit in the header; the list
    // below carries the WHOLE catalogue, virtualised. The editorial cards used to
    // be the list itself — gorgeous at three restaurants, unusable at fifty.
    const heroRestaurant = filteredRestaurants[0];
    const selectedForYou = filteredRestaurants.length >= 5 ? filteredRestaurants.slice(1, 4) : [];
    const totalCount = filteredRestaurants.length;

    const openRestaurant = useCallback((id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ pathname: '/restaurant', params: { id } });
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: Restaurant }) => (
            <RestaurantRow
                restaurant={item}
                onPressIn={() => prefetchRestaurant(queryClient, item.id)}
                onPress={() => openRestaurant(item.id)}
            />
        ),
        [queryClient, openRestaurant],
    );

    const header = (
        <>
            {/* Cuisines */}
            <View className="mt-3 mb-8">
                <CategoryRail
                    items={FOOD_CATEGORIES}
                    activeId={activeCategory}
                    onSelect={(id) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setActiveCategory(id);
                    }}
                />
            </View>

            {isLoading && (
                <View className="items-center py-20">
                    <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
            )}

            {!isLoading && (isError || totalCount === 0) && (
                <View className="items-center py-16 px-6">
                    <Text className="text-xl font-title tracking-tight text-ink mb-2">
                        {isError ? 'Erreur de connexion' : 'Aucun résultat'}
                    </Text>
                    <Text className="text-sm text-ink-muted text-center font-body">
                        {isError
                            ? 'Vérifiez votre connexion internet et réessayez.'
                            : 'Essayez une autre cuisine.'}
                    </Text>
                    <Pressable
                        onPress={() => (isError ? refetch() : setActiveCategory(ALL_CATEGORY_ID))}
                        className="mt-6 bg-[#1c1b1b] px-6 py-3 rounded-full active:scale-95"
                    >
                        <Text className="text-white font-labelbold text-xs">
                            {isError ? 'Réessayer' : 'Voir tout'}
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* Featured */}
            {heroRestaurant && (
                <View className="mb-12 px-6">
                    <Pressable
                        onPressIn={() => prefetchRestaurant(queryClient, heroRestaurant.id)}
                        onPress={() => openRestaurant(heroRestaurant.id)}
                        className="relative w-full aspect-[4/5] rounded-sheet overflow-hidden bg-black active:scale-[0.98]"
                    >
                        <RemoteImage uri={heroRestaurant.image_url} displayWidth={360} className="w-full h-full" />
                        <View className="absolute inset-0 bg-black/35" />
                        <View className="absolute inset-0 justify-end p-8">
                            <Text className="text-white/70 font-label text-[10px] tracking-[0.08em] uppercase mb-4">
                                {heroRestaurant.genre ?? 'Recommandé'}
                            </Text>
                            <Text className="text-[30px] font-title text-white tracking-tight mb-4">
                                {heroRestaurant.name}
                            </Text>
                            <View className="flex-row items-center gap-6">
                                <View className="flex-row items-center gap-1">
                                    <Star fill="#fff" color="#fff" size={12} />
                                    <Text className="text-white font-labelbold text-sm">{heroRestaurant.rating}</Text>
                                </View>
                                <Text className="text-white/80 text-sm font-label">
                                    {formatEtaRange(restaurantEtaRange(heroRestaurant.id))}
                                </Text>
                                {!isAcceptingOrders(heroRestaurant) && <ClosedBadge />}
                            </View>
                        </View>
                    </Pressable>
                </View>
            )}

            {/* Selection rail */}
            {selectedForYou.length > 0 && (
                <View className="mb-12">
                    <View className="px-6 mb-5">
                        <Text className="text-ink-faint font-label text-[11px] tracking-[0.08em] uppercase">
                            Soigneusement choisi
                        </Text>
                        <Text className="text-2xl font-title tracking-tight text-ink">Sélection pour vous</Text>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 16, paddingHorizontal: 24, paddingRight: 40 }}
                    >
                        {selectedForYou.map((item) => (
                            <Pressable
                                key={item.id}
                                onPressIn={() => prefetchRestaurant(queryClient, item.id)}
                                onPress={() => openRestaurant(item.id)}
                                className="w-[240px] active:scale-[0.98]"
                            >
                                <View className="h-40 rounded-sheet overflow-hidden relative bg-black">
                                    <RemoteImage
                                        uri={item.image_url}
                                        displayWidth={240}
                                        className="w-full h-full"
                                        style={{ opacity: isAcceptingOrders(item) ? 0.9 : 0.4 }}
                                    />
                                    <Pressable
                                        onPress={(e) => {
                                            e.stopPropagation?.();
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            const added = toggleFavorite(item.id);
                                            showToast(added ? `${item.name} ajouté aux favoris !` : `${item.name} retiré des favoris`);
                                        }}
                                        hitSlop={8}
                                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 items-center justify-center active:scale-90"
                                    >
                                        <Heart
                                            fill={isFavorite(item.id) ? COLORS.accent : 'transparent'}
                                            color={isFavorite(item.id) ? COLORS.accent : '#fff'}
                                            size={18}
                                        />
                                    </Pressable>
                                    {!isAcceptingOrders(item) && (
                                        <View className="absolute bottom-3 left-3"><ClosedBadge /></View>
                                    )}
                                </View>
                                <Text numberOfLines={1} className="text-base font-heading tracking-tight text-ink mt-3">
                                    {item.name}
                                </Text>
                                <Text numberOfLines={1} className="text-xs text-ink-muted font-label mt-0.5">
                                    {item.genre} • {formatEtaRange(restaurantEtaRange(item.id))}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* List heading */}
            {totalCount > 0 && (
                <View className="px-6 mb-2">
                    <Text className="text-ink-faint font-label text-[11px] tracking-[0.08em] uppercase">
                        {activeCategory === ALL_CATEGORY_ID
                            ? `${totalCount} maison${totalCount > 1 ? 's' : ''} à ${BRAND_CITY}`
                            : `${totalCount} résultat${totalCount > 1 ? 's' : ''}`}
                    </Text>
                    <Text className="text-2xl font-title tracking-tight text-ink">
                        {activeCategory === ALL_CATEGORY_ID
                            ? 'Tous les restaurants'
                            : FOOD_CATEGORIES.find((c) => c.id === activeCategory)?.label ?? 'Résultats'}
                    </Text>
                </View>
            )}
        </>
    );

    return (
        <View className="flex-1 bg-background">
            {/* TopAppBar */}
            <View className="absolute top-0 left-0 right-0 z-50 bg-white border-b border-hairline" style={shadowSoft}>
                <View
                    style={{ paddingTop: insetTop, height: insetTop + HEADER_CONTENT_HEIGHT }}
                    className="flex-row justify-between items-center px-6"
                >
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/addresses');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={
                            selectedAddress ? `Livrer à ${selectedAddress.locality}, changer d'adresse` : 'Choisir une adresse de livraison'
                        }
                        className="flex-row items-center gap-3 flex-1 pr-3 active:opacity-60"
                    >
                        <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: COLORS.accentTint }}>
                            <MapPin color={COLORS.accent} size={17} strokeWidth={2.2} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[9px] font-label uppercase tracking-[0.12em] text-ink-faint">
                                {selectedAddress ? 'Livrer à' : 'Adresse'}
                            </Text>
                            <View className="flex-row items-center gap-1">
                                <Text numberOfLines={1} className="text-[16px] font-title tracking-tight text-ink flex-shrink">
                                    {selectedAddress ? selectedAddress.locality : 'Choisir une adresse'}
                                </Text>
                                <ChevronDown color={COLORS.ink} size={16} strokeWidth={2.4} />
                            </View>
                        </View>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/notifications');
                        }}
                        className="relative w-10 h-10 items-center justify-end active:opacity-60"
                    >
                        <Bell color={COLORS.ink} size={24} />
                        {unreadCount > 0 && (
                            <View className="absolute -top-0.5 right-0 min-w-[16px] h-4 px-1 bg-[#FF5733] rounded-full items-center justify-center border border-white">
                                <Text className="text-white text-[9px] font-labelbold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>

            {/* One virtualised list for the whole catalogue: constant memory and a
                known row height, so scrolling stays smooth past fifty restaurants. */}
            <FlatList
                data={filteredRestaurants}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={header}
                getItemLayout={(_, index) => ({
                    length: RESTAURANT_ROW_HEIGHT,
                    offset: RESTAURANT_ROW_HEIGHT * index,
                    index,
                })}
                initialNumToRender={8}
                windowSize={7}
                removeClippedSubviews
                contentContainerStyle={{
                    paddingTop: insetTop + HEADER_CONTENT_HEIGHT + 16,
                    paddingBottom: 140,
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.accent}
                        progressViewOffset={insetTop + HEADER_CONTENT_HEIGHT}
                    />
                }
            />
        </View>
    );
}

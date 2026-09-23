import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChevronDown, Star, Heart, MapPin, Store, WifiOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { type Restaurant } from '../../../src/data/types';
import { prefetchRestaurant, useRestaurants } from '../../../src/data/catalogue';
import { useUserOrders } from '../../../src/data/orders';
import { useCartStore } from '../../../src/store/cartStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useFavoritesStore } from '../../../src/store/favoritesStore';
import { useAddressStore } from '../../../src/store/addressStore';
import { useHeaderInsetTop, HEADER_CONTENT_HEIGHT } from '../../../src/components/ScreenHeader';
import { CategoryRail } from '../../../src/components/CategoryRail';
import { RemoteImage } from '../../../src/components/RemoteImage';
import { ClosedBadge } from '../../../src/components/ClosedBadge';
import { RestaurantRow, RESTAURANT_ROW_HEIGHT } from '../../../src/components/RestaurantRow';
import { useBottomClearance } from '../../../src/components/ActiveOrderBanner';
import { Button, EmptyState, SectionTitle, SCREEN_GUTTER, TOUCH_MIN } from '../../../src/components/ui';
import { isAcceptingOrders } from '../../../src/lib/availability';
import { FOOD_CATEGORIES, ALL_CATEGORY_ID, matchesCategory } from '../../../src/lib/categories';
import { getEstimatedDeliveryTime } from '../../../src/lib/localities';
import { BRAND_CITY } from '../../../src/lib/brand';
import { useNotifications } from '../../../src/hooks/useNotifications';
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
    const bottomClearance = useBottomClearance();
    const { unreadCount } = useNotifications();

    // A real number from the locality table once an address is known — never a
    // per-restaurant delay invented from its id.
    const estimate = selectedAddress ? `~${getEstimatedDeliveryTime(selectedAddress.locality)} min` : null;

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
    // below carries the WHOLE catalogue, virtualised.
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
                estimate={estimate}
                onPressIn={() => prefetchRestaurant(queryClient, item.id)}
                onPress={() => openRestaurant(item.id)}
            />
        ),
        [queryClient, openRestaurant, estimate],
    );

    const header = (
        <>
            {/* Cuisines */}
            <View className="mt-2 mb-8">
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
                    <ActivityIndicator size="large" color={COLORS.ink} />
                </View>
            )}

            {!isLoading && isError && (
                <EmptyState
                    icon={WifiOff}
                    title="Connexion impossible"
                    message="Vérifiez votre connexion internet et réessayez."
                    action={<Button label="Réessayer" variant="secondary" onPress={() => { void refetch(); }} />}
                    className="py-12"
                />
            )}

            {!isLoading && !isError && totalCount === 0 && (
                <EmptyState
                    icon={Store}
                    title="Aucun restaurant"
                    message={activeCategory === ALL_CATEGORY_ID ? 'Les restaurants partenaires apparaîtront ici.' : 'Aucune maison dans cette cuisine pour le moment.'}
                    action={activeCategory === ALL_CATEGORY_ID ? undefined : <Button label="Voir toutes les cuisines" variant="secondary" onPress={() => setActiveCategory(ALL_CATEGORY_ID)} />}
                    className="py-12"
                />
            )}

            {/* Featured */}
            {heroRestaurant && (
                <View className="mb-10" style={{ paddingHorizontal: SCREEN_GUTTER }}>
                    <Pressable
                        onPressIn={() => prefetchRestaurant(queryClient, heroRestaurant.id)}
                        onPress={() => openRestaurant(heroRestaurant.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`À la une : ${heroRestaurant.name}`}
                        className="relative w-full aspect-[4/3] rounded-sheet overflow-hidden bg-ink active:scale-[0.98]"
                    >
                        <RemoteImage uri={heroRestaurant.image_url} displayWidth={360} className="w-full h-full" />
                        {/* 40 % is a Tailwind step; 35 % was not, and the veil never rendered. */}
                        <View className="absolute inset-0 bg-black/40" />
                        <View className="absolute inset-0 justify-end p-6">
                            <Text className="text-white/70 font-label text-eyebrow tracking-eyebrow uppercase mb-3">
                                {heroRestaurant.genre ?? 'À la une'}
                            </Text>
                            <Text className="text-h1 font-title text-white tracking-tight mb-3" numberOfLines={2}>
                                {heroRestaurant.name}
                            </Text>
                            <View className="flex-row items-center gap-6">
                                {heroRestaurant.rating != null ? (
                                    <View className="flex-row items-center gap-1">
                                        <Star fill={COLORS.white} color={COLORS.white} size={14} strokeWidth={2} />
                                        <Text className="text-white font-labelbold text-body">{heroRestaurant.rating}</Text>
                                    </View>
                                ) : null}
                                {estimate ? <Text className="text-white/80 text-body font-label">{estimate}</Text> : null}
                                {!isAcceptingOrders(heroRestaurant) && <ClosedBadge />}
                            </View>
                        </View>
                    </Pressable>
                </View>
            )}

            {/* Selection rail */}
            {selectedForYou.length > 0 && (
                <View className="mb-10">
                    <SectionTitle eyebrow="Soigneusement choisi" title="Sélection pour vous" className="mb-5" style={{ paddingHorizontal: SCREEN_GUTTER }} />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 16, paddingHorizontal: SCREEN_GUTTER }}
                    >
                        {selectedForYou.map((item) => {
                            const favourite = isFavorite(item.id);
                            return (
                                <Pressable
                                    key={item.id}
                                    onPressIn={() => prefetchRestaurant(queryClient, item.id)}
                                    onPress={() => openRestaurant(item.id)}
                                    accessibilityRole="button"
                                    accessibilityLabel={item.name}
                                    className="active:scale-[0.98]"
                                    style={{ width: 240 }}
                                >
                                    <View className="h-40 rounded-panel overflow-hidden relative bg-ink">
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
                                                showToast(added ? `${item.name} ajouté aux favoris` : `${item.name} retiré des favoris`);
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel={favourite ? `Retirer ${item.name} des favoris` : `Ajouter ${item.name} aux favoris`}
                                            accessibilityState={{ selected: favourite }}
                                            className="absolute top-2 right-2 items-center justify-center active:scale-90"
                                            style={{ width: TOUCH_MIN, height: TOUCH_MIN }}
                                        >
                                            <View className="w-9 h-9 rounded-full bg-black/40 items-center justify-center">
                                                <Heart
                                                    fill={favourite ? COLORS.accent : 'transparent'}
                                                    color={favourite ? COLORS.accent : COLORS.white}
                                                    size={18}
                                                    strokeWidth={2}
                                                />
                                            </View>
                                        </Pressable>
                                        {!isAcceptingOrders(item) && (
                                            <View className="absolute bottom-3 left-3"><ClosedBadge /></View>
                                        )}
                                    </View>
                                    <Text numberOfLines={1} className="text-bodylg font-heading tracking-tight text-ink mt-3">
                                        {item.name}
                                    </Text>
                                    <Text numberOfLines={1} className="text-caption text-ink-muted font-label mt-1">
                                        {item.genre}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* List heading */}
            {totalCount > 0 && (
                <SectionTitle
                    eyebrow={activeCategory === ALL_CATEGORY_ID
                        ? `${totalCount} maison${totalCount > 1 ? 's' : ''} à ${BRAND_CITY}`
                        : `${totalCount} résultat${totalCount > 1 ? 's' : ''}`}
                    title={activeCategory === ALL_CATEGORY_ID
                        ? 'Tous les restaurants'
                        : FOOD_CATEGORIES.find((c) => c.id === activeCategory)?.label ?? 'Résultats'}
                    className="mb-2"
                    style={{ paddingHorizontal: SCREEN_GUTTER }}
                />
            )}
        </>
    );

    return (
        <View className="flex-1 bg-background">
            {/* Top app bar: address on the left, inbox on the right. */}
            <View className="absolute top-0 left-0 right-0 z-50 bg-surface border-b border-hairline">
                <View
                    style={{ paddingTop: insetTop, height: insetTop + HEADER_CONTENT_HEIGHT, paddingHorizontal: SCREEN_GUTTER }}
                    className="flex-row justify-between items-center"
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
                        style={{ minHeight: TOUCH_MIN }}
                    >
                        <View className="w-9 h-9 rounded-full items-center justify-center bg-accent-soft">
                            <MapPin color={COLORS.accentDark} size={18} strokeWidth={2.2} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-eyebrow font-label uppercase tracking-eyebrow text-ink-faint">
                                {selectedAddress ? 'Livrer à' : 'Adresse'}
                            </Text>
                            <View className="flex-row items-center gap-1">
                                <Text numberOfLines={1} className="text-bodylg font-title tracking-tight text-ink flex-shrink">
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
                        accessibilityRole="button"
                        accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
                        className="items-center justify-center rounded-full bg-fill active:scale-95"
                        style={{ width: TOUCH_MIN, height: TOUCH_MIN }}
                    >
                        <Bell color={COLORS.ink} size={22} strokeWidth={2} />
                        {unreadCount > 0 && (
                            <View className="absolute bg-accent rounded-full items-center justify-center border-2 border-surface" style={{ top: 2, right: 2, minWidth: 18, height: 18, paddingHorizontal: 3 }}>
                                <Text className="text-ink text-eyebrow font-labelbold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
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
                    paddingBottom: bottomClearance,
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.ink}
                        progressViewOffset={insetTop + HEADER_CONTENT_HEIGHT}
                    />
                }
            />
        </View>
    );
}

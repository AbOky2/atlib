import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChevronDown, MapPin, Store, WifiOff } from 'lucide-react-native';
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
import { RestaurantCard, cardHeight } from '../../../src/components/RestaurantCard';
import { useBottomClearance } from '../../../src/components/ActiveOrderBanner';
import { Button, EmptyState, SectionTitle, SCREEN_GUTTER, TOUCH_MIN } from '../../../src/components/ui';
import { isAcceptingOrders } from '../../../src/lib/availability';
import { FOOD_CATEGORIES, ALL_CATEGORY_ID, matchesCategory } from '../../../src/lib/categories';
import { getEstimatedDeliveryTime } from '../../../src/lib/localities';
import { BRAND_CITY } from '../../../src/lib/brand';
import { useNotifications } from '../../../src/hooks/useNotifications';
import { COLORS } from '../../../src/lib/palette';

/** « Bonjour » until 17h, « Bonsoir » after — and the meal the hour calls for. */
function greetingFor(hour: number, firstName: string | null) {
    const hello = hour < 17 ? 'Bonjour' : 'Bonsoir';
    const meal = hour < 11 ? 'ce matin' : hour < 15 ? 'ce midi' : 'ce soir';
    return { hello: firstName ? `${hello} ${firstName}` : hello, question: `Qu’est-ce qu’on mange ${meal} ?` };
}

export default function ClientHomeScreen() {
    const queryClient = useQueryClient();
    const { width: screenWidth } = useWindowDimensions();
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY_ID);
    const { data: restaurants, isLoading, isError, refetch } = useRestaurants();
    const user = useAuthStore(state => state.user);
    const { refetch: refetchOrders } = useUserOrders(user?.id);
    const showToast = useCartStore(state => state.showToast);
    const { isFavorite, toggleFavorite } = useFavoritesStore();
    const selectedAddress = useAddressStore(state => state.currentAddress);
    const insetTop = useHeaderInsetTop();
    const bottomClearance = useBottomClearance();
    const { unreadCount } = useNotifications();

    const cardWidth = screenWidth - SCREEN_GUTTER * 2;
    const rowHeight = cardHeight(cardWidth);
    const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? null;
    const greeting = greetingFor(new Date().getHours(), firstName);
    // A real number from the locality table once an address is known — never a
    // per-restaurant delay invented from its id.
    const estimate = selectedAddress ? `~${getEstimatedDeliveryTime(selectedAddress.locality)} min` : null;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await Promise.all([refetch(), refetchOrders()]);
        setRefreshing(false);
    }, [refetch, refetchOrders]);

    // Every restaurant gets the same card. Open kitchens first — a place you
    // cannot order from should never lead the list — then the rest, dimmed.
    const filteredRestaurants = useMemo(() => {
        if (!restaurants) return [];
        return restaurants
            .filter((r) => matchesCategory(r.genre, activeCategory))
            .sort((a, b) => Number(isAcceptingOrders(b)) - Number(isAcceptingOrders(a)));
    }, [restaurants, activeCategory]);
    const totalCount = filteredRestaurants.length;
    const openCount = filteredRestaurants.filter(isAcceptingOrders).length;

    const openRestaurant = useCallback((id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ pathname: '/restaurant', params: { id } });
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: Restaurant }) => (
            <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
                <RestaurantCard
                    restaurant={item}
                    width={cardWidth}
                    estimate={estimate}
                    favourite={isFavorite(item.id)}
                    onPressIn={() => prefetchRestaurant(queryClient, item.id)}
                    onPress={() => openRestaurant(item.id)}
                    onToggleFavourite={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const added = toggleFavorite(item.id);
                        showToast(added ? `${item.name} ajouté aux favoris` : `${item.name} retiré des favoris`);
                    }}
                />
            </View>
        ),
        [cardWidth, estimate, isFavorite, queryClient, openRestaurant, toggleFavorite, showToast],
    );

    const header = (
        <View>
            {/* Voice: who we talk to, and the question of the hour. */}
            <View style={{ paddingHorizontal: SCREEN_GUTTER }} className="pt-2">
                <Text className="text-eyebrow font-label uppercase tracking-eyebrow text-ink-faint mb-2">{greeting.hello}</Text>
                <Text className="text-display font-display tracking-tighter text-ink" accessibilityRole="header">{greeting.question}</Text>
            </View>

            {/* Cuisines — search has its own tab; the home only asks the question. */}
            <View className="mt-6 mb-5">
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
                    message={activeCategory === ALL_CATEGORY_ID ? 'Les restaurants partenaires apparaîtront ici.' : 'Aucune adresse dans cette cuisine pour le moment.'}
                    action={activeCategory === ALL_CATEGORY_ID ? undefined : <Button label="Voir toutes les cuisines" variant="secondary" onPress={() => setActiveCategory(ALL_CATEGORY_ID)} />}
                    className="py-12"
                />
            )}

            {totalCount > 0 && (
                <SectionTitle
                    eyebrow={openCount === totalCount
                        ? `${totalCount} adresse${totalCount > 1 ? 's' : ''} à ${BRAND_CITY}`
                        : `${openCount} ouverte${openCount > 1 ? 's' : ''} sur ${totalCount}`}
                    title={activeCategory === ALL_CATEGORY_ID
                        ? 'Les restaurants'
                        : FOOD_CATEGORIES.find((c) => c.id === activeCategory)?.label ?? 'Résultats'}
                    className="mb-4"
                    style={{ paddingHorizontal: SCREEN_GUTTER }}
                />
            )}
        </View>
    );

    return (
        <View className="flex-1 bg-background">
            {/* Top app bar: where we deliver, and the inbox. */}
            <View className="absolute top-0 left-0 right-0 z-50 bg-background">
                <View
                    style={{ paddingTop: insetTop, height: insetTop + HEADER_CONTENT_HEIGHT, paddingHorizontal: SCREEN_GUTTER }}
                    className="flex-row justify-between items-center"
                >
                    <Pressable
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/addresses'); }}
                        accessibilityRole="button"
                        accessibilityLabel={selectedAddress ? `Livrer à ${selectedAddress.locality}, changer d'adresse` : 'Choisir une adresse de livraison'}
                        className="flex-row items-center flex-1 pr-3 active:opacity-60"
                        style={{ gap: 12, minHeight: TOUCH_MIN }}
                    >
                        <View className="w-9 h-9 rounded-full items-center justify-center bg-accent-soft">
                            <MapPin color={COLORS.accentDark} size={18} strokeWidth={2.2} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-eyebrow font-label uppercase tracking-eyebrow text-ink-faint">
                                {selectedAddress ? 'Livrer à' : 'Adresse'}
                            </Text>
                            <View className="flex-row items-center" style={{ gap: 4 }}>
                                <Text numberOfLines={1} className="text-bodylg font-title tracking-tight text-ink flex-shrink">
                                    {selectedAddress ? selectedAddress.locality : 'Choisir une adresse'}
                                </Text>
                                <ChevronDown color={COLORS.ink} size={16} strokeWidth={2.4} />
                            </View>
                        </View>
                    </Pressable>

                    <Pressable
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/notifications'); }}
                        accessibilityRole="button"
                        accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
                        className="items-center justify-center rounded-full bg-fill active:scale-95"
                        style={{ width: TOUCH_MIN, height: TOUCH_MIN }}
                    >
                        <Bell color={COLORS.ink} size={22} strokeWidth={2} />
                        {unreadCount > 0 && (
                            <View className="absolute bg-accent rounded-full items-center justify-center border-2 border-background" style={{ top: 2, right: 2, minWidth: 18, height: 18, paddingHorizontal: 3 }}>
                                <Text className="text-ink text-eyebrow font-labelbold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>

            <FlatList
                data={filteredRestaurants}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={header}
                getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
                initialNumToRender={4}
                windowSize={5}
                removeClippedSubviews
                contentContainerStyle={{ paddingTop: insetTop + HEADER_CONTENT_HEIGHT + 8, paddingBottom: bottomClearance }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ink} progressViewOffset={insetTop + HEADER_CONTENT_HEIGHT} />
                }
            />
        </View>
    );
}

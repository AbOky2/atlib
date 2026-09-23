import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Share, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Share2, Star, Clock, Bike, Plus, Utensils, Store, WifiOff } from 'lucide-react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useCartStore } from '../../src/store/cartStore';
import { useFavoritesStore } from '../../src/store/favoritesStore';
import { useAddressStore } from '../../src/store/addressStore';
import { type Dish } from '../../src/data/types';
import { useDishes, useRestaurant } from '../../src/data/catalogue';
import { DishCustomizationModal } from '../../src/components/DishCustomizationModal';
import { RemoteImage } from '../../src/components/RemoteImage';
import { ClosedBadge } from '../../src/components/ClosedBadge';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { Button, EmptyState, IconButton, TypeText, BottomActionBar, BOTTOM_BAR_CLEARANCE, SCREEN_GUTTER, TOUCH_MIN } from '../../src/components/ui';
import { BRAND_FULL } from '../../src/lib/brand';
import { getEstimatedDeliveryTime } from '../../src/lib/localities';
import { DELIVERY_FEE_XAF, formatXaf } from '../../src/lib/pricing';
import { shadowFloat } from '../../src/lib/elevation';
import { isAcceptingOrders, CLOSED_NOTICE } from '../../src/lib/availability';
import { COLORS } from '../../src/lib/palette';

const HERO_HEIGHT = 320;

export default function RestaurantDetailsScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const { id } = useLocalSearchParams<{ id: string }>();
    const cartTotal = useCartStore(state => state.getTotalPrice());
    const cartItems = useCartStore(state => state.getTotalItems());
    const addItem = useCartStore(state => state.addItem);
    const reconcileWithMenu = useCartStore(state => state.reconcileWithMenu);
    const showToast = useCartStore(state => state.showToast);
    const selectedAddress = useAddressStore(state => state.currentAddress);

    const { data: restaurant, isLoading: loadingRestaurant, isError: restaurantError, refetch: refetchRestaurant } = useRestaurant(id ?? '');
    const { data: dishes, isLoading: loadingMenu, isError: menuError, refetch } = useDishes(id ?? '');
    const { isFavorite, toggleFavorite } = useFavoritesStore();
    const isFav = isFavorite(id ?? '');

    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
    const scrollRef = useRef<ScrollView>(null);
    const sectionOffsets = useRef<Record<string, number>>({});
    const menuTop = useRef(0);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await Promise.all([refetch(), refetchRestaurant()]);
        setRefreshing(false);
    }, [refetch, refetchRestaurant]);

    // A sheet left open while the user walks away is wrong; closing on blur costs nothing.
    useFocusEffect(useCallback(() => () => setSelectedDish(null), []));

    // Opening another restaurant can reuse this component, so state tied to the
    // previous one is dropped explicitly.
    useEffect(() => {
        setActiveCategory(null);
        setSelectedDish(null);
        sectionOffsets.current = {};
    }, [id]);

    // The basket follows the menu: a dish that vanished or changed price since it
    // was added is corrected here, with a word, before the checkout can refuse it.
    useEffect(() => {
        if (!id || !dishes) return;
        const { removed, repriced } = reconcileWithMenu(id, dishes);
        if (removed.length) showToast(`${removed.join(', ')} n’est plus disponible et a été retiré du panier.`, 'info');
        else if (repriced.length) showToast('Le prix de certains plats de votre panier a été mis à jour.', 'info');
    }, [id, dishes, reconcileWithMenu, showToast]);

    const isOpen = isAcceptingOrders(restaurant);
    const estimate = selectedAddress ? `~${getEstimatedDeliveryTime(selectedAddress.locality)} min` : null;

    // Tapping a dish (card or +) opens the customization modal — nothing is added
    // to the cart until the user validates from the modal.
    const openDish = (item: Dish) => {
        if (!isOpen) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showToast(CLOSED_NOTICE, 'info');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDish(item);
    };

    const handleModalConfirm = (payload: { quantity: number; note?: string; options?: string[]; unitPrice: number }) => {
        if (!selectedDish) return;
        addItem({
            id: selectedDish.id,
            name: selectedDish.name,
            price: payload.unitPrice,
            quantity: payload.quantity,
            restaurantId: selectedDish.restaurant_id!,
            restaurantName: restaurant?.name,
            image_url: selectedDish.image_url || undefined,
            note: payload.note,
            options: payload.options,
        });
        showToast(`${payload.quantity} × ${selectedDish.name} ajouté${payload.quantity > 1 ? 's' : ''} au panier`);
        setSelectedDish(null);
    };

    const categories = useMemo(() => {
        if (!dishes) return [];
        return [...new Set(dishes.map(item => item.categories?.name ?? 'Divers'))];
    }, [dishes]);

    useEffect(() => {
        if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0]);
    }, [categories, activeCategory]);

    // The category bar is a real table of contents: it scrolls to the section.
    const jumpTo = (category: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveCategory(category);
        const y = sectionOffsets.current[category];
        if (y != null) scrollRef.current?.scrollTo({ y: menuTop.current + y - 72, animated: true });
    };

    if (loadingRestaurant && !restaurant) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color={COLORS.ink} />
            </View>
        );
    }

    if (!restaurant || restaurant.is_active === false) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader back="arrow" onBack={() => router.back()} />
                <View className="flex-1 items-center justify-center">
                    <EmptyState
                        icon={restaurantError ? WifiOff : Store}
                        title={restaurantError ? 'Connexion impossible' : 'Restaurant indisponible'}
                        message={restaurantError ? 'Vérifiez votre connexion internet et réessayez.' : 'Ce restaurant ne fait plus partie de la sélection pour le moment.'}
                        action={restaurantError
                            ? <Button label="Réessayer" variant="secondary" onPress={() => { void refetchRestaurant(); }} />
                            : <Button label="Voir les autres restaurants" onPress={() => router.back()} />}
                    />
                </View>
            </View>
        );
    }

    // The sticky element is the category bar. Its index shifts when the closed
    // notice is inserted above it, so it is derived rather than hardcoded.
    const stickyIndex = isOpen ? 1 : 2;
    const showCartBar = cartItems > 0 && isOpen;

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title={restaurant.name}
                back="arrow"
                onBack={() => router.back()}
                centerTitle
                right={
                    <View className="flex-row items-center gap-2">
                        <IconButton
                            icon={Heart}
                            label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            onPress={() => {
                                const added = toggleFavorite(id ?? '');
                                showToast(added ? 'Ajouté aux favoris' : 'Retiré des favoris');
                            }}
                        />
                        <IconButton
                            icon={Share2}
                            label="Partager ce restaurant"
                            onPress={() => { Share.share({ message: `Découvrez ${restaurant.name} sur ${BRAND_FULL} !` }).catch(() => {}); }}
                        />
                    </View>
                }
            />

            <ScrollView
                ref={scrollRef}
                className="flex-1"
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[stickyIndex]}
                contentContainerStyle={{ paddingTop: headerOffset, paddingBottom: showCartBar ? BOTTOM_BAR_CLEARANCE + insets.bottom : Math.max(insets.bottom, 24) + 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ink} progressViewOffset={headerOffset} />}
            >
                {/* Hero */}
                <View className="relative w-full overflow-hidden bg-ink" style={{ height: HERO_HEIGHT }}>
                    <RemoteImage uri={restaurant.image_url} displayWidth={430} className="w-full h-full" />
                    <View className="absolute inset-0 bg-black/40" />
                    <View className="absolute bottom-0 left-0 w-full pb-6" style={{ paddingHorizontal: SCREEN_GUTTER }}>
                        <View className="flex-row items-center gap-2 mb-3">
                            <View className="flex-row items-center gap-2 bg-accent px-3 rounded-full" style={{ height: 28 }}>
                                <Star fill={COLORS.ink} color={COLORS.ink} size={14} strokeWidth={2} />
                                <Text className="text-ink text-eyebrow font-labelbold tracking-eyebrow uppercase">
                                    {restaurant.genre?.split(',')[0] ?? 'Recommandé'}
                                </Text>
                            </View>
                            {!isOpen && <ClosedBadge />}
                        </View>
                        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} className="text-h1 font-display tracking-tight text-white" accessibilityRole="header">
                            {restaurant.name}
                        </Text>
                        <View className="flex-row flex-wrap items-center gap-x-6 gap-y-2 mt-4">
                            {restaurant.rating != null ? (
                                <View className="flex-row items-center gap-1">
                                    <Star fill={COLORS.white} color={COLORS.white} size={16} strokeWidth={2} />
                                    <Text className="text-white text-body font-label">{restaurant.rating}</Text>
                                </View>
                            ) : null}
                            {estimate ? (
                                <View className="flex-row items-center gap-1">
                                    <Clock color={COLORS.white} size={16} strokeWidth={2} />
                                    <Text className="text-white text-body font-label">{estimate}</Text>
                                </View>
                            ) : null}
                            <View className="flex-row items-center gap-1">
                                <Bike color={COLORS.white} size={16} strokeWidth={2} />
                                <Text className="text-white text-body font-label">Livraison {formatXaf(DELIVERY_FEE_XAF)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Closed notice — stated once, plainly, before the menu */}
                {!isOpen && (
                    <View className="mt-6 mb-2 flex-row items-center gap-3 rounded-panel border border-hairline bg-surface px-5 py-4" style={{ marginHorizontal: SCREEN_GUTTER }}>
                        <View className="w-9 h-9 rounded-full bg-fill items-center justify-center">
                            <Clock color={COLORS.ink} size={18} strokeWidth={2} />
                        </View>
                        <TypeText variant="label" tone="secondary" className="flex-1">
                            {CLOSED_NOTICE} Vous pouvez consulter la carte en attendant.
                        </TypeText>
                    </View>
                )}

                {/* Category bar — sticky, and a real table of contents */}
                <View className="bg-background py-3 border-b border-hairline z-40">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: 8 }}>
                        {categories.map((cat) => {
                            const active = activeCategory === cat;
                            return (
                                <Pressable
                                    key={cat}
                                    onPress={() => jumpTo(cat)}
                                    accessibilityRole="tab"
                                    accessibilityState={{ selected: active }}
                                    className={`px-4 rounded-full items-center justify-center ${active ? 'bg-ink' : 'bg-fill'}`}
                                    style={{ height: 36 }}
                                >
                                    <Text className={`text-label font-labelbold ${active ? 'text-white' : 'text-ink-muted'}`}>{cat}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Menu — every dish uses ONE uniform row */}
                <View
                    className="pt-8 gap-10"
                    style={{ paddingHorizontal: SCREEN_GUTTER }}
                    onLayout={(e: LayoutChangeEvent) => { menuTop.current = e.nativeEvent.layout.y; }}
                >
                    {loadingMenu && categories.length === 0 && (
                        <View className="items-center py-16">
                            <ActivityIndicator size="large" color={COLORS.ink} />
                        </View>
                    )}
                    {!loadingMenu && menuError && categories.length === 0 && (
                        <EmptyState
                            icon={WifiOff}
                            title="Carte indisponible"
                            message="Impossible de charger la carte. Vérifiez votre connexion."
                            action={<Button label="Réessayer" variant="secondary" onPress={() => { void refetch(); }} />}
                            className="py-8"
                        />
                    )}
                    {!loadingMenu && !menuError && categories.length === 0 && (
                        <EmptyState icon={Utensils} title="Carte en préparation" message="Ce restaurant n’a pas encore publié ses plats." className="py-8" />
                    )}
                    {categories.map(category => {
                        const items = dishes?.filter(item => (item.categories?.name ?? 'Divers') === category) ?? [];
                        if (items.length === 0) return null;

                        return (
                            <View key={`section-${category}`} onLayout={(e: LayoutChangeEvent) => { sectionOffsets.current[category] = e.nativeEvent.layout.y; }}>
                                <View className="flex-row items-center gap-4 mb-5">
                                    <Text className="text-h3 font-title tracking-tight text-ink" accessibilityRole="header">{category}</Text>
                                    <View className="h-px flex-1 bg-hairline" />
                                </View>

                                <View className="gap-6">
                                    {items.map((item) => (
                                        <Pressable
                                            key={item.id}
                                            onPress={() => openDish(item)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${item.name}, ${formatXaf(item.price_xaf)}`}
                                            className="flex-row gap-4 items-start active:opacity-70"
                                        >
                                            <View className="flex-1 pt-1">
                                                <Text numberOfLines={2} className="font-heading tracking-tight text-h3 text-ink">{item.name}</Text>
                                                <TypeText variant="caption" tone="secondary" numberOfLines={2} className="mt-1 mb-2" style={{ minHeight: 32 }}>
                                                    {item.short_description || 'Spécialité de la maison'}
                                                </TypeText>
                                                <Text className="font-title text-bodylg text-ink">{formatXaf(item.price_xaf)}</Text>
                                            </View>
                                            <View className="w-24 h-24">
                                                <View className="w-full h-full rounded-card overflow-hidden bg-fill-strong items-center justify-center">
                                                    {item.image_url ? (
                                                        <RemoteImage uri={item.image_url} displayWidth={96} className="w-full h-full" />
                                                    ) : (
                                                        <Utensils color={COLORS.inkFaint} size={28} strokeWidth={1.8} />
                                                    )}
                                                </View>
                                                <Pressable
                                                    onPress={() => openDish(item)}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Ajouter ${item.name}`}
                                                    className="absolute -bottom-2 -right-2 items-center justify-center active:scale-90"
                                                    style={{ width: TOUCH_MIN, height: TOUCH_MIN }}
                                                >
                                                    <View className="w-9 h-9 bg-ink rounded-full items-center justify-center" style={shadowFloat}>
                                                        <Plus color={COLORS.white} size={20} strokeWidth={2.2} />
                                                    </View>
                                                </Pressable>
                                            </View>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {showCartBar && (
                <BottomActionBar>
                    <Button
                        label="Voir le panier"
                        onPress={() => router.push('/cart')}
                        leading={
                            <View className="rounded-full bg-white/25 items-center justify-center px-2" style={{ minWidth: 24, height: 24 }}>
                                <Text className="text-white font-labelbold text-caption">{cartItems}</Text>
                            </View>
                        }
                        trailing={<Text className="text-bodylg font-title text-white tracking-tight">{formatXaf(cartTotal)}</Text>}
                        accessibilityLabel={`Voir le panier, ${cartItems} article${cartItems > 1 ? 's' : ''}, ${formatXaf(cartTotal)}`}
                    />
                </BottomActionBar>
            )}

            {selectedDish && (
                <DishCustomizationModal
                    dish={selectedDish}
                    restaurantName={restaurant?.name}
                    onClose={() => setSelectedDish(null)}
                    onConfirm={handleModalConfirm}
                />
            )}
        </View>
    );
}

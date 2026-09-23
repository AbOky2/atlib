import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Share, Animated, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Heart, Share2, Star, Clock, Bike, MapPin, Plus, Utensils, Store, WifiOff, type LucideIcon } from 'lucide-react-native';
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
import { ScreenHeader, useHeaderInsetTop, useHeaderOffset, HEADER_CONTENT_HEIGHT } from '../../src/components/ScreenHeader';
import { Button, EmptyState, IconButton, TypeText, BottomActionBar, BOTTOM_BAR_CLEARANCE, SCREEN_GUTTER, TOUCH_MIN } from '../../src/components/ui';
import { BRAND_FULL } from '../../src/lib/brand';
import { getEstimatedDeliveryTime } from '../../src/lib/localities';
import { DELIVERY_FEE_XAF, formatXaf } from '../../src/lib/pricing';
import { shadowFloat } from '../../src/lib/elevation';
import { isAcceptingOrders, CLOSED_NOTICE } from '../../src/lib/availability';
import { COLORS } from '../../src/lib/palette';

/** The photo owns the top of the screen; the app bar floats over it until it is scrolled away. */
const HERO_HEIGHT = 300;
/** Distance, in points, over which the bar turns from transparent to solid. */
const HEADER_FADE = 64;

/**
 * App bar of a screen that starts with a picture.
 *
 * Transparent while the photo is under it, with white discs that read on any
 * image; fades to the standard solid bar — and reveals the name — as the hero
 * leaves the screen. `progress` (0 → 1) is driven by the scroll position.
 */
function HeroHeader({
    title,
    progress,
    favourite,
    onBack,
    onToggleFavourite,
    onShare,
}: {
    title: string;
    progress: Animated.AnimatedInterpolation<number>;
    favourite: boolean;
    onBack: () => void;
    onToggleFavourite: () => void;
    onShare: () => void;
}) {
    const insetTop = useHeaderInsetTop();
    return (
        <View className="absolute top-0 left-0 right-0 z-50" pointerEvents="box-none">
            <Animated.View pointerEvents="none" className="absolute top-0 left-0 right-0 bottom-0 bg-surface border-b border-hairline" style={{ opacity: progress }} />
            <View
                style={{ paddingTop: insetTop, height: insetTop + HEADER_CONTENT_HEIGHT, paddingHorizontal: SCREEN_GUTTER }}
                className="flex-row items-center"
                pointerEvents="box-none"
            >
                <View style={{ minWidth: TOUCH_MIN }} className="items-start">
                    <IconButton icon={ArrowLeft} tone="floating" label="Retour" onPress={onBack} />
                </View>
                <Animated.View className="flex-1 items-center px-2" style={{ opacity: progress }} pointerEvents="none">
                    <Text numberOfLines={1} className="text-h3 font-title tracking-tight text-ink">{title}</Text>
                </Animated.View>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                    <IconButton
                        icon={Heart}
                        tone="floating"
                        active={favourite}
                        label={favourite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        onPress={onToggleFavourite}
                    />
                    <IconButton icon={Share2} tone="floating" label="Partager ce restaurant" onPress={onShare} />
                </View>
            </View>
        </View>
    );
}

/** One fact about the delivery — fee, time — as a quiet pill. */
function Fact({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress?: () => void }) {
    const body = (
        <>
            <Icon color={COLORS.ink} size={16} strokeWidth={2} />
            <Text className="text-label font-label text-ink" numberOfLines={1}>{label}</Text>
        </>
    );
    const className = 'flex-row items-center bg-fill rounded-full px-3';
    const style = { height: 36, gap: 6 };
    if (!onPress) return <View className={className} style={style}>{body}</View>;
    return (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className={`${className} active:bg-fill-strong`} style={style}>
            {body}
        </Pressable>
    );
}

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
    const scrollY = useRef(new Animated.Value(0)).current;
    const sectionOffsets = useRef<Record<string, number>>({});
    const menuTop = useRef(0);
    const barHeight = useRef(0);

    const headerProgress = scrollY.interpolate({
        inputRange: [HERO_HEIGHT - headerOffset - HEADER_FADE, HERO_HEIGHT - headerOffset],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

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

    // The category bar is a real table of contents: it scrolls to the section,
    // which lands just under the bar once it is stuck beneath the app bar.
    const jumpTo = (category: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveCategory(category);
        const y = sectionOffsets.current[category];
        if (y != null) scrollRef.current?.scrollTo({ y: menuTop.current + y - headerOffset - barHeight.current - 8, animated: true });
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

    // Children of the scroll view: hero, identity, [closed notice], category bar,
    // menu. The sticky one is the bar, so its index moves with the notice.
    const stickyIndex = isOpen ? 2 : 3;
    const showCartBar = cartItems > 0 && isOpen;
    const genre = restaurant.genre?.split(',')[0]?.trim() || null;

    return (
        <View className="flex-1 bg-background">
            <HeroHeader
                title={restaurant.name}
                progress={headerProgress}
                favourite={isFav}
                onBack={() => router.back()}
                onToggleFavourite={() => {
                    const added = toggleFavorite(id ?? '');
                    showToast(added ? 'Ajouté aux favoris' : 'Retiré des favoris');
                }}
                onShare={() => { Share.share({ message: `Découvrez ${restaurant.name} sur ${BRAND_FULL} !` }).catch(() => {}); }}
            />

            <Animated.ScrollView
                ref={scrollRef}
                className="flex-1"
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[stickyIndex]}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: showCartBar ? BOTTOM_BAR_CLEARANCE + insets.bottom : Math.max(insets.bottom, 24) + 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} progressViewOffset={headerOffset} />}
            >
                {/* 0 — Hero: the photo, full bleed under the floating bar */}
                <View className="w-full overflow-hidden bg-ink" style={{ height: HERO_HEIGHT }}>
                    <RemoteImage uri={restaurant.image_url} displayWidth={430} className="w-full h-full" style={{ opacity: isOpen ? 1 : 0.6 }} />
                    {/* A light veil at the top keeps the white discs legible on a pale sky. */}
                    <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)']}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: headerOffset + 32 }}
                    />
                    {!isOpen ? <View className="absolute bottom-5" style={{ left: SCREEN_GUTTER }}><ClosedBadge /></View> : null}
                </View>

                {/* 1 — Identity: the name, the cuisine, the two facts a customer asks first */}
                <View className="pt-5 pb-3" style={{ paddingHorizontal: SCREEN_GUTTER }}>
                    <Text className="text-h1 font-display tracking-tighter text-ink" accessibilityRole="header">
                        {restaurant.name}
                    </Text>
                    <View className="flex-row items-center mt-2" style={{ gap: 6 }}>
                        {restaurant.rating != null ? (
                            <>
                                <Star fill={COLORS.ink} color={COLORS.ink} size={14} strokeWidth={2} />
                                <Text className="text-label font-labelbold text-ink">{restaurant.rating}</Text>
                                {genre ? <View className="w-1 h-1 rounded-full bg-ink-disabled" /> : null}
                            </>
                        ) : null}
                        {genre ? <Text className="text-label font-body text-ink-muted flex-shrink" numberOfLines={1}>{genre}</Text> : null}
                    </View>
                    <View className="flex-row flex-wrap mt-4" style={{ gap: 8 }}>
                        <Fact icon={Bike} label={`Livraison ${formatXaf(DELIVERY_FEE_XAF)}`} />
                        {estimate && selectedAddress
                            ? <Fact icon={Clock} label={`${estimate} · ${selectedAddress.locality}`} />
                            : <Fact icon={MapPin} label="Choisir une adresse" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/addresses'); }} />}
                    </View>
                </View>

                {/* 2 — Closed notice: stated once, plainly, before the menu */}
                {!isOpen && (
                    <View className="mt-3 mb-2 flex-row items-center rounded-panel border border-hairline bg-surface px-5 py-4" style={{ gap: 12, marginHorizontal: SCREEN_GUTTER }}>
                        <View className="w-9 h-9 rounded-full bg-fill items-center justify-center">
                            <Clock color={COLORS.ink} size={18} strokeWidth={2} />
                        </View>
                        <TypeText variant="label" tone="secondary" className="flex-1">
                            {CLOSED_NOTICE} Vous pouvez consulter la carte en attendant.
                        </TypeText>
                    </View>
                )}

                {/* Category bar — sticky under the app bar.
                    It carries a transparent top padding the height of the bar and
                    pulls itself up by the same amount: nothing moves while it
                    scrolls, and once stuck the chips sit exactly below the (by then
                    solid) app bar instead of under it. */}
                <View className="z-40" style={{ marginTop: -headerOffset, paddingTop: headerOffset }} pointerEvents="box-none">
                    <View
                        className="bg-background py-3 border-b border-hairline"
                        onLayout={(e: LayoutChangeEvent) => { barHeight.current = e.nativeEvent.layout.height; }}
                    >
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
                </View>

                {/* Menu — every dish uses ONE uniform row */}
                <View
                    className="pt-8"
                    style={{ gap: 40, paddingHorizontal: SCREEN_GUTTER }}
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
                                <View className="flex-row items-center mb-5" style={{ gap: 16 }}>
                                    <Text className="text-h3 font-title tracking-tight text-ink" accessibilityRole="header">{category}</Text>
                                    <View className="h-px flex-1 bg-hairline" />
                                </View>

                                <View style={{ gap: 24 }}>
                                    {items.map((item) => (
                                        <Pressable
                                            key={item.id}
                                            onPress={() => openDish(item)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${item.name}, ${formatXaf(item.price_xaf)}`}
                                            className="flex-row items-start active:opacity-70"
                                            style={{ gap: 16 }}
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
            </Animated.ScrollView>

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

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Share2, Star, Clock, CreditCard, Plus, Utensils } from 'lucide-react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../src/store/cartStore';
import { useFavoritesStore } from '../../src/store/favoritesStore';
import { useRestaurant, useDishes, type Dish } from '../../src/hooks/useSupabase';
import { DishCustomizationModal } from '../../src/components/DishCustomizationModal';
import { RemoteImage } from '../../src/components/RemoteImage';
import { BRAND } from '../../src/lib/brand';
import { restaurantEtaRange, formatEtaRange } from '../../src/lib/eta';
import { DELIVERY_FEE_XAF, formatXaf as formatPrice } from '../../src/lib/pricing';
import { shadowSoft, shadowFloat } from '../../src/lib/elevation';
import { isAcceptingOrders, CLOSED_NOTICE } from '../../src/lib/availability';
import { Button, SCREEN_GUTTER } from '../../src/components/ui';

export default function RestaurantDetailsScreen() {
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const cartTotal = useCartStore(state => state.getTotalPrice());
    const cartItems = useCartStore(state => state.getTotalItems());
    const addItem = useCartStore(state => state.addItem);
    const showToast = useCartStore(state => state.showToast);

    const { data: restaurant, isLoading: loadingRestaurant } = useRestaurant(id ?? '');
    const { data: dishes, isLoading: loadingMenu, refetch } = useDishes(id ?? '');
    const { isFavorite, toggleFavorite } = useFavoritesStore();
    const isFav = isFavorite(id ?? '');

    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [selectedDish, setSelectedDish] = useState<Dish | null>(null);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // Belt and braces. The screen is now unmounted when popped from the Stack,
    // so a sheet cannot outlive it — but a sheet left open while the user walks
    // away is still wrong, and closing on blur costs nothing.
    useFocusEffect(
        useCallback(() => () => setSelectedDish(null), []),
    );

    // Opening another restaurant can reuse this component, so state tied to the
    // previous one is dropped explicitly.
    useEffect(() => {
        setActiveCategory(null);
        setSelectedDish(null);
    }, [id]);

    const isOpen = isAcceptingOrders(restaurant);

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

    // Get unique categories
    const categories = useMemo(() => {
        if (!dishes) return [];
        return [...new Set(dishes.map(item => (item.categories as any)?.name ?? 'Divers'))];
    }, [dishes]);

    React.useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            setActiveCategory(categories[0]);
        }
    }, [categories.length]);

    // Only block on a full-screen spinner when we truly have nothing to show.
    // When prefetched, `restaurant` is already in cache → render instantly and
    // let the menu fill in with a small inline loader if dishes are still fetching.
    if (loadingRestaurant && !restaurant) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#FF5733" />
            </View>
        );
    }

    if (!restaurant) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <Text className="text-ink-faint font-body">Restaurant non trouvé</Text>
            </View>
        );
    }

    const eta = formatEtaRange(restaurantEtaRange(restaurant.id));
    // The sticky element is the category bar. Its position shifts when the
    // closed notice is inserted above it, so it is derived rather than hardcoded
    // — a literal index silently stuck to the wrong child the day a section was
    // added.
    const stickyIndex = isOpen ? 1 : 2;

    return (
        <View className="flex-1 bg-background">
            {/* Solid in-flow header — one theme across the whole browse flow, so
                opening a restaurant no longer flips the screen to black. */}
            <View
                className="flex-row justify-between items-center px-6 pb-4 bg-white border-b border-hairline z-50"
                style={{ paddingTop: Math.max(insets.top + 10, 40), ...shadowSoft }}
            >
                <View className="flex-row items-center gap-3">
                    <Pressable
                        onPress={() => router.back()}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-fill active:scale-95"
                    >
                        <ArrowLeft color="#1c1b1b" size={24} />
                    </Pressable>
                </View>
                <Text className="text-h2 font-title tracking-tight text-ink">{BRAND}</Text>
                <View className="flex-row items-center gap-2">
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            const added = toggleFavorite(id ?? '');
                            showToast(added ? 'Ajouté aux favoris !' : 'Retiré des favoris');
                        }}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-fill active:scale-95"
                    >
                        <Heart fill={isFav ? "#FF5733" : "transparent"} color={isFav ? "#FF5733" : "#1c1b1b"} size={20} />
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            Share.share({ message: `Découvre ${restaurant.name} sur NOIR Delivery !` }).catch(() => {});
                        }}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-fill active:scale-95"
                    >
                        <Share2 color="#1c1b1b" size={20} />
                    </Pressable>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[stickyIndex]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5733" />
                }
            >
                {/* Hero Section */}
                <View className="relative h-[380px] w-full overflow-hidden">
                    <RemoteImage uri={restaurant.image_url} displayWidth={430} className="w-full h-full" />
                    {/* Flat scrim (no gradient) so the white name/rating stay readable. */}
                    <View className="absolute inset-0 bg-black/35" />

                    <View className="absolute bottom-0 left-0 w-full px-6 pb-8">
                        <View className="self-start flex-row items-center gap-2 mb-3">
                            <View className="flex-row items-center gap-2 bg-accent px-3 py-1.5 rounded-full" style={shadowSoft}>
                                <Star fill="#fff" color="#fff" size={14} />
                                <Text className="text-white text-eyebrow font-heading tracking-[0.05em] uppercase">
                                    {restaurant.genre?.split(',')[0] ?? 'Recommandé'}
                                </Text>
                            </View>
                        </View>
                        <Text
                            numberOfLines={2}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                            className="text-h1 font-display tracking-tight text-white leading-[1.05]"
                        >
                            {restaurant.name}
                        </Text>
                        <View className="flex-row flex-wrap items-center gap-x-6 gap-y-2 mt-4">
                            <View className="flex-row items-center gap-1.5">
                                <Star fill="#fff" color="#fff" size={18} />
                                <Text className="text-white text-body font-label">{restaurant.rating}</Text>
                            </View>
                            <View className="flex-row items-center gap-1.5">
                                <Clock color="#fff" size={18} />
                                <Text className="text-white text-body font-label">{eta}</Text>
                            </View>
                            <View className="flex-row items-center gap-1.5">
                                <CreditCard color="#fff" size={18} />
                                <Text className="text-white text-body font-label">{formatPrice(DELIVERY_FEE_XAF)} livraison</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Closed notice — stated once, plainly, before the menu */}
                {!isOpen && (
                    <View className="mx-6 mt-6 mb-2 flex-row items-center gap-3 rounded-panel border border-hairline bg-white px-5 py-4">
                        <View className="w-9 h-9 rounded-full bg-fill items-center justify-center">
                            <Clock color="#1c1b1b" size={17} />
                        </View>
                        <Text className="flex-1 text-label font-body text-ink-muted leading-relaxed">
                            {CLOSED_NOTICE} Vous pouvez consulter la carte en attendant.
                        </Text>
                    </View>
                )}

                {/* Category Scroll */}
                <View className="bg-background pb-4 pt-4 border-b border-hairline z-40">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 flex-row gap-8">
                        {categories.map((cat, index) => (
                            <Pressable
                                key={cat}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setActiveCategory(cat);
                                }}
                            >
                                <Text className={`text-eyebrow font-heading tracking-[0.05em] uppercase ${index === categories.length - 1 ? 'pr-8' : 'mr-8'} ${activeCategory === cat ? 'text-accent' : 'text-ink-muted'}`}>
                                    {cat}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Menu Content — every dish uses ONE uniform card */}
                <View className="px-6 pb-40 pt-10 flex-col gap-12">
                    {loadingMenu && categories.length === 0 && (
                        <View className="items-center py-16">
                            <ActivityIndicator size="large" color="#FF5733" />
                        </View>
                    )}
                    {!loadingMenu && categories.length === 0 && (
                        <View className="items-center py-16">
                            <Utensils color="#c4c7c7" size={40} />
                            <Text className="text-ink-faint font-body mt-4">Menu bientôt disponible.</Text>
                        </View>
                    )}
                    {categories.map(category => {
                        const items = dishes?.filter(item => ((item.categories as any)?.name ?? 'Divers') === category) ?? [];
                        if (items.length === 0) return null;

                        return (
                            <View key={`section-${category}`}>
                                <View className="flex-row items-center gap-4 mb-6">
                                    <Text className="text-h3 font-title tracking-[0.04em] uppercase text-ink">{category}</Text>
                                    <View className="h-px flex-1 bg-hairline" />
                                </View>

                                <View className="flex-col gap-7">
                                    {items.map((item) => (
                                        <Pressable
                                            key={item.id}
                                            onPress={() => openDish(item)}
                                            className="flex-row gap-4 items-start active:opacity-70"
                                        >
                                            <View className="flex-1 pt-0.5">
                                                <Text numberOfLines={2} className="font-heading tracking-[-0.01em] text-h3 text-ink leading-snug">{item.name}</Text>
                                                <Text numberOfLines={2} className="text-ink-muted text-caption font-body leading-relaxed mt-1.5 mb-2.5" style={{ minHeight: 34 }}>
                                                    {item.short_description || 'Spécialité de la maison'}
                                                </Text>
                                                <Text className="font-title text-bodylg text-ink">{formatPrice(item.price_xaf)}</Text>
                                            </View>
                                            <View className="w-[104px] h-[104px]">
                                                <View className="w-full h-full rounded-card overflow-hidden bg-fill-strong items-center justify-center">
                                                    {item.image_url ? (
                                                        <RemoteImage uri={item.image_url} displayWidth={104} className="w-full h-full" />
                                                    ) : (
                                                        <Utensils color="#8d8a87" size={28} />
                                                    )}
                                                </View>
                                                <Pressable
                                                    onPress={(e) => {
                                                        e.stopPropagation?.();
                                                        openDish(item);
                                                    }}
                                                    hitSlop={8}
                                                    className="absolute -bottom-2.5 -right-2.5 w-9 h-9 bg-ink rounded-full items-center justify-center active:scale-90"
                                                    style={shadowFloat}
                                                >
                                                    <Plus color="#ffffff" size={20} />
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

            {cartItems > 0 && isOpen && (
                <View
                    className="absolute left-0 right-0 px-6"
                    style={{ bottom: Math.max(insets.bottom, 16) }}
                    pointerEvents="box-none"
                >
                    <Button
                        label="Voir le panier"
                        onPress={() => router.push('/cart')}
                        leading={
                            <View className="min-w-[26px] h-6 px-1.5 rounded-full bg-white/25 items-center justify-center mr-1">
                                <Text className="text-white font-labelbold text-caption">{cartItems}</Text>
                            </View>
                        }
                        trailing={<Text className="text-bodylg font-title text-white tracking-tight">{formatPrice(cartTotal)}</Text>}
                        accessibilityLabel={`Voir le panier, ${cartItems} articles, ${formatPrice(cartTotal)}`}
                    />
                </View>
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

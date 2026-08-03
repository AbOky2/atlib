import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Image, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Bell, Flame, ChevronDown, Star, Heart, Clock, Truck, Beef, Pizza, Coffee, MoreHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { useRestaurants, useUserOrders, prefetchRestaurant } from '../../src/hooks/useSupabase';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { useFavoritesStore } from '../../src/store/favoritesStore';
import { useAddressStore } from '../../src/store/addressStore';
import { useHeaderInsetTop, HEADER_CONTENT_HEIGHT } from '../../src/components/ScreenHeader';
import { CategoryChip } from '../../src/components/CategoryChip';
import { useNotifications } from '../../src/hooks/useNotifications';
import { restaurantEtaRange, formatEtaRange } from '../../src/lib/eta';
import { DELIVERY_FEE_XAF, formatXaf } from '../../src/lib/pricing';
import { shadowSoft } from '../../src/lib/elevation';

const CATEGORIES = [
    { id: 'all', icon: <Flame color="#FF5733" size={24} />, label: 'Tout' },
    { id: 'grillades', icon: <Beef color="#D9480F" size={24} />, label: 'Grillades' },
    { id: 'pizza', icon: <Pizza color="#E8590C" size={24} />, label: 'Pizza' },
    { id: 'traditionnel', icon: <Coffee color="#9C6644" size={24} />, label: 'Tradition' },
    { id: 'more', icon: <MoreHorizontal color="#747878" size={24} />, label: 'Plus' },
];

export default function ClientHomeScreen() {
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const { data: restaurants, isLoading, isError, refetch } = useRestaurants();
    const { refetch: refetchOrders } = useUserOrders(useAuthStore(state => state.user)?.id);
    const showToast = useCartStore(state => state.showToast);
    const { isFavorite, toggleFavorite } = useFavoritesStore();

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await Promise.all([refetch(), refetchOrders()]);
        setRefreshing(false);
    }, [refetch, refetchOrders]);

    // Filter restaurants by category tags
    const filteredRestaurants = useMemo(() => {
        if (!restaurants) return [];
        if (activeCategory === 'all') return restaurants;
        return restaurants.filter(r =>
            r.genre?.toLowerCase().includes(activeCategory.toLowerCase())
        );
    }, [restaurants, activeCategory]);

    // Split restaurants for different sections — avoid overlaps
    const heroRestaurant = filteredRestaurants[0];
    const selectedForYou = filteredRestaurants.slice(1, 4);
    const trending = filteredRestaurants.slice(4);

    const { unreadCount } = useNotifications();

    const handleNotificationPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(client)/notifications');
    };

    const handleLocationPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(client)/addresses' as any);
    };

    const handleVoirTout = (_section: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(client)/explore' as any);
    };

    const selectedAddress = useAddressStore(state => state.currentAddress);
    const insetTop = useHeaderInsetTop();

    return (
        <View className="flex-1 bg-background">
            {/* TopAppBar — solid white */}
            <View
                className="absolute top-0 left-0 right-0 z-50 bg-white border-b border-hairline"
                style={shadowSoft}
            >
                <View
                    style={{ paddingTop: insetTop, height: insetTop + HEADER_CONTENT_HEIGHT }}
                    className="flex-row justify-between items-center px-6"
                >
                    <Pressable onPress={handleLocationPress} className="flex-row items-center gap-1.5 active:opacity-60 flex-1 pr-3">
                        <Text numberOfLines={1} className="text-[19px] font-title tracking-tight text-ink">
                            {selectedAddress ? selectedAddress.locality : "Choisir une adresse"}
                        </Text>
                        <ChevronDown color="#1c1b1b" size={20} />
                    </Pressable>
                    <Pressable onPress={handleNotificationPress} className="relative w-10 h-10 items-center justify-end active:opacity-60">
                        <Bell color="#1c1b1b" size={24} />
                        {unreadCount > 0 && (
                            <View className="absolute -top-0.5 right-0 min-w-[16px] h-4 px-1 bg-[#FF5733] rounded-full items-center justify-center border border-white">
                                <Text className="text-white text-[9px] font-labelbold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingTop: insetTop + HEADER_CONTENT_HEIGHT + 20, paddingBottom: 140 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5733" progressViewOffset={insetTop + HEADER_CONTENT_HEIGHT} />}
            >
                {/* Categories */}
                <View className="mt-5 mb-9">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentInsetAdjustmentBehavior="never"
                        contentContainerStyle={{ gap: 10, paddingHorizontal: 24, paddingVertical: 10, alignItems: 'center' }}
                    >
                        {CATEGORIES.map(cat => (
                            <CategoryChip
                                key={cat.id}
                                icon={cat.icon}
                                label={cat.label}
                                active={activeCategory === cat.id}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    // « Plus » n'est pas un filtre : il ouvre l'explorateur complet.
                                    if (cat.id === 'more') {
                                        router.push('/(client)/explore' as any);
                                        return;
                                    }
                                    setActiveCategory(cat.id);
                                }}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* Loading */}
                {isLoading && (
                    <View className="items-center py-20">
                        <ActivityIndicator size="large" color="#FF5733" />
                    </View>
                )}

                {/* Empty state or Error */}
                {!isLoading && (isError || filteredRestaurants.length === 0) && (
                    <View className="items-center py-20 px-6">
                        <Text className="text-6xl mb-4">{isError ? '📡' : '🍽️'}</Text>
                        <Text className="text-xl font-title tracking-tight text-ink mb-2">
                            {isError ? 'Erreur de connexion' : 'Aucun résultat'}
                        </Text>
                        <Text className="text-sm text-ink-faint text-center font-body">
                            {isError
                                ? "Vérifiez votre connexion internet et réessayez."
                                : "Essayez une autre catégorie ou modifiez votre recherche."}
                        </Text>
                        <Pressable
                            onPress={() => {
                                if (isError) refetch();
                                else setActiveCategory('all');
                            }}
                            className="mt-6 bg-[#FF5733] px-6 py-3 rounded-full active:scale-95"
                        >
                            <Text className="text-white font-labelbold text-xs">
                                {isError ? 'Réessayer' : 'Voir tout'}
                            </Text>
                        </Pressable>
                    </View>
                )}

                {/* Hero Carousel */}
                {heroRestaurant && (
                    <View className="mb-14 px-6">
                        <Pressable
                            onPressIn={() => prefetchRestaurant(queryClient, heroRestaurant.id)}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                router.push({ pathname: '/(client)/restaurant', params: { id: heroRestaurant.id } });
                            }}
                            className="relative w-full aspect-[4/5] rounded-sheet overflow-hidden bg-black active:scale-[0.98]"
                        >
                            <Image source={{ uri: heroRestaurant.image_url ?? '' }} className="w-full h-full" />
                            {/* Flat scrim (no gradient) just to keep the white title readable. */}
                            <View className="absolute inset-0 bg-black/35" />
                            <View className="absolute inset-0 justify-end p-8">
                                <Text className="text-white/70 font-label text-[10px] tracking-[0.08em] uppercase mb-4">
                                    {heroRestaurant.genre ?? 'Recommandé'}
                                </Text>
                                <Text className="text-[30px] font-title text-white tracking-tight mb-4">{heroRestaurant.name}</Text>
                                <View className="flex-row items-center gap-6">
                                    <View className="flex-row items-center gap-1">
                                        <Star fill="#fff" color="#fff" size={12} />
                                        <Text className="text-white font-labelbold text-sm">{heroRestaurant.rating}</Text>
                                    </View>
                                    <Text className="text-white/80 text-sm font-label">{formatEtaRange(restaurantEtaRange(heroRestaurant.id))}</Text>
                                    <View className="px-3 py-1 bg-white/20 rounded-full">
                                        <Text className="text-white text-[10px] font-label tracking-[0.08em] uppercase">{heroRestaurant.genre?.split(',')[0]}</Text>
                                    </View>
                                </View>
                            </View>
                        </Pressable>
                    </View>
                )}

                {/* Selected for You */}
                {selectedForYou.length > 0 && (
                    <View className="mb-14">
                        <View className="px-6 flex-row justify-between items-end mb-8">
                            <View>
                                <Text className="text-ink-faint font-label text-[11px] tracking-[0.08em] uppercase">Soigneusement choisi</Text>
                                <Text className="text-2xl font-title tracking-tight text-ink">Sélection pour vous</Text>
                            </View>
                            <Pressable onPress={() => handleVoirTout('selection')}>
                                <Text className="text-[13px] font-label text-ink-faint">Voir tout</Text>
                            </Pressable>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6" contentContainerStyle={{ gap: 24, paddingRight: 48 }}>
                            {selectedForYou.map(item => (
                                <Pressable
                                    key={item.id}
                                    onPressIn={() => prefetchRestaurant(queryClient, item.id)}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        router.push({ pathname: '/(client)/restaurant', params: { id: item.id } });
                                    }}
                                    className="w-[280px] flex-col gap-4 active:scale-[0.98]"
                                >
                                    <View className="h-48 rounded-sheet overflow-hidden relative bg-black">
                                        <Image source={{ uri: item.image_url ?? '' }} className="w-full h-full opacity-90" />
                                        <View className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full">
                                            <Text className="text-[9px] font-label tracking-[0.08em] uppercase text-ink">{item.genre?.split(',')[0] ?? 'Premium'}</Text>
                                        </View>
                                        <Pressable
                                            onPress={(e) => {
                                                e.stopPropagation?.();
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                const added = toggleFavorite(item.id);
                                                showToast(added ? `${item.name} ajouté aux favoris !` : `${item.name} retiré des favoris`);
                                            }}
                                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center active:scale-90"
                                        >
                                            <Heart fill={isFavorite(item.id) ? "#FF5733" : "transparent"} color={isFavorite(item.id) ? "#FF5733" : "#fff"} size={20} />
                                        </Pressable>
                                    </View>
                                    <View className="flex-row justify-between items-start px-2 mt-2">
                                        <View>
                                            <Text className="text-lg font-heading tracking-tight text-ink">{item.name}</Text>
                                            <Text className="text-xs text-ink-muted font-label mt-1">
                                                {item.genre} • {formatEtaRange(restaurantEtaRange(item.id))}
                                            </Text>
                                        </View>
                                        <View className="bg-surface-container-low px-2 py-1 rounded-lg flex-row items-center gap-1">
                                            <Star fill="#1c1b1b" color="#1c1b1b" size={10} />
                                            <Text className="text-xs font-labelbold text-ink">{item.rating}</Text>
                                        </View>
                                    </View>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Promotional Banner */}
                <View className="px-6 mb-14">
                    <View className="bg-[#FF5733] rounded-sheet p-8 flex-col gap-6 overflow-hidden">
                        <View className="relative z-10">
                            <Text className="text-[26px] font-title text-white tracking-tight mb-2">Élevez vos repas</Text>
                            <Text className="text-white/90 font-body tracking-tight">Livraison gratuite sur vos 3 premières commandes au-dessus de 25 000 F.</Text>
                        </View>
                        <Pressable
                            className="bg-white px-8 py-4 rounded-full self-start active:scale-95 transition-transform"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                router.push('/(client)/promotions' as any);
                            }}
                        >
                            <Text className="text-ink font-labelbold text-sm">Réclamer</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Popular Near You */}
                {trending.length > 0 && (
                    <View className="mb-32">
                        <View className="px-6 flex-row justify-between items-end mb-8">
                            <View>
                                <Text className="text-ink-faint font-label text-[11px] tracking-[0.08em] uppercase">Tendances</Text>
                                <Text className="text-2xl font-title tracking-tight text-ink">Populaire près de chez vous</Text>
                            </View>
                            <Pressable onPress={() => handleVoirTout('trending')}>
                                <Text className="text-[13px] font-label text-ink-faint">Voir tout</Text>
                            </Pressable>
                        </View>
                        <View className="px-6 gap-10">
                            {trending.map(item => (
                                <Pressable
                                    key={item.id}
                                    onPressIn={() => prefetchRestaurant(queryClient, item.id)}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        router.push({ pathname: '/(client)/restaurant', params: { id: item.id } });
                                    }}
                                    className="flex-col gap-6 active:scale-[0.98] transition-transform"
                                >
                                    <View className="h-56 rounded-sheet overflow-hidden relative bg-black">
                                        <Image source={{ uri: item.image_url ?? '' }} className="w-full h-full opacity-90" />
                                        <View className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-xl flex-row items-center gap-2">
                                            <Clock color="#fff" size={12} />
                                            <Text className="text-[10px] font-label tracking-[0.08em] uppercase text-white">{formatEtaRange(restaurantEtaRange(item.id))}</Text>
                                        </View>
                                    </View>
                                    <View className="flex-col justify-center px-2 mt-2">
                                        <View className="flex-row items-center gap-3 mb-2">
                                            <Text className="text-[10px] font-label tracking-[0.08em] uppercase text-ink-faint">
                                                {item.genre?.split(',')[0] ?? 'Populaire'}
                                            </Text>
                                            <View className="h-px flex-1 bg-hairline" />
                                        </View>
                                        <Text className="text-2xl font-title tracking-tight text-ink mb-2">{item.name}</Text>
                                        <Text className="text-sm text-ink-muted mb-4 leading-relaxed font-body">
                                            {item.genre}
                                        </Text>
                                        <View className="flex-row items-center gap-6">
                                            <View className="flex-row items-center gap-1.5">
                                                <Star fill="#1c1b1b" color="#1c1b1b" size={14} />
                                                <Text className="text-xs font-labelbold text-ink">{item.rating}</Text>
                                            </View>
                                            <View className="flex-row items-center gap-1.5">
                                                <Truck color="#8d8a87" size={14} />
                                                <Text className="text-xs text-ink-muted">{formatXaf(DELIVERY_FEE_XAF)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}

            </ScrollView>
        </View>
    );
}

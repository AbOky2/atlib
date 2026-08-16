import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Heart, Star, Clock, Bike } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRestaurants } from '../../src/hooks/useSupabase';
import { RemoteImage } from '../../src/components/RemoteImage';
import { useFavoritesStore } from '../../src/store/favoritesStore';
import { useCartStore } from '../../src/store/cartStore';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { restaurantEtaRange, formatEtaRange } from '../../src/lib/eta';
import { DELIVERY_FEE_XAF, formatXaf } from '../../src/lib/pricing';

export default function FavoritesScreen() {
    const headerOffset = useHeaderOffset();
    const { data: restaurants } = useRestaurants();
    const { favoriteIds, toggleFavorite } = useFavoritesStore();
    const showToast = useCartStore(state => state.showToast);

    const favorites = restaurants?.filter(r => favoriteIds.includes(r.id)) ?? [];

    const removeFavorite = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        toggleFavorite(id);
        showToast('Retiré des favoris');
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title="Mes Favoris"
                back="arrow"
                onBack={() => router.replace('/home')}
                right={
                    <View className="flex-row items-center gap-1">
                        <Heart fill="#FF5733" color="#FF5733" size={18} />
                        <Text className="text-body font-labelbold text-accent">{favorites.length}</Text>
                    </View>
                }
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: headerOffset + 12,
                    paddingBottom: 40,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="px-6 pb-10">
                    {favorites.length === 0 ? (
                        <View className="py-20 items-center">
                            <Heart color="#ccc" size={48} />
                            <Text className="text-h3 font-title text-ink mt-6">Aucun favori</Text>
                            <Text className="text-body text-ink-muted text-center font-body mt-2">Appuyez sur ♥ sur un restaurant pour le sauvegarder ici.</Text>
                            <Pressable
                                onPress={() => router.replace('/home')}
                                className="bg-accent px-8 py-4 rounded-full mt-8 active:scale-95"
                            >
                                <Text className="text-white text-caption font-labelbold">Explorer</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View className="gap-5 mt-4">
                            {favorites.map(restaurant => (
                                <Pressable
                                    key={restaurant.id}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        router.push({ pathname: '/restaurant', params: { id: restaurant.id } });
                                    }}
                                    className="bg-white rounded-panel overflow-hidden border border-hairline active:scale-[0.98]"
                                   
                                >
                                    <View className="h-44 relative">
                                        <RemoteImage uri={restaurant.image_url} displayWidth={360} className="w-full h-full" />
                                        {/* Flat scrim (no gradient) for legibility of the name over the photo. */}
                                        <View className="absolute inset-0 bg-black/30" />
                                        <Pressable
                                            onPress={(e) => {
                                                e.stopPropagation?.();
                                                removeFavorite(restaurant.id);
                                            }}
                                            className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full items-center justify-center active:scale-90"
                                        >
                                            <Heart fill="#FF5733" color="#FF5733" size={18} />
                                        </Pressable>
                                        <View className="absolute bottom-0 left-0 right-0 p-5">
                                            <Text className="text-h3 font-heading tracking-tight text-white">{restaurant.name}</Text>
                                            <Text className="text-caption text-white/70 font-body mt-1">{restaurant.genre}</Text>
                                        </View>
                                    </View>
                                    <View className="px-5 py-4 flex-row items-center gap-5">
                                        <View className="flex-row items-center gap-1.5">
                                            <Star fill="#1c1b1b" color="#1c1b1b" size={14} />
                                            <Text className="text-caption font-labelbold text-ink">{restaurant.rating}</Text>
                                        </View>
                                        <View className="flex-row items-center gap-1.5">
                                            <Clock color="#8d8a87" size={14} />
                                            <Text className="text-caption text-ink-faint font-body">{formatEtaRange(restaurantEtaRange(restaurant.id))}</Text>
                                        </View>
                                        <View className="flex-row items-center gap-1.5">
                                            <Bike color="#8d8a87" size={14} />
                                            <Text className="text-caption text-ink-faint font-body">{formatXaf(DELIVERY_FEE_XAF)} livraison</Text>
                                        </View>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { ArrowLeftIcon, HeartIcon } from 'react-native-heroicons/outline'
import { HeartIcon as HeartIconSolid, StarIcon } from 'react-native-heroicons/solid'
import { useSelector, useDispatch } from 'react-redux'
import { selectFavorites, toggleFavoriteAndPersist } from '../features/favoritesSlice'
import { getRestaurantById } from '../src/data/mockRestaurants'
import Badge from '../src/ui/Badge'

const FavoritesScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const favoriteIds = useSelector(selectFavorites);

  const favoriteRestaurants = favoriteIds
    .map((id) => getRestaurantById(id))
    .filter(Boolean);

  const handlePress = (restaurant) => {
    navigation.navigate('Restaurant', {
      id: restaurant.id,
      imgUrl: null,
      title: restaurant.name,
      rating: restaurant.rating,
      genre: restaurant.cuisineTags?.[0] || '',
      address: restaurant.address,
      short_description: restaurant.short_description,
      dishes: restaurant.dishes || [],
      long: 0,
      lat: 0,
    });
  };

  return (
    <SafeAreaView className="bg-bg flex-1">
      {/* Header */}
      <View className="bg-surface flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3" activeOpacity={0.7}>
          <ArrowLeftIcon size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">Vos Favoris</Text>
        <View className="flex-1" />
        <Text className="text-muted text-sm">{favoriteRestaurants.length} lieu{favoriteRestaurants.length !== 1 ? 'x' : ''}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {favoriteRestaurants.length === 0 ? (
          /* Empty state */
          <View className="items-center justify-center py-24 px-8">
            <View className="bg-primarySoft p-5 rounded-full mb-5">
              <HeartIcon size={40} color="#7A1E3A" />
            </View>
            <Text className="text-xl font-bold text-text mb-2 text-center">
              Aucun favori pour le moment
            </Text>
            <Text className="text-muted text-center text-base leading-6">
              Appuyez sur le cœur d'un restaurant pour le retrouver ici.
            </Text>
          </View>
        ) : (
          <View className="pt-4">
            {favoriteRestaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                onPress={() => handlePress(restaurant)}
                activeOpacity={0.85}
                className="bg-surface mx-4 mb-3 rounded-md border border-border overflow-hidden"
              >
                <Image
                  source={{ uri: restaurant.imageUrl }}
                  className="h-32 w-full"
                  resizeMode="cover"
                />
                {/* Favorite badge (remove) */}
                <TouchableOpacity
                  onPress={() => dispatch(toggleFavoriteAndPersist(restaurant.id))}
                  activeOpacity={0.7}
                  className="absolute top-3 right-3 bg-surface/90 rounded-full p-2 border border-border/50"
                >
                  <HeartIconSolid size={18} color="#EF4444" />
                </TouchableOpacity>

                <View className="absolute top-3 left-3">
                  <Badge variant="eta" label={`${restaurant.etaMin}-${restaurant.etaMax} min`} />
                </View>

                {!restaurant.isOpen && (
                  <View className="absolute top-0 left-0 right-0 h-32 bg-black/40 items-center justify-center">
                    <Text className="text-white font-bold">Fermé</Text>
                  </View>
                )}

                <View className="p-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-base font-bold text-text flex-1 mr-2">{restaurant.name}</Text>
                    <View className="flex-row items-center bg-accentSoft px-2 py-0.5 rounded-full">
                      <StarIcon size={12} color="#C8A24A" />
                      <Text className="text-xs font-bold text-accent ml-1">{restaurant.rating}</Text>
                    </View>
                  </View>
                  <Text className="text-sm text-muted">{restaurant.short_description}</Text>
                  <Text className="text-xs text-muted mt-1">{restaurant.address}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FavoritesScreen

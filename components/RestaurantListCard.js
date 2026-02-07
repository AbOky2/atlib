import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { StarIcon, HeartIcon } from 'react-native-heroicons/solid'
import { HeartIcon as HeartIconOutline } from 'react-native-heroicons/outline'
import { useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { toggleFavoriteAndPersist, selectIsFavorite } from '../features/favoritesSlice'
import Badge from '../src/ui/Badge'
import { formatCurrency } from '../utils/formatCurrency'

/**
 * RestaurantListCard — full-width card for filtered results (not the horizontal scroll card).
 * Uses mock data fields directly.
 */
const RestaurantListCard = ({ restaurant }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const isFavorite = useSelector((state) => selectIsFavorite(state, restaurant.id));

  const handlePress = () => {
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

  const handleFavorite = () => {
    dispatch(toggleFavoriteAndPersist(restaurant.id));
  };

  const fee = restaurant.deliveryFeeXaf === 0
    ? 'Livraison gratuite'
    : `Livraison ${formatCurrency(restaurant.deliveryFeeXaf, 'XAF')}`;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      className="bg-surface px-4 py-4 border-b border-border"
    >
      <View className="flex-row">
        <Image
          source={{ uri: restaurant.imageUrl }}
          className="h-20 w-20 rounded-md bg-bg"
          resizeMode="cover"
        />
        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-text flex-1 mr-2" numberOfLines={1}>
              {restaurant.name}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleFavorite}
              className="p-1.5"
            >
              {isFavorite ? (
                <HeartIcon size={18} color="#EF4444" />
              ) : (
                <HeartIconOutline size={18} color="#6B7280" />
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center mt-1">
            <StarIcon size={12} color="#C8A24A" />
            <Text className="text-xs font-bold text-accent ml-1">{restaurant.rating}</Text>
            <Text className="text-xs text-muted ml-2">(200+)</Text>
            <Text className="text-xs text-muted ml-2">• {restaurant.etaMin}-{restaurant.etaMax} min</Text>
          </View>

          <Text className="text-xs text-muted mt-1" numberOfLines={1}>
            {fee} • {restaurant.short_description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default RestaurantListCard

import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { StarIcon, HeartIcon } from 'react-native-heroicons/solid'
import { HeartIcon as HeartIconOutline } from 'react-native-heroicons/outline'
import { urlFor } from '../sanity'
import { useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { toggleFavoriteAndPersist, selectIsFavorite } from '../features/favoritesSlice'
import Badge from '../src/ui/Badge'

const RestaurantCard = ({
    id,
    imgUrl,
    title,
    rating,
    genre,
    address,
    short_description,
    dishes,
    long,
    lat,
}) => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const isFavorite = useSelector((state) => selectIsFavorite(state, id));

    const handlePress = () => {
        navigation.navigate('Restaurant', {
            id, imgUrl, title, rating, genre, address,
            short_description, dishes, long, lat,
        });
    }

    const handleFavorite = () => {
        dispatch(toggleFavoriteAndPersist(id));
    }

    // Build image URI — handle both Sanity image refs and plain URLs
    let imageUri = null;
    try {
        imageUri = imgUrl ? urlFor(imgUrl).url() : null;
    } catch {
        imageUri = typeof imgUrl === 'string' ? imgUrl : null;
    }

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePress}
            className="bg-surface mr-4 rounded-md border border-border overflow-hidden mb-2"
            style={{ width: 280 }}
        >
            {/* Image */}
            <View>
                {imageUri ? (
                    <Image
                        source={{ uri: imageUri }}
                        className="h-40 w-full object-cover"
                    />
                ) : (
                    <View className="h-40 w-full bg-primarySoft items-center justify-center">
                        <Text className="text-3xl">🍽️</Text>
                    </View>
                )}
                {/* Favorite Button */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleFavorite}
                    className="absolute top-3 right-3 bg-surface/90 rounded-full p-2 border border-border/50"
                >
                    {isFavorite ? (
                        <HeartIcon size={18} color="#EF4444" />
                    ) : (
                        <HeartIconOutline size={18} color="#6B7280" />
                    )}
                </TouchableOpacity>
                {/* ETA Badge */}
                <View className="absolute top-3 left-3">
                    <Badge variant="eta" label="20-30 min" />
                </View>
            </View>

            {/* Info */}
            <View className="px-3 pb-3 pt-3">
                <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-base font-bold text-text flex-1 mr-2" numberOfLines={1}>
                        {title}
                    </Text>
                    <View className="flex-row items-center bg-accentSoft px-2 py-0.5 rounded-full">
                        <StarIcon size={12} color="#C8A24A" />
                        <Text className="text-xs font-bold text-accent ml-1">{rating}</Text>
                    </View>
                </View>

                <Text className="text-sm text-muted font-medium" numberOfLines={1}>
                    {genre} • Livraison 500 XAF
                </Text>
                <Text className="text-xs text-muted/70 mt-0.5" numberOfLines={1}>
                    {address}
                </Text>
            </View>
        </TouchableOpacity>
    )
}

export default RestaurantCard

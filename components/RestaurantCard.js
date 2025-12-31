import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { MapPinIcon, StarIcon } from 'react-native-heroicons/solid'
import { urlFor } from '../sanity'
import { useNavigation } from '@react-navigation/native'

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
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
                navigation.navigate('Restaurant', {
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
                });
            }}
            className="bg-white mr-4 shadow-md rounded-2xl overflow-hidden border border-gray-100">
            <Image source={{
                uri: urlFor(imgUrl).url(),
            }} className='h-40 w-72 object-cover' />

            <View className="px-4 pb-4 pt-3">
                <Text className="text-lg font-bold text-gray-900">{title}</Text>
                <View className="flex-row items-center space-x-1 my-1">
                    <StarIcon color="#22c55e" size={20} />
                    <Text className="text-xs text-gray-500">
                        <Text className="text-green-600 font-semibold">{rating}</Text> • {genre}
                    </Text>
                </View>

                <View className="flex-row items-center space-x-1">
                    <MapPinIcon color="gray" opacity={0.6} size={20} />
                    <Text className="text-xs text-gray-500 w-60" numberOfLines={1}>À proximité • {address}</Text>
                </View>
            </View>
        </TouchableOpacity>
    )
}

export default RestaurantCard
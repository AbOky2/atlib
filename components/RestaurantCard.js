import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { MapPinIcon, StarIcon } from 'react-native-heroicons/outline'
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
        });}}
    className="bg-white mr-3 shadow">
        {/* On modifie l'uri de l'imgUrl pour qu'il accepte Sanity */}
        <Image source={{
                uri :urlFor(imgUrl).url(),}} className='h-36 w-64 rounded-sm' />

        <View className="px-3 pb-4">
            <Text className="text-lg font-bold pt-2">{title}</Text>
            <View className="flex-row items-center space-x-1">
                <StarIcon color="green" size={22} opacity={0.5} />
                <Text className="text-xs text-gray-500">
                    <Text className="text-green-500">{rating}</Text> • {genre}
                    </Text>
            </View>

            <View className="flex-row items-center space-x-1">
                <MapPinIcon color="gray" opacity={0.4} size={22}/>
                <Text className="text-xs text-gray-500">Nearby • {address}</Text>
            </View>
        </View>
       


    </TouchableOpacity>

  )
}

export default RestaurantCard
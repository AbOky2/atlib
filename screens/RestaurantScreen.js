import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native'
import React, { useLayoutEffect } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { urlFor } from '../sanity';
import { ArrowLeftIcon } from 'react-native-heroicons/solid';
import { ChevronRightIcon, MagnifyingGlassIcon, MapPinIcon, QuestionMarkCircleIcon, StarIcon } from 'react-native-heroicons/outline';

const RestaurantScreen = () => {
    const navigation = useNavigation();
    const {
        params: { 
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


         },

    } = useRoute();

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, []);

  return (
    <ScrollView>
        <View className='relative'>
            <Image
            source={
                {
                    uri: urlFor(imgUrl).url(),
                }}
                //p-4 a ajouter si besoin
                className='w-full h-56 bg-gray-300 '
                
                />
                <TouchableOpacity
                onPress={() => {
                    navigation.goBack();}}
                 className="absolute top-14 left-5 p-2 bg-gray-100  rounded-full">
                    <ArrowLeftIcon size={20} color="#00CCBB" />
                </TouchableOpacity>
        </View>

        <View className="bg-white">
                <View className='px-4 pt-4'>
                    <Text className="text-3xl font-bold">{title}</Text>
                    <View className="flex-row space-x-2 my-1">
                        <View className='flex-row items-center space-x-1 '>  
                            <StarIcon color="green" size={22} opacity={0.5} />
                            <Text className="text-xs text-gray-500">
                                <Text className="text-green-500">{rating}</Text> • {genre}
                            </Text>
                        </View>

                        <View className='flex-row items-center space-x-1 '>  
                            <MapPinIcon color="gray" size={22} opacity={0.4} />
                            <Text className="text-xs text-gray-500">
                                Nearby • {address}
                            </Text>
                    </View>
                    </View>
                    <Text className="mt-2 pb-4 text-gray-500">{short_description}</Text>
                </View>
                <TouchableOpacity className='flex-row items-center space-x-2 p-4 border-y border-gray-300'>
                    <QuestionMarkCircleIcon size={20} color="gray" opacity={0.6} />
                    <Text className="pl-2 flex-1 text-md font-bold">Have a food allergy ?</Text>
                    <ChevronRightIcon color="#00CCBB" />
                </TouchableOpacity>
        </View>
    </ScrollView>
  )
}

export default RestaurantScreen
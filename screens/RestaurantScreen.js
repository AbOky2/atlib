import { View, Text, Image, ScrollView, TouchableOpacity, StatusBar } from 'react-native'
import React, { useEffect, useLayoutEffect } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { urlFor } from '../sanity';
import { ArrowLeftIcon } from 'react-native-heroicons/solid';
import { ChevronRightIcon, MapPinIcon, QuestionMarkCircleIcon, StarIcon } from 'react-native-heroicons/solid';
import DishRow from '../components/DishRow';
import BasketIcon from '../components/BasketIcon';
import { useDispatch } from 'react-redux';
import { setRestaurant } from '../features/restaurantSlice';

const RestaurantScreen = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
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

    useEffect(() => {
        dispatch(setRestaurant({
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
        }));
    }, [])

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, []);

    return (
        <>
            <StatusBar barStyle="light-content" />
            <BasketIcon />
            <ScrollView className="bg-gray-50" showsVerticalScrollIndicator={false}>
                <View className='relative'>
                    <Image
                        source={
                            {
                                uri: urlFor(imgUrl).url(),
                            }}
                        className='w-full h-64 bg-gray-300 object-cover'
                    />
                    <TouchableOpacity
                        onPress={() => {
                            navigation.goBack();
                        }}
                        className="absolute top-14 left-5 p-2 bg-white rounded-full shadow-md">
                        <ArrowLeftIcon size={20} color="#00CCBB" />
                    </TouchableOpacity>
                </View>

                <View className="bg-white -mt-4 rounded-t-3xl pt-6 px-4 shadow-sm">
                    <Text className="text-3xl font-bold text-gray-900">{title}</Text>
                    <View className="flex-row space-x-2 my-2">
                        <View className='flex-row items-center space-x-1'>
                            <StarIcon color="#22c55e" size={22} />
                            <Text className="text-xs text-gray-500">
                                <Text className="text-green-600 font-bold">{rating}</Text> • {genre}
                            </Text>
                        </View>

                        <View className='flex-row items-center space-x-1'>
                            <MapPinIcon color="gray" size={22} opacity={0.6} />
                            <Text className="text-xs text-gray-500 w-64" numberOfLines={1}>
                                Nearby • {address}
                            </Text>
                        </View>
                    </View>
                    <Text className="mt-2 pb-4 text-gray-500 leading-5">{short_description}</Text>
                </View>

                <View className="bg-white mt-2 px-4 py-4">
                    <TouchableOpacity className='flex-row items-center space-x-2 p-4 border border-gray-100 rounded-xl bg-gray-50 shadow-sm'>
                        <QuestionMarkCircleIcon size={20} color="gray" opacity={0.6} />
                        <Text className="pl-2 flex-1 text-md font-bold text-gray-800">Have a food allergy?</Text>
                        <ChevronRightIcon color="#00CCBB" />
                    </TouchableOpacity>
                </View>

                <View className='pb-36 px-4'>
                    <Text className='font-bold text-2xl pt-6 mb-4 text-gray-900'>
                        Menu
                    </Text>
                    {/**Dishes */}
                    {dishes?.map((dish) => (
                        <DishRow
                            key={dish._id}
                            id={dish._id}
                            name={dish.name}
                            description={dish.description}
                            price={dish.price}
                            image={dish.image}
                        />
                    ))}
                </View>
            </ScrollView>
        </>
    )
}

export default RestaurantScreen
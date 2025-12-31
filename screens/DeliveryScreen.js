import { View, Text, SafeAreaView, TouchableOpacity, Image, Linking, Alert } from 'react-native'
import React from 'react'
import { useSelector } from 'react-redux';
import { selectRestaurant } from '../features/restaurantSlice';
import { selectCurrentAddress } from '../features/addressSlice';
import { XMarkIcon, PhoneIcon, MapPinIcon } from 'react-native-heroicons/solid';
import { urlFor } from '../sanity';
import * as Progress from "react-native-progress"
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';


const DeliveryScreen = () => {
    const navigation = useNavigation();
    const restaurant = useSelector(selectRestaurant);
    const deliveryAddress = useSelector(selectCurrentAddress);

    const handleCallRestaurant = () => {
        const phoneNumber = restaurant.phone || '66123456';
        Alert.alert(
            'Call Restaurant',
            `Call ${restaurant.title}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call', onPress: () => Linking.openURL(`tel:${phoneNumber}`) }
            ]
        );
    };

    return (
        <View className='bg-[#00CCBB] flex-1'>
            <SafeAreaView className='z-50'>
                <View className='flex-row justify-between items-center p-5'>
                    <TouchableOpacity
                        onPress={() => navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'Home' }],
                            })
                        )}                >
                        <XMarkIcon color="white" size={30} />

                    </TouchableOpacity>
                    <Text className='text-white font-light text-lg'>
                        Order Help
                    </Text>
                </View>

                <View className='bg-white mx-5 my-2 rounded-2xl p-6 z-50 shadow-lg'>
                    <View className='flex-row justify-between'>
                        <View>
                            <Text className='text-lg text-gray-400'>Estimated Arrival</Text>
                            <Text className='text-3xl font-bold text-gray-900'>{deliveryAddress.deliveryTime || '45-55 Minutes'}</Text>
                        </View>

                        <Image
                            source={{
                                uri: "https://links.papareact.com/fls"
                            }}
                            className='h-20 w-20'
                        />
                    </View>
                    <Progress.Bar color="#00CCBB" indeterminate={true} size={30} />

                    <Text className='mt-3 text-gray-500 font-medium'>
                        Your order at {restaurant.title} is being prepared
                    </Text>
                </View>
            </SafeAreaView>

            {/* Informations d'adresse */}
            <View className='flex-1 -mt-10 z-0 bg-gray-50 px-5 pt-20'>
                <View className='bg-white rounded-2xl shadow-sm p-5 mb-5 border border-gray-100'>
                    <View className='flex-row items-center mb-3'>
                        <MapPinIcon size={24} color="#00CCBB" />
                        <Text className='text-lg font-bold ml-2 text-gray-800'>Delivery Address</Text>
                    </View>
                    <Text className='text-base font-semibold text-gray-900'>{deliveryAddress.zone}</Text>
                    <Text className='text-sm text-gray-500 mt-1'>{deliveryAddress.landmark}</Text>
                    <Text className='text-sm text-gray-400 mt-2'>{deliveryAddress.description}</Text>
                    <View className='flex-row items-center mt-4 pt-3 border-t border-gray-100'>
                        <PhoneIcon size={16} color="#00CCBB" />
                        <Text className='text-sm text-[#00CCBB] ml-2 font-bold'>{deliveryAddress.phoneNumber}</Text>
                    </View>
                </View>

                <View className='bg-white rounded-2xl shadow-sm p-5 mb-5 border border-gray-100'>
                    <Text className='text-lg font-bold mb-3 text-gray-800'>Delivery Info</Text>
                    <View className='space-y-3'>
                        <View className='flex-row justify-between'>
                            <Text className='text-gray-500'>Estimated Distance</Text>
                            <Text className='font-semibold text-gray-900'>{deliveryAddress.estimatedDistance || '5-10 km'}</Text>
                        </View>
                        <View className='flex-row justify-between'>
                            <Text className='text-gray-500'>Travel Time</Text>
                            <Text className='font-semibold text-gray-900'>{deliveryAddress.deliveryTime || '45-55 min'}</Text>
                        </View>
                        <View className='flex-row justify-between'>
                            <Text className='text-gray-500'>Delivery Method</Text>
                            <Text className='font-semibold text-gray-900'>Bike/Motorcycle</Text>
                        </View>
                    </View>
                </View>
            </View>

            <SafeAreaView className='bg-white flex-row items-center space-x-5 h-24 px-5 border-t border-gray-100 shadow-lg'>
                <Image
                    source={{
                        uri: "https://links.papareact.com/wru"
                    }}
                    className='h-12 w-12 bg-gray-300 p-4 rounded-full'
                />
                <View className='flex-1 ml-4'>
                    <Text className='text-lg font-bold text-gray-900'>Delivery Service</Text>
                    <Text className='text-gray-400'>Managed by {restaurant.title}</Text>
                </View>
                <TouchableOpacity onPress={handleCallRestaurant}>
                    <Text className='text-[#00CCBB] font-bold text-lg'>Call</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    )
}

export default DeliveryScreen
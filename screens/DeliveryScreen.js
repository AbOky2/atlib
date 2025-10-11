import { View, Text, SafeAreaView, TouchableOpacity, Image, Linking, Alert } from 'react-native'
import React from 'react'
import { useSelector } from 'react-redux';
import { selectRestaurant } from '../features/restaurantSlice';
import { selectCurrentAddress } from '../features/addressSlice';
import { XMarkIcon, PhoneIcon, MapPinIcon } from 'react-native-heroicons/outline';
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
            'Appeler le restaurant',
            `Voulez-vous appeler ${restaurant.title} ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Appeler', onPress: () => Linking.openURL(`tel:${phoneNumber}`) }
            ]
        );
    };

    const handleCallCustomer = () => {
        Alert.alert(
            'Numéro de contact',
            `Votre numéro: ${deliveryAddress.phoneNumber}\nLe livreur vous contactera sur ce numéro.`,
            [{ text: 'OK' }]
        );
    };
  return (
    <View className='bg-[#00CCBB] '>
        <SafeAreaView className='z-50'>
            <View className='flex-row justify-between items-center p-5'>
                <TouchableOpacity
                onPress={() => navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                    })
                )}                >
                    <XMarkIcon color="white" size={30}/>

                </TouchableOpacity>
                <Text className='text-white font-light text-lg'>
                    Aide Commande
                </Text>
            </View>

            <View className='bg-white mx-5 my-2 rounded-md p-6 z-50 shadow-md'>
                <View className='flex-row justify-between'>
                    <View>
                        <Text className='text-lg text-gray-400'>Estimation d'arrivée</Text>
                        <Text className='text-4xl font-bold'>{deliveryAddress.deliveryTime || '45-55 minutes'}</Text>
                    </View>

                    <Image
                    source={{
                        uri: "https://links.papareact.com/fls"
                    }}
                    className='h-20 w-20'
                    />
                </View>
                <Progress.Bar color="#00CCBB" indeterminate={true} size={30}/>

                <Text className='mt-3 text-gray-500'>
                    Votre commande chez {restaurant.title} est en préparation
                </Text>
            </View>
        </SafeAreaView>

        {/* Informations d'adresse */}
        <View className='flex-1 -mt-10 z-0 bg-gray-50 p-5'>
            <View className='bg-white rounded-lg shadow-md p-4 mb-4'>
                <View className='flex-row items-center mb-3'>
                    <MapPinIcon size={24} color="#00CCBB" />
                    <Text className='text-lg font-bold ml-2'>Adresse de livraison</Text>
                </View>
                <Text className='text-base font-semibold text-gray-800'>{deliveryAddress.zone}</Text>
                <Text className='text-sm text-gray-600 mt-1'>{deliveryAddress.landmark}</Text>
                <Text className='text-sm text-gray-500 mt-2'>{deliveryAddress.description}</Text>
                <View className='flex-row items-center mt-3'>
                    <PhoneIcon size={16} color="#00CCBB" />
                    <Text className='text-sm text-[#00CCBB] ml-2'>{deliveryAddress.phoneNumber}</Text>
                </View>
            </View>

            <View className='bg-white rounded-lg shadow-md p-4 mb-4'>
                <Text className='text-lg font-bold mb-3'>Informations de livraison</Text>
                <View className='space-y-2'>
                    <View className='flex-row justify-between'>
                        <Text className='text-gray-600'>Distance estimée</Text>
                        <Text className='font-semibold'>{deliveryAddress.estimatedDistance || '5-10 km'}</Text>
                    </View>
                    <View className='flex-row justify-between'>
                        <Text className='text-gray-600'>Temps de trajet</Text>
                        <Text className='font-semibold'>{deliveryAddress.deliveryTime || '45-55 min'}</Text>
                    </View>
                    <View className='flex-row justify-between'>
                        <Text className='text-gray-600'>Mode de livraison</Text>
                        <Text className='font-semibold'>Moto/Vélo</Text>
                    </View>
                </View>
            </View>

            <View className='bg-yellow-50 rounded-lg border border-yellow-200 p-4'>
                <Text className='text-yellow-800 font-semibold mb-2'>📞 Instructions importantes</Text>
                <Text className='text-yellow-700 text-sm'>
                    • Le livreur vous contactera avant d'arriver{'\n'}
                    • Restez joignable sur votre téléphone{'\n'}
                    • Préparez le montant exact pour le paiement{'\n'}
                    • Assurez-vous que votre description d'adresse est claire
                </Text>
            </View>
        </View>

        <SafeAreaView className='bg-white flex-row items-center space-x-5 gap-4 h-28'>
            <Image
                source={{
                    uri: "https://links.papareact.com/wru"
                }}  
                className='h-12 w-12 bg-gray-300 p-4 rounded-full ml-5'      
                    />
            <View className='flex-1'>
                <Text className='text-lg'>Service de livraison</Text>
                <Text className='text-gray-400'>Géré par {restaurant.title}</Text>
            </View>
            <TouchableOpacity onPress={handleCallRestaurant}>
                <Text className='text-[#00CCBB] font-bold text-lg mr-5'>Appeler</Text>
            </TouchableOpacity>
        </SafeAreaView>
    </View>
  )
}

export default DeliveryScreen
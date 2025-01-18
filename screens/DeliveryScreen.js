import { View, Text, SafeAreaView, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { useSelector } from 'react-redux';
import { selectRestaurant } from '../features/restaurantSlice';
import { XMarkIcon } from 'react-native-heroicons/outline';
import { urlFor } from '../sanity';
import * as Progress from "react-native-progress"
import MapView, {Marker} from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';

const DeliveryScreen = () => {
    const navigation = useNavigation();
    const restaurant = useSelector(selectRestaurant);
  return (
    <View className='bg-[#00CCBB] flex-1'>
        <SafeAreaView className='z-50'>
            <View className='flex-row justify-between items-center p-5'>
                <TouchableOpacity
                onPress={() => navigation.navigate("Home")}
                >
                    <XMarkIcon color="white" size={30}/>

                </TouchableOpacity>
                <Text className='text-white font-light text-lg'>
                    Aide Commande
                </Text>
            </View>

            <View className='bg-white mx-5 my-2 rounded-md p-6 z-50 shadow-md'>
                <View className='flex-row justify-between'>
                    <View>
                        <Text className='text-lg text-gray-400'>Estimation d'arriver</Text>
                        <Text className='text-4xl font-bold'>45-55 minutes</Text>
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
                    Votre commande chez {restaurant.title} est en preparation
                </Text>
            </View>
        </SafeAreaView>

        <MapView
        initialRegion={{
            latitude : restaurant.lat,
            longitude : restaurant.long,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        }}
        className='flex-1 -mt-10 z-0'
        mapType='mutedStandard'
        >
            <Marker
            coordinate={{
                latitude: restaurant.lat,
                longitude: restaurant.long,
            }}
            title={restaurant.title}
            description={restaurant.short_description}
            indentifier= "origin"
            pinColor='#00CCBB'
            />

        </MapView>

        <SafeAreaView className='bg-white flex-row items-center space-x-5 gap-4 h-28'>
            <Image
                source={{
                    uri: "https://links.papareact.com/wru"
                }}  
                className='h-12 w-12 bg-gray-300 p-4 rounded-full ml-5'      
                    />
            <View className='flex-1'>
                <Text className='text-lg'>Adam</Text>
                <Text className='text-gray-400'>Votre Livreur</Text>
            </View>
            <Text className='text-[#00CCBB] font-bold text-lg mr-5'>Appeler</Text>
        </SafeAreaView>
    </View>
  )
}

export default DeliveryScreen
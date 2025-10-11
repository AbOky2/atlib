import { View, Text, SafeAreaView, Image, TextInput, ScrollView, TouchableOpacity } from 'react-native'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import '../global.css'
import { useNavigation } from '@react-navigation/native'
import { AdjustmentsVerticalIcon, ChevronDownIcon, UserIcon, MagnifyingGlassIcon, MapPinIcon } from 'react-native-heroicons/outline'
import Categories from '../components/Categories'
import FeaturedRow from '../components/FeaturedRow'
import sanityClient from '../sanity'
import { useSelector } from 'react-redux'
import { selectCurrentAddress } from '../features/addressSlice'
const HomeScreen = () => {
    const navigation = useNavigation();
    const [featuredCategories, setFeaturedCategories] = useState([]);
    const currentAddress = useSelector(selectCurrentAddress);
    useLayoutEffect(() => { 
        navigation.setOptions({ 
            headerShown: false,
         }) 
    }, [])

    useEffect(() => {
            sanityClient.fetch(`*[_type=="featured"]{
                ...,
                restaurants[] ->{
                    ...,
                    dishes[] ->
                }
                }`).then((data) => {
                setFeaturedCategories(data);
            }).catch(console.error);    
    }
    , []); 

  return (
    <SafeAreaView className="bg-white pt-5">
        {/* Header */}
        <View className="pb-3 flex-row items-center mx-4 space-x-2 ">
            <Image
            source={{
                uri :"https://links.papareact.com/wru",}}
            className = "h-7 w-7 bg-gray-300 p-4 rounded-full"
            
            />

        <View className="flex-1">
            <Text className="text-xs font-bold text-gray-400">Livraison vers</Text>
            <TouchableOpacity 
                onPress={() => navigation.navigate('Address')}
                className="flex-row items-center"
            >
                <MapPinIcon size={16} color="#00CCBB" />
                <Text className="text-base font-bold ml-1 mr-1">
                    {currentAddress.zone || 'Sélectionner votre zone'}
                </Text>
                <ChevronDownIcon size={16} color="#00CCBB" />
            </TouchableOpacity>
            {currentAddress.landmark && (
                <Text className="text-xs text-gray-500 mt-1">
                    {currentAddress.landmark}
                </Text>
            )}
        </View>

        <UserIcon size={35} color="#00CCBB" />
        </View>
        {/* Search bar */}
        <View className="flex-row mx-4 items-center space-x-2">
            <View className="flex-row space-x-2 flex-1 bg-gray-200 p-3 ">
                <MagnifyingGlassIcon color="gray" size={20} />
                <TextInput 
                placeholder="Restaurants and cuisines"
                keyboardType='default'
                 />

            </View>
            <AdjustmentsVerticalIcon  color="#00CCBB" />
        </View>

        {/*Body */}
        <ScrollView className="bg-gray-100">
            {/* Categories */}
            <Categories />

            {/* Featured Rows */}

            {featuredCategories?.map(category => (
                <FeaturedRow
                key={category._id}
                id={category._id}
                title={category.name}
                description={category.short_description}
                />
            ))}
           
        </ScrollView>
    </SafeAreaView>
  )
}

export default HomeScreen
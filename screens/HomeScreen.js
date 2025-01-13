import { View, Text, SafeAreaView, Image, TextInput, ScrollView } from 'react-native'
import React, { useLayoutEffect } from 'react'
import '../global.css'
import { useNavigation } from '@react-navigation/native'
import { AdjustmentsVerticalIcon, ChevronDownIcon, UserIcon, MagnifyingGlassIcon } from 'react-native-heroicons/outline'
import Categories from '../components/Categories'
import FeaturedRow from '../components/FeaturedRow'
const HomeScreen = () => {
    const navigation = useNavigation();
    useLayoutEffect(() => { 
        navigation.setOptions({ 
            headerShown: false,
         }) 
    }, [])

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
            <Text className="text-xs font-bold text-gray-400">Deliver now !</Text>
            <Text className="text-xl font-bold">Current location
                <ChevronDownIcon size={20} color="#00CCBB" />
            </Text>
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
            <FeaturedRow
            id = "222"
            title = "Featured"
            description = "Paid placement from our partners"
            />

            <FeaturedRow
            id="111"
            title = "Tasty Discounts"
            description = "Everyone is enjoying these discounts"
            />

            <FeaturedRow
            id="123"
            title = "Offers near you"
            description = "Why not support your local restaurants tonight ?" 
            />
        </ScrollView>
    </SafeAreaView>
  )
}

export default HomeScreen
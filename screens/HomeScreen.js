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
        <SafeAreaView className="bg-white pt-5 flex-1">
            {/* Header */}
            <View className="flex-row pb-3 items-center mx-4 space-x-2">
                <Image
                    source={{
                        uri: "https://links.papareact.com/wru",
                    }}
                    className="h-10 w-10 bg-gray-300 p-4 rounded-full"
                />

                <View className="flex-1">
                    <Text className="font-bold text-gray-400 text-xs">Livrer à</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Address')}
                        className="flex-row items-center"
                        activeOpacity={0.7}
                    >
                        <Text className="text-xl font-bold text-gray-900 ml-1 mr-1">
                            {currentAddress.zone || 'Choisir un lieu'}
                        </Text>
                        <ChevronDownIcon size={20} color="#F59E0B" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity activeOpacity={0.7}>
                    <UserIcon size={35} color="#F59E0B" />
                </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View className="flex-row items-center space-x-2 pb-4 mx-4">
                <View className="flex-row flex-1 space-x-2 bg-gray-100 p-3 rounded-xl items-center shadow-sm border border-gray-100">
                    <MagnifyingGlassIcon color="gray" size={20} />
                    <TextInput
                        placeholder="Restaurants et cuisines"
                        keyboardType='default'
                        className="flex-1 text-base text-gray-800"
                    />
                </View>
                <TouchableOpacity activeOpacity={0.7} className="p-2 rounded-full bg-gray-100">
                    <AdjustmentsVerticalIcon color="#F59E0B" />
                </TouchableOpacity>
            </View>

            {/*Body */}
            <ScrollView
                className="bg-gray-50"
                contentContainerStyle={{
                    paddingBottom: 100,
                }}
                showsVerticalScrollIndicator={false}
            >
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
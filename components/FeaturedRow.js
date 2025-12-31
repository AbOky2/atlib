import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import { ArrowRightIcon } from 'react-native-heroicons/outline'
import RestaurantCard from './RestaurantCard'
import sanityClient from '../sanity'

const FeaturedRow = ({ id, title, description }) => {
    const [restaurants, setRestaurants] = useState([]);
    useEffect(() => {
        sanityClient.fetch(`*[_type=="featured" && _id==$id]{
            ...,
            restaurants[] ->{
                ...,
                dishes[] ->,
                type->{
                name}  
            },
            }[0]`, { id }).then((data) => {
            setRestaurants(data?.restaurants);
        }).catch(console.error);

    }, [])
    return (
        <View className="mb-6">
            <View className="flex-row items-center justify-between mt-4 px-4">
                <Text className="text-xl font-bold text-gray-900">{title}</Text>
                <TouchableOpacity>
                    <ArrowRightIcon color="#00CCBB" size={24} />
                </TouchableOpacity>
            </View>
            <Text className="text-sm text-gray-500 px-4 mt-1 mb-3">{description}</Text>

            <ScrollView
                horizontal
                contentContainerStyle={{
                    paddingHorizontal: 15,
                    paddingBottom: 20, // Add padding for shadows
                }}
                showsHorizontalScrollIndicator={false}
                className="pt-2"
            >
                {restaurants?.map((restaurant) => (
                    <RestaurantCard
                        key={restaurant._id}
                        id={restaurant._id}
                        imgUrl={restaurant.image}
                        address={restaurant.address}
                        title={restaurant.name}
                        dishes={restaurant.dishes}
                        rating={restaurant.rating}
                        short_description={restaurant.short_description}
                        genre={restaurant.type.name}
                        long={restaurant.long}
                        lat={restaurant.lat}
                    />
                ))}
                {/* RestaurantCards */}


            </ScrollView>
        </View>
    )
}

export default FeaturedRow
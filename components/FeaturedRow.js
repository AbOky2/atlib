import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { ArrowRightIcon } from 'react-native-heroicons/outline'
import RestaurantCard from './RestaurantCard'

const FeaturedRow = ({ id, title, description, restaurants }) => {
    return (
        <View className="mb-6">
            {/* Section Header */}
            <View className="flex-row items-center justify-between px-4 mt-4 mb-1">
                <Text className="text-xl font-bold text-text tracking-tight">{title}</Text>
                <TouchableOpacity
                    activeOpacity={0.7}
                    className="flex-row items-center"
                >
                    <Text className="text-sm font-semibold text-primary mr-1">Voir tout</Text>
                    <ArrowRightIcon color="#7A1E3A" size={16} />
                </TouchableOpacity>
            </View>
            <Text className="text-sm text-muted px-4 mb-3">{description}</Text>

            {/* Horizontal Restaurant Cards */}
            <ScrollView
                horizontal
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 8,
                }}
                showsHorizontalScrollIndicator={false}
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
                        genre={restaurant.type?.name}
                        long={restaurant.long}
                        lat={restaurant.lat}
                    />
                ))}
            </ScrollView>
        </View>
    )
}

export default FeaturedRow

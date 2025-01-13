import { View, Text, ScrollView } from 'react-native'
import React from 'react'
import { ArrowRightIcon } from 'react-native-heroicons/outline'
import RestaurantCard from './RestaurantCard'

const FeaturedRow = ({id,title, description}) => {
  return (
    <View>
        <View className="flex-row items-center justify-between mt-4 px-4">
            <Text className="text-lg font-bold">{title}</Text>
            <ArrowRightIcon color="#00CCBB"/>
        </View>
        <Text className="text-xs text-gray-500 px-4">{description}</Text>

        <ScrollView
         horizontal
         contentContainerStyle={{
                paddingHorizontal : 15,
            }}  
            showsHorizontalScrollIndicator={false}
            className="pt-4 "
         >
            {/* RestaurantCards */}

            <RestaurantCard
            id={123}
            imgUrl="https://links.papareact.com/gn7"
            title="Restaurant"
            rating={4}
            genre="Pizza"
            address="123 Main Street"
            short_description="Quick Bites"
            dishes="Pizza, Pasta, Salad"
            long={-73.935242}
            lat={40.73061}
        
            />
             <RestaurantCard
            id={123}
            imgUrl="https://links.papareact.com/gn7"
            title="Restaurant"
            rating={4}
            genre="Pizza"
            address="123 Main Street"
            short_description="Quick Bites"
            dishes="Pizza, Pasta, Salad"
            long={-73.935242}
            lat={40.73061}
        
            />
             <RestaurantCard
            id={123}
            imgUrl="https://links.papareact.com/gn7"
            title="Restaurant"
            rating={4}
            genre="Pizza"
            address="123 Main Street"
            short_description="Quick Bites"
            dishes="Pizza, Pasta, Salad"
            long={-73.935242}
            lat={40.73061}
        
            />
        </ScrollView>
    </View>
  )
}

export default FeaturedRow
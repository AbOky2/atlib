import { Text, TouchableOpacity, Image, View } from 'react-native'
import React from 'react'

const CategoryCard = ({ imgUrl, title }) => {
  const imageUri = imgUrl || null;

  return (
    <TouchableOpacity className="mr-3 items-center" activeOpacity={0.8}>
      <View className="bg-primarySoft rounded-sm p-1">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="h-20 w-20 rounded-sm object-cover bg-bg"
          />
        ) : (
          <View className="h-20 w-20 rounded-sm bg-bg items-center justify-center">
            <Text className="text-3xl">🍽️</Text>
          </View>
        )}
      </View>
      <Text
        className="text-text font-semibold text-xs mt-1.5 text-center w-20"
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  )
}

export default CategoryCard

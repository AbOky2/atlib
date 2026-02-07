import { Text, TouchableOpacity, Image, View } from 'react-native'
import React from 'react'
import { urlFor } from '../sanity'

const CategoryCard = ({ imgUrl, title }) => {
  return (
    <TouchableOpacity className="mr-3 items-center" activeOpacity={0.8}>
      <View className="bg-primarySoft rounded-sm p-1">
        <Image
          source={{ uri: urlFor(imgUrl).url() }}
          className="h-16 w-16 rounded-sm object-cover bg-bg"
        />
      </View>
      <Text
        className="text-text font-semibold text-xs mt-1.5 text-center w-16"
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  )
}

export default CategoryCard

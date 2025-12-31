import { Text, TouchableOpacity, Image, View } from 'react-native'
import React from 'react'
import { urlFor } from '../sanity'

const CategoryCard = ({ imgUrl, title }) => {
  return (
    <TouchableOpacity className="relative mr-3" activeOpacity={0.8}>
      <Image source={{
        uri: urlFor(imgUrl).url(),
      }} className='h-24 w-24 rounded-xl object-cover bg-gray-200' />
      <View className="absolute bottom-1 left-1 right-1 bg-black/30 rounded-lg p-1">
        <Text className="text-white font-bold text-center text-xs" numberOfLines={1}>{title}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default CategoryCard
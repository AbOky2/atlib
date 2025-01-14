import {Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { urlFor } from '../sanity'


const CategoryCard = ({imgUrl, title} ) => {
  return (
    <TouchableOpacity className="relative mr-2">
        {/* // On modifie l'uri de l'imgUrl pour qu'il accepte Sanity */}
        <Image source={{
                uri :urlFor(imgUrl).url(),}} className='h-20 w-20 rounded' />
      <Text className="absolute left-1 bottom-1 text-white font-bold">{title}</Text>
    </TouchableOpacity>
  )
}

export default CategoryCard
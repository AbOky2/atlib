import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import Currency from '../utils/formatCurrency'
import { urlFor } from '../sanity'
import { useSelector } from 'react-redux'
import { selectBasketItems } from '../features/basketSlice'

/**
 * DishGridCard — UberEats style 2-col grid card.
 * Tapping anywhere on the card opens the DishModal (via onPress).
 * A count badge on the image shows quantity already in cart.
 */
const DishGridCard = ({
  id,
  name,
  description,
  price,
  image,
  restaurantId,
  onPress,
}) => {
  const allItems = useSelector(selectBasketItems)
  const count = allItems.filter(
    (item) => item.id === id && item.restaurantId === restaurantId,
  ).length

  let imageUri = null
  try {
    imageUri = image ? urlFor(image).url() : null
  } catch {
    imageUri = typeof image === 'string' ? image : null
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-1 bg-surface border border-border rounded-xl overflow-hidden mx-1 mb-3"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      {/* Image zone */}
      <View className="relative">
        {imageUri ? (
          <Image source={{ uri: imageUri }} className="w-full h-32" resizeMode="cover" />
        ) : (
          <View className="w-full h-32 bg-bg items-center justify-center">
            <View className="bg-primarySoft rounded-full h-14 w-14" />
          </View>
        )}

        {/* Count badge — shown only when item is in cart */}
        {count > 0 && (
          <View
            className="absolute bottom-2 right-2 bg-primary rounded-full items-center justify-center"
            style={{
              width: 26,
              height: 26,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3,
              elevation: 4,
            }}
          >
            <Text className="text-white font-extrabold text-xs">{count}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View className="p-2.5">
        <Text className="text-sm font-bold text-text leading-5" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-sm font-bold text-primary mt-0.5">
          <Currency quantity={price} currency="XAF" />
        </Text>
        {description ? (
          <Text className="text-xs text-muted mt-1 leading-4" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

export default DishGridCard

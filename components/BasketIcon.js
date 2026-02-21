import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { useSelector } from 'react-redux'
import { selectBasketItems, selectBasketTotalForRestaurant } from '../features/basketSlice'
import { useNavigation } from '@react-navigation/native'
import { ShoppingCartIcon } from 'react-native-heroicons/solid'
import Currency from '../utils/formatCurrency'

/**
 * BasketIcon — floating "Voir le panier" bar shown at the bottom of RestaurantScreen.
 * Opens CartSummaryScreen (bottom sheet modal) for this specific restaurant.
 *
 * Props:
 *   restaurantId    string
 *   restaurantTitle string
 */
const BasketIcon = ({ restaurantId, restaurantTitle }) => {
  const navigation = useNavigation()
  const allItems = useSelector(selectBasketItems)
  const restaurantItems = allItems.filter((i) => i.restaurantId === restaurantId)
  const total = useSelector((state) => selectBasketTotalForRestaurant(state, restaurantId))

  if (restaurantItems.length === 0) return null

  const itemCount = restaurantItems.length

  return (
    <View
      className="absolute bottom-6 left-5 right-5 z-50"
      pointerEvents="box-none"
    >
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('CartSummary', { restaurantId, restaurantTitle })
        }
        activeOpacity={0.92}
        className="bg-primary rounded-xl flex-row items-center px-4 py-3.5"
        style={{
          shadowColor: '#7A1E3A',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {/* Item count badge */}
        <View className="bg-white/20 rounded-lg px-2.5 py-1 mr-3">
          <Text className="text-white font-extrabold text-sm">{itemCount}</Text>
        </View>

        {/* Label */}
        <View className="flex-1 flex-row items-center">
          <ShoppingCartIcon size={17} color="white" />
          <Text className="text-white font-bold text-base ml-2">Voir le panier</Text>
        </View>

        {/* Total */}
        <Text className="text-white font-extrabold text-base">
          <Currency quantity={total} currency="XAF" />
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export default BasketIcon

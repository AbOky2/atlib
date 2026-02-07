import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { useSelector } from 'react-redux'
import { selectBasketItems, selectBasketTotal } from '../features/basketSlice'
import { useNavigation } from '@react-navigation/native'
import Currency from "../utils/formatCurrency"

const BasketIcon = () => {
  const items = useSelector(selectBasketItems);
  const navigation = useNavigation();
  const basketTotal = useSelector(selectBasketTotal);

  if (items.length === 0) return null;
  return (
    <View className="absolute bottom-10 w-full z-50">
      <TouchableOpacity
        onPress={() => navigation.navigate("Basket")}
        activeOpacity={0.9}
        className="mx-5 bg-primary py-4 px-5 rounded-md flex-row items-center"
      >
        <View className="bg-primaryDark py-1 px-3 rounded-sm">
          <Text className="text-white font-extrabold text-base">{items.length}</Text>
        </View>
        <Text className="text-white flex-1 font-bold text-base text-center">
          Voir le panier
        </Text>
        <Text className="text-white font-extrabold text-base">
          <Currency quantity={basketTotal} currency="XAF" />
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export default BasketIcon

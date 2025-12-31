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
    <View className='absolute bottom-10 w-full z-50'>
      <TouchableOpacity
        onPress={() => navigation.navigate("Basket")}
        activeOpacity={0.9}
        className='mx-5 bg-[#00CCBB] p-4 rounded-2xl flex-row items-center space-x-1 shadow-lg shadow-black/20'>
        <View className='bg-[#01A296] py-1 px-3 rounded-md'>
          <Text className='text-white font-extrabold text-lg'>{items.length}</Text>
        </View>
        <Text className='text-white flex-1 font-bold text-lg text-center'>View Basket</Text>
        <Text className='text-lg text-white font-extrabold'>
          <Currency quantity={basketTotal} currency="USD" />
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export default BasketIcon
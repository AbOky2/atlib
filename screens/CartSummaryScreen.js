import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import {
  selectBasketItems,
  selectBasketTotalForRestaurant,
  setItemQuantity,
  clearRestaurantBasket,
} from '../features/basketSlice'
import { XMarkIcon, PlusIcon, MinusIcon } from 'react-native-heroicons/solid'
import { urlFor } from '../sanity'
import Currency from '../utils/formatCurrency'

/**
 * CartSummaryScreen — modal that shows all items in cart for ONE restaurant.
 * Navigated to with params: { restaurantId, restaurantTitle }
 * "Passer au paiement" → Basket (checkout).
 */
const CartSummaryScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const dispatch = useDispatch()

  const { restaurantId, restaurantTitle } = route.params ?? {}

  const allItems = useSelector(selectBasketItems)
  const subtotal = useSelector((state) =>
    selectBasketTotalForRestaurant(state, restaurantId),
  )

  // Group items by dish id
  const grouped = {}
  allItems
    .filter((i) => i.restaurantId === restaurantId)
    .forEach((item) => {
      if (!grouped[item.id]) {
        grouped[item.id] = { ...item, count: 0 }
      }
      grouped[item.id].count += 1
    })
  const entries = Object.values(grouped)

  const handleQtyChange = (item, newCount) => {
    dispatch(
      setItemQuantity({
        id: item.id,
        restaurantId,
        qty: newCount,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        restaurantTitle: item.restaurantTitle,
        restaurantImgUrl: item.restaurantImgUrl,
      }),
    )
    // Auto-close if cart becomes empty
    if (newCount === 0 && entries.length === 1) {
      navigation.goBack()
    }
  }

  const handleCheckout = () => {
    // Replace the modal with Basket so checkout appears as a full page, not stacked on the modal
    navigation.replace('Basket', { restaurantId })
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      {/* ─── Drag handle ─── */}
      <View className="items-center pt-3 pb-1">
        <View className="h-1 w-10 bg-border rounded-full" />
      </View>

      {/* ─── Header ─── */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-border">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          className="p-1.5 rounded-full bg-bg border border-border"
        >
          <XMarkIcon size={18} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-text" numberOfLines={1}>
          {restaurantTitle ?? 'Panier'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* ─── Items ─── */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {entries.map((item) => {
          let imgUri = null
          try {
            imgUri = item.image ? urlFor(item.image).url() : null
          } catch {
            imgUri = null
          }

          return (
            <View
              key={item.id}
              className="flex-row items-center px-5 py-4 border-b border-border"
            >
              {/* Dish image */}
              {imgUri ? (
                <Image
                  source={{ uri: imgUri }}
                  className="h-16 w-16 rounded-lg bg-bg mr-4"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-16 w-16 rounded-lg bg-bg mr-4" />
              )}

              {/* Info */}
              <View className="flex-1 mr-3">
                <Text className="font-semibold text-text text-sm" numberOfLines={2}>
                  {item.name}
                </Text>
                <Text className="text-primary font-bold text-sm mt-1">
                  <Currency quantity={item.price * item.count} currency="XAF" />
                </Text>
              </View>

              {/* Qty controls */}
              <View
                className="flex-row items-center bg-bg border border-border rounded-full overflow-hidden"
              >
                <TouchableOpacity
                  onPress={() => handleQtyChange(item, item.count - 1)}
                  activeOpacity={0.7}
                  className="h-8 w-8 items-center justify-center"
                >
                  <MinusIcon size={13} color="#7A1E3A" />
                </TouchableOpacity>
                <Text className="text-text font-extrabold text-sm w-6 text-center">
                  {item.count}
                </Text>
                <TouchableOpacity
                  onPress={() => handleQtyChange(item, item.count + 1)}
                  activeOpacity={0.7}
                  className="h-8 w-8 items-center justify-center bg-primary rounded-full"
                >
                  <PlusIcon size={13} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )
        })}

        {/* Add more articles */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          className="flex-row items-center px-5 py-4"
        >
          <View className="h-7 w-7 rounded-full border-2 border-text items-center justify-center mr-3">
            <PlusIcon size={14} color="#111827" />
          </View>
          <Text className="text-text font-semibold text-sm">Ajouter des articles</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Footer ─── */}
      <View className="border-t border-border px-5 pt-4 pb-8 bg-surface">
        {/* Subtotal */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-text font-semibold text-base">Sous-total</Text>
          <Text className="text-text font-bold text-base">
            <Currency quantity={subtotal} currency="XAF" />
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleCheckout}
          activeOpacity={0.85}
          disabled={entries.length === 0}
          className={`rounded-xl py-4 items-center ${entries.length > 0 ? 'bg-primary' : 'bg-muted/30'}`}
        >
          <Text className="text-white font-bold text-base">Passer au paiement</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default CartSummaryScreen

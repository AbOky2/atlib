import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import {
  selectBasketItemsByRestaurant,
  clearRestaurantBasket,
} from '../features/basketSlice'
import { selectCurrentAddress } from '../features/addressSlice'
import {
  ShoppingBagIcon,
  MapPinIcon,
  TrashIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
} from 'react-native-heroicons/outline'
import Currency from '../utils/formatCurrency'
import { urlFor } from '../sanity'
import CustomNavBar from '../components/CustomNavBar'

const RestaurantBasketCard = ({ group, address, onViewBasket, onClear }) => {
  const { restaurantTitle, restaurantImgUrl, items, total } = group

  let imgUri = null
  try {
    imgUri = restaurantImgUrl ? urlFor(restaurantImgUrl).url() : null
  } catch {
    imgUri = typeof restaurantImgUrl === 'string' ? restaurantImgUrl : null
  }

  const uniqueItems = {}
  items.forEach((item) => {
    uniqueItems[item.id] = (uniqueItems[item.id] || 0) + 1
  })
  const articleCount = Object.keys(uniqueItems).length

  const handleClear = () =>
    Alert.alert(
      'Vider le panier',
      `Supprimer tous les articles de ${restaurantTitle} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Vider', style: 'destructive', onPress: onClear },
      ],
    )

  return (
    <View className="mx-4 mb-4 bg-surface rounded-xl border border-border overflow-hidden"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
      {/* Restaurant header */}
      <View className="flex-row items-center px-4 pt-4 pb-3">
        {imgUri ? (
          <Image
            source={{ uri: imgUri }}
            className="h-12 w-12 rounded-full bg-bg mr-3"
            resizeMode="cover"
          />
        ) : (
          <View className="h-12 w-12 rounded-full bg-primarySoft items-center justify-center mr-3">
            <ShoppingBagIcon size={22} color="#7A1E3A" />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-base font-extrabold text-text">{restaurantTitle}</Text>
          <Text className="text-xs text-muted mt-0.5">
            {items.length} article{items.length > 1 ? 's' : ''}&nbsp;·&nbsp;
            <Currency quantity={total} currency="XAF" />
          </Text>
        </View>
        <TouchableOpacity onPress={handleClear} activeOpacity={0.7} className="p-2">
          <TrashIcon size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Delivery address */}
      {address?.zone ? (
        <View className="flex-row items-center px-4 pb-3">
          <MapPinIcon size={14} color="#9CA3AF" />
          <Text className="text-xs text-muted ml-1.5" numberOfLines={1}>
            Livrer à&nbsp;
            <Text className="font-semibold text-text">{address.zone}</Text>
            {address.landmark ? ` — ${address.landmark}` : ''}
          </Text>
        </View>
      ) : null}

      {/* Divider */}
      <View className="h-px bg-border mx-4" />

      {/* Actions */}
      <View className="flex-row">
        <TouchableOpacity
          onPress={onViewBasket}
          activeOpacity={0.8}
          className="flex-1 flex-row items-center justify-center py-4 bg-primary rounded-bl-xl"
        >
          <Text className="text-white font-bold text-sm">Voir le panier</Text>
          <ChevronRightIcon size={16} color="white" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const PaniersScreen = () => {
  const navigation = useNavigation()
  const dispatch = useDispatch()
  const restaurantGroups = useSelector(selectBasketItemsByRestaurant)
  const address = useSelector(selectCurrentAddress)

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Header */}
      <View className="bg-surface flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          className="mr-3 p-1"
        >
          <ArrowLeftIcon size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text flex-1">Paniers</Text>
        {restaurantGroups.length > 0 && (
          <View className="bg-primarySoft px-2.5 py-0.5 rounded-full">
            <Text className="text-primary font-bold text-xs">
              {restaurantGroups.length} restaurant{restaurantGroups.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {restaurantGroups.length === 0 ? (
        /* Empty state */
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-primarySoft p-6 rounded-full mb-5">
            <ShoppingBagIcon size={44} color="#7A1E3A" />
          </View>
          <Text className="text-xl font-bold text-text mb-2 text-center">
            Votre panier est vide
          </Text>
          <Text className="text-muted text-center mb-8 leading-6">
            Ajoutez des plats depuis un restaurant pour commencer votre commande.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            activeOpacity={0.85}
            className="bg-primary px-8 py-3.5 rounded-md"
          >
            <Text className="text-white font-bold text-base">Explorer les restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        >
          {restaurantGroups.map((group) => (
            <RestaurantBasketCard
              key={group.restaurantId}
              group={group}
              address={address}
              onViewBasket={() =>
                navigation.navigate('CartSummary', {
                  restaurantId: group.restaurantId,
                  restaurantTitle: group.restaurantTitle,
                })
              }
              onClear={() => dispatch(clearRestaurantBasket(group.restaurantId))}
            />
          ))}
        </ScrollView>
      )}

      <CustomNavBar />
    </SafeAreaView>
  )
}

export default PaniersScreen

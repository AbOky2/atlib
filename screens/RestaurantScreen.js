import { View, Text, Image, ScrollView, TouchableOpacity, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import {
  XMarkIcon, MagnifyingGlassIcon, EllipsisHorizontalIcon,
  MapPinIcon as MapPinSolid, HeartIcon as HeartIconOutline,
} from 'react-native-heroicons/outline'
import { StarIcon, HeartIcon, UserGroupIcon } from 'react-native-heroicons/solid'
import DishGridCard from '../components/DishGridCard'
import BasketIcon from '../components/BasketIcon'
import DishModal from '../components/DishModal'
import { useDispatch, useSelector } from 'react-redux'
import { setRestaurant } from '../features/restaurantSlice'
import { toggleFavoriteAndPersist, selectIsFavorite } from '../features/favoritesSlice'
import Chip from '../src/ui/Chip'
import { formatCurrency } from '../utils/formatCurrency'

const RestaurantScreen = () => {
  const navigation = useNavigation()
  const dispatch = useDispatch()
  const {
    params: { id, imgUrl, title, rating, genre, address, short_description, dishes, long, lat },
  } = useRoute()

  const isFavorite = useSelector((state) => selectIsFavorite(state, id))
  const [selectedDish, setSelectedDish] = useState(null)

  useEffect(() => {
    dispatch(setRestaurant({ id, imgUrl, title, rating, genre, address, short_description, dishes, long, lat }))
  }, [])

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [])

  // Since we migrated to Supabase, imgUrl is already a direct string URL
  const heroUri = imgUrl || null

  // Build pairs for 2-column grid
  const dishPairs = []
  if (dishes) {
    for (let i = 0; i < dishes.length; i += 2) {
      dishPairs.push(dishes.slice(i, i + 2))
    }
  }

  return (
    <>
      <StatusBar barStyle="light-content" />

      {/* Floating basket bar */}
      <BasketIcon restaurantId={id} restaurantTitle={title} />

      {/* Dish detail modal */}
      <DishModal
        visible={!!selectedDish}
        dish={selectedDish}
        restaurantId={id}
        restaurantTitle={title}
        restaurantImgUrl={imgUrl}
        onClose={() => setSelectedDish(null)}
      />

      <View className="flex-1 bg-bg">
        {/* ═══ Hero ═══ */}
        <View className="relative">
          {heroUri ? (
            <Image source={{ uri: heroUri }} className="w-full h-48" resizeMode="cover" />
          ) : (
            <View className="w-full h-48 bg-primarySoft items-center justify-center">
              <Text style={{ fontSize: 64 }}>🍽️</Text>
            </View>
          )}

          {/* Top Buttons */}
          <SafeAreaView className="absolute top-0 w-full flex-row justify-between items-center px-4 pt-1">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              className="p-2 bg-black/40 rounded-full"
            >
              <XMarkIcon size={22} color="white" />
            </TouchableOpacity>

            <View className="flex-row">
              <TouchableOpacity className="p-2 bg-black/40 rounded-full mr-2">
                <MagnifyingGlassIcon size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => dispatch(toggleFavoriteAndPersist(id))}
                className="p-2 bg-black/40 rounded-full mr-2"
              >
                {isFavorite ? (
                  <HeartIcon size={22} color="#EF4444" />
                ) : (
                  <HeartIconOutline size={22} color="white" />
                )}
              </TouchableOpacity>
              <TouchableOpacity className="p-2 bg-black/40 rounded-full">
                <EllipsisHorizontalIcon size={22} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* ═══ Content ═══ */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 bg-surface -mt-4 rounded-t-3xl"
        >
          {/* Restaurant Info */}
          <View className="px-4 pt-5 pb-3">
            <Text className="text-2xl font-extrabold text-text mb-1">{title}</Text>
            <View className="flex-row items-center flex-wrap mb-1">
              <StarIcon size={16} color="#C8A24A" />
              <Text className="text-sm font-bold text-text ml-1">{rating}</Text>
              <Text className="text-muted mx-1.5">•</Text>
              <Text className="text-muted text-sm">{genre}</Text>
            </View>
            <View className="flex-row items-center">
              <MapPinSolid size={14} color="#6B7280" />
              <Text className="text-muted text-sm ml-1" numberOfLines={1}>{address}</Text>
            </View>
          </View>

          {/* Delivery / Pickup Tabs */}
          <View className="px-4 pb-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chip label="Livraison" selected={true} />
              <Chip label="À emporter" />
              <Chip label="Commande groupée" icon={<UserGroupIcon size={14} color="#6B7280" />} />
            </ScrollView>
          </View>

          {/* Info boxes */}
          <View className="flex-row px-4 mb-4">
            <View className="flex-1 bg-bg border border-border rounded-md p-3 mr-2 items-center">
              <Text className="text-sm font-bold text-text">{formatCurrency(0, 'XAF')}</Text>
              <Text className="text-xs text-muted mt-0.5">Frais de livraison</Text>
            </View>
          </View>

          <View className="h-2 bg-bg" />

          {/* ═══ Menu — 2-column grid ═══ */}
          <View className="px-3 pt-4 pb-40">
            <Text className="text-xl font-extrabold text-text mb-4 px-1">
              Notre sélection pour vous
            </Text>

            {dishPairs.map((pair, rowIdx) => (
              <View key={rowIdx} className="flex-row">
                {pair.map((dish) => (
                  <DishGridCard
                    key={dish.id}
                    id={dish.id}
                    name={dish.name}
                    description={dish.short_description}
                    price={dish.price_xaf}
                    image={dish.image_url}
                    restaurantId={id}
                    onPress={() =>
                      setSelectedDish({
                        id: dish.id,
                        name: dish.name,
                        description: dish.short_description,
                        price: dish.price_xaf,
                        image: dish.image_url,
                      })
                    }
                  />
                ))}
                {pair.length === 1 && <View className="flex-1 mx-1" />}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </>
  )
}

export default RestaurantScreen

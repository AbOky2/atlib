import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import Currency from '../utils/formatCurrency'
import { urlFor } from '../sanity'
import { PlusIcon } from 'react-native-heroicons/solid'
import { useDispatch, useSelector } from 'react-redux'
import { addToBasket, selectBasketItemsWithId } from '../features/basketSlice'

/**
 * DishGridCard — Uber Eats-style 2-column grid card
 * Shows dish image with floating + button, name, price, description
 */
const DishGridCard = ({ id, name, description, price, image }) => {
  const dispatch = useDispatch();
  const items = useSelector((state) => selectBasketItemsWithId(state, id));

  const addItemToBasket = () => {
    dispatch(addToBasket({ id, name, description, price, image }));
  };

  let imageUri = null;
  try {
    imageUri = image ? urlFor(image).url() : null;
  } catch {
    imageUri = typeof image === 'string' ? image : null;
  }

  return (
    <View className="flex-1 bg-surface border border-border rounded-md overflow-hidden mx-1 mb-3">
      {/* Image + Add Button */}
      <View className="relative">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="w-full h-32"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-32 bg-bg items-center justify-center">
            <Text className="text-3xl">🍽️</Text>
          </View>
        )}

        {/* Floating + button */}
        <TouchableOpacity
          onPress={addItemToBasket}
          activeOpacity={0.8}
          className="absolute bottom-2 right-2 bg-surface h-8 w-8 rounded-full items-center justify-center border border-border"
          style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2 }}
        >
          {items.length > 0 ? (
            <Text className="text-primary font-bold text-xs">{items.length}</Text>
          ) : (
            <PlusIcon size={16} color="#111827" />
          )}
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View className="p-2.5">
        <Text className="text-sm font-bold text-text" numberOfLines={1}>{name}</Text>
        <Text className="text-sm font-bold text-primary mt-0.5">
          <Currency quantity={price} currency="XAF" />
        </Text>
        {description ? (
          <Text className="text-xs text-muted mt-1 leading-4" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export default DishGridCard

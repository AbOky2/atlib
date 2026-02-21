import {
  Modal, View, Text, TouchableOpacity, Image, ScrollView, Alert, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  selectBasketItems, setItemQuantity, clearBasket,
} from '../features/basketSlice'
import { urlFor } from '../sanity'
import Currency from '../utils/formatCurrency'
import { XMarkIcon, MinusIcon, PlusIcon } from 'react-native-heroicons/solid'

/**
 * DishModal — full-screen slide-up modal, UberEats style.
 * Props:
 *   visible          boolean
 *   dish             { id, name, description, price, image }
 *   restaurantId     string
 *   restaurantTitle  string
 *   restaurantImgUrl any
 *   onClose          () => void
 */
const DishModal = ({
  visible, dish, restaurantId, restaurantTitle, restaurantImgUrl, onClose,
}) => {
  const dispatch = useDispatch()
  const allItems = useSelector(selectBasketItems)

  const currentCount = dish
    ? allItems.filter((i) => i.id === dish.id && i.restaurantId === restaurantId).length
    : 0

  // Local quantity — starts at current count or 1
  const [qty, setQty] = useState(Math.max(currentCount, 1))

  // Sync qty when modal opens for a new dish
  useEffect(() => {
    if (visible && dish) {
      setQty(Math.max(currentCount, 1))
    }
  }, [visible, dish?.id])

  if (!dish) return null

  const foreignItems = allItems.filter((i) => i.restaurantId !== restaurantId)

  let imageUri = null
  try {
    imageUri = dish.image ? urlFor(dish.image).url() : null
  } catch {
    imageUri = typeof dish.image === 'string' ? dish.image : null
  }

  const lineTotal = dish.price * qty

  const handleConfirm = () => {
    if (qty === 0) {
      // Remove all instances of this dish
      dispatch(
        setItemQuantity({
          id: dish.id, restaurantId, qty: 0,
          name: dish.name, description: dish.description,
          price: dish.price, image: dish.image,
          restaurantTitle, restaurantImgUrl,
        }),
      )
      onClose()
      return
    }

    if (foreignItems.length > 0) {
      const otherName = foreignItems[0]?.restaurantTitle || 'un autre restaurant'
      Alert.alert(
        'Un seul restaurant à la fois',
        `Votre panier contient des articles de « ${otherName} ». Vider le panier et commander ici ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Vider et continuer',
            style: 'destructive',
            onPress: () => {
              dispatch(clearBasket())
              dispatch(
                setItemQuantity({
                  id: dish.id, restaurantId, qty,
                  name: dish.name, description: dish.description,
                  price: dish.price, image: dish.image,
                  restaurantTitle, restaurantImgUrl,
                }),
              )
              onClose()
            },
          },
        ],
      )
      return
    }

    dispatch(
      setItemQuantity({
        id: dish.id, restaurantId, qty,
        name: dish.name, description: dish.description,
        price: dish.price, image: dish.image,
        restaurantTitle, restaurantImgUrl,
      }),
    )
    onClose()
  }

  const isUpdate = currentCount > 0
  const canConfirm = qty > 0 || isUpdate

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
        {/* ─── Close button ─── */}
        <View className="absolute top-3 left-4 z-10">
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            className="bg-surface/90 rounded-full p-2 border border-border"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <XMarkIcon size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces>
          {/* ─── Hero image ─── */}
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              className="w-full"
              style={{ height: 280 }}
              resizeMode="cover"
            />
          ) : (
            <View
              className="w-full bg-primarySoft items-center justify-center"
              style={{ height: 200 }}
            >
              <Text style={{ fontSize: 64 }}>🍽️</Text>
            </View>
          )}

          {/* ─── Info ─── */}
          <View className="px-5 pt-5 pb-6">
            <Text className="text-2xl font-extrabold text-text leading-tight mb-2">
              {dish.name}
            </Text>

            <Text className="text-xl font-bold text-text mb-1">
              <Currency quantity={dish.price} currency="XAF" />
            </Text>

            {dish.description ? (
              <Text className="text-muted text-sm leading-6 mt-2">{dish.description}</Text>
            ) : null}
          </View>

          {/* Spacer for bottom controls */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ─── Bottom controls ─── */}
        <View
          className="absolute bottom-0 w-full bg-surface border-t border-border px-5 pb-8 pt-4"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8 }}
        >
          <View className="flex-row items-center justify-between mb-4">
            {/* Quantity pill */}
            <View className="flex-row items-center bg-bg border border-border rounded-full overflow-hidden">
              <TouchableOpacity
                onPress={() => setQty((q) => Math.max(0, q - 1))}
                activeOpacity={0.7}
                className="h-10 w-10 items-center justify-center"
              >
                <MinusIcon size={16} color={qty <= 0 ? '#9CA3AF' : '#7A1E3A'} />
              </TouchableOpacity>
              <Text className="text-text font-extrabold text-base w-8 text-center">{qty}</Text>
              <TouchableOpacity
                onPress={() => setQty((q) => q + 1)}
                activeOpacity={0.7}
                className="h-10 w-10 items-center justify-center bg-primary rounded-full"
              >
                <PlusIcon size={16} color="white" />
              </TouchableOpacity>
            </View>

            {/* CTA */}
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.85}
              disabled={!canConfirm}
              className={`flex-1 ml-4 rounded-xl py-3 items-center ${canConfirm ? 'bg-primary' : 'bg-muted/30'}`}
            >
              <Text className={`font-bold text-base ${canConfirm ? 'text-white' : 'text-muted'}`}>
                {qty === 0
                  ? 'Retirer du panier'
                  : isUpdate
                  ? `Mettre à jour · ${lineTotal.toLocaleString('fr-FR')} XAF`
                  : `Ajouter au panier · ${lineTotal.toLocaleString('fr-FR')} XAF`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

export default DishModal

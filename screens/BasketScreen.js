import {
  View, Text, TouchableOpacity, Image, ScrollView, Alert, LayoutAnimation,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import {
  selectBasketItems,
  selectBasketTotalForRestaurant,
  removeFromBasket,
  addToBasket,
  clearRestaurantBasket,
} from '../features/basketSlice'
import { selectCurrentAddress } from '../features/addressSlice'
import { createOrderRemote } from '../features/orderSlice'
import {
  ArrowLeftIcon, MapPinIcon, ExclamationTriangleIcon,
  ClockIcon, ChevronDownIcon, ChevronUpIcon,
} from 'react-native-heroicons/outline'
import { MinusIcon, PlusIcon } from 'react-native-heroicons/solid'
import { urlFor } from '../sanity'
import Currency from '../utils/formatCurrency'
import PaymentOptions from '../components/PaymentOptions'
import Card from '../src/ui/Card'
import { registerForPushNotificationsAsync } from '../utils/notifications'

const BasketScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const dispatch = useDispatch()
  const allItems = useSelector(selectBasketItems)
  const currentAddress = useSelector(selectCurrentAddress)
  const [selectedPayment, setSelectedPayment] = useState('cash')
  const [accordionOpen, setAccordionOpen] = useState(true)

  // restaurantId either from route param OR first available restaurant
  const restaurantId = route.params?.restaurantId ?? allItems[0]?.restaurantId ?? null
  const restaurantTitle = allItems.find((i) => i.restaurantId === restaurantId)?.restaurantTitle ?? ''
  const restaurantImgUrl = allItems.find((i) => i.restaurantId === restaurantId)?.restaurantImgUrl ?? null

  // Items for this restaurant only
  const items = allItems.filter((i) => i.restaurantId === restaurantId)

  // Group by dish id for display
  const grouped = items.reduce((acc, item) => {
    acc[item.id] = acc[item.id] || { ...item, count: 0 }
    acc[item.id].count += 1
    return acc
  }, {})
  const groupedEntries = Object.entries(grouped)

  const subtotal = useSelector((state) => selectBasketTotalForRestaurant(state, restaurantId))
  const deliveryFee = 500
  const total = subtotal + deliveryFee

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setAccordionOpen((v) => !v)
  }

  const handlePlaceOrder = async () => {
    if (!currentAddress?.zone) {
      Alert.alert(
        'Adresse manquante',
        'Veuillez sélectionner votre adresse de livraison.',
        [{ text: 'OK' }],
      )
      return
    }
    if (items.length === 0) return

    try {
      const pushToken = await registerForPushNotificationsAsync()
      const restaurant = {
        id: restaurantId,
        title: restaurantTitle,
        imgUrl: restaurantImgUrl,
      }

      dispatch(
        createOrderRemote({
          restaurant,
          items: grouped,
          deliveryAddress: currentAddress,
          subtotal,
          deliveryFee,
          total,
          paymentMethod: selectedPayment,
          restaurantName: restaurantTitle,
          restaurantImage: restaurantImgUrl || '',
          pushToken,
        }),
      )

      // Dispatch clear BEFORE navigation so items don't show in next visit
      dispatch(clearRestaurantBasket(restaurantId))

      navigation.navigate('PreparingOrder')
    } catch (e) {
      console.error(e)
      Alert.alert('Erreur', 'Impossible de créer la commande.', [{ text: 'OK' }])
    }
  }

  let restaurantImgUri = null
  try {
    restaurantImgUri = restaurantImgUrl ? urlFor(restaurantImgUrl).url() : null
  } catch {
    restaurantImgUri = typeof restaurantImgUrl === 'string' ? restaurantImgUrl : null
  }

  const canOrder = !!currentAddress?.zone && items.length > 0

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* ═══ Header ═══ */}
      <View className="bg-surface flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          className="mr-3 p-1"
        >
          <ArrowLeftIcon size={22} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-text">Paiement</Text>
          <Text className="text-muted text-xs" numberOfLines={1}>{restaurantTitle}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ─── Address ─── */}
        <View className="mx-4 mt-4">
          {currentAddress?.zone ? (
            <Card>
              <View className="flex-row items-center mb-2">
                <View className="bg-primarySoft p-2 rounded-full mr-3">
                  <MapPinIcon size={16} color="#7A1E3A" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-muted">Livrer à</Text>
                  <Text className="text-base font-bold text-text">{currentAddress.zone}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Address')}
                  activeOpacity={0.7}
                >
                  <Text className="text-primary font-bold text-sm">Modifier</Text>
                </TouchableOpacity>
              </View>
              {currentAddress.landmark ? (
                <Text className="text-sm text-muted">{currentAddress.landmark}</Text>
              ) : null}
              {currentAddress.deliveryTime ? (
                <View className="mt-2 bg-primarySoft py-2 px-3 rounded-sm flex-row items-center">
                  <ClockIcon size={14} color="#7A1E3A" />
                  <Text className="text-sm text-primary font-semibold ml-1.5">
                    Estimé : {currentAddress.deliveryTime}
                  </Text>
                </View>
              ) : null}
            </Card>
          ) : (
            <Card>
              <View className="flex-row items-center mb-2">
                <ExclamationTriangleIcon size={18} color="#F59E0B" />
                <Text className="text-warning font-bold ml-2">Adresse requise</Text>
              </View>
              <Text className="text-muted text-sm mb-3">
                Sélectionnez une adresse de livraison.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Address')}
                activeOpacity={0.8}
                className="border border-primary rounded-md py-2.5 items-center"
              >
                <Text className="text-primary font-bold text-sm">Ajouter une adresse</Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>

        {/* ─── Restaurant accordion ─── */}
        <View className="mx-4 mt-4">
          <Card padded={false} className="overflow-hidden">
            {/* Header row */}
            <TouchableOpacity
              onPress={toggleAccordion}
              activeOpacity={0.7}
              className="flex-row items-center px-4 py-3.5"
            >
              {restaurantImgUri ? (
                <Image
                  source={{ uri: restaurantImgUri }}
                  className="h-10 w-10 rounded-full bg-bg mr-3"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-10 w-10 rounded-full bg-primarySoft items-center justify-center mr-3">
                  <Text className="text-primary font-bold text-xs">
                    {(restaurantTitle || 'R')[0]}
                  </Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="font-extrabold text-text">{restaurantTitle}</Text>
                <Text className="text-xs text-muted mt-0.5">
                  {items.length} article{items.length > 1 ? 's' : ''}
                </Text>
              </View>
              {accordionOpen ? (
                <ChevronUpIcon size={18} color="#6B7280" />
              ) : (
                <ChevronDownIcon size={18} color="#6B7280" />
              )}
            </TouchableOpacity>

            {/* Items */}
            {accordionOpen &&
              groupedEntries.map(([key, item], idx) => {
                let imgUri = null
                try {
                  imgUri = item.image ? urlFor(item.image).url() : null
                } catch { imgUri = null }

                return (
                  <View
                    key={key}
                    className={`flex-row items-center py-3 px-4 border-t border-border`}
                  >
                    {imgUri ? (
                      <Image
                        source={{ uri: imgUri }}
                        className="h-10 w-10 rounded-md bg-bg mr-3"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="h-10 w-10 rounded-md bg-bg mr-3" />
                    )}
                    <Text
                      className="flex-1 font-semibold text-text text-sm"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    {/* Quantity controls */}
                    <View className="flex-row items-center mr-3">
                      <TouchableOpacity
                        onPress={() => dispatch(removeFromBasket({ id: key, restaurantId }))}
                        activeOpacity={0.7}
                        className="h-6 w-6 rounded-full border border-border items-center justify-center"
                      >
                        <MinusIcon size={11} color="#6B7280" />
                      </TouchableOpacity>
                      <Text className="text-text font-bold text-sm mx-2 w-4 text-center">
                        {item.count}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          dispatch(
                            addToBasket({
                              id: key,
                              name: item.name,
                              description: item.description,
                              price: item.price,
                              image: item.image,
                              restaurantId,
                              restaurantTitle,
                              restaurantImgUrl,
                            }),
                          )
                        }
                        activeOpacity={0.7}
                        className="h-6 w-6 rounded-full border border-border items-center justify-center"
                      >
                        <PlusIcon size={11} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    <Text className="text-muted font-medium text-sm min-w-[56px] text-right">
                      <Currency quantity={item.price * item.count} currency="XAF" />
                    </Text>
                  </View>
                )
              })}
          </Card>
        </View>

        {/* ─── Delivery options ─── */}
        <View className="mx-4 mt-4">
          <PaymentOptions
            selectedPayment={selectedPayment}
            onPaymentSelect={setSelectedPayment}
          />
        </View>

        {/* ─── Summary ─── */}
        <View className="mx-4 mt-4">
          <Card>
            <Text className="text-base font-bold text-text mb-3">Récapitulatif</Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Sous-total</Text>
              <Text className="text-text font-semibold">
                <Currency quantity={subtotal} currency="XAF" />
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Livraison</Text>
              <Text className="text-text font-semibold">
                <Currency quantity={deliveryFee} currency="XAF" />
              </Text>
            </View>
            <View className="border-t border-border pt-3 mt-1 flex-row justify-between items-center">
              <Text className="text-lg font-bold text-text">Total</Text>
              <Text className="text-lg font-extrabold text-primary">
                <Currency quantity={total} currency="XAF" />
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* ═══ Sticky CTA ═══ */}
      <View className="absolute bottom-0 w-full bg-surface border-t border-border px-4 pt-2.5 pb-7">
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={!canOrder}
          activeOpacity={0.85}
          className={`rounded-md py-3.5 ${canOrder ? 'bg-primary' : 'bg-muted/30'}`}
        >
          <Text
            className={`text-center font-bold text-base ${canOrder ? 'text-white' : 'text-muted'}`}
          >
            {!currentAddress?.zone
              ? 'Ajouter une adresse'
              : `Commander et payer · ${total.toLocaleString('fr-FR')} XAF`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default BasketScreen

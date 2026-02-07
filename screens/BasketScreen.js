import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { selectRestaurant } from '../features/restaurantSlice'
import { removeFromBasket, selectBasketItems, selectBasketTotal } from '../features/basketSlice'
import { selectCurrentAddress } from '../features/addressSlice'
import { createOrder } from '../features/orderSlice'
import { ArrowLeftIcon, MapPinIcon, ExclamationTriangleIcon, ClockIcon } from 'react-native-heroicons/outline'
import { urlFor } from '../sanity'
import Currency from '../utils/formatCurrency'
import PaymentOptions from '../components/PaymentOptions'
import Card from '../src/ui/Card'
import Button from '../src/ui/Button'

const BasketScreen = () => {
  const navigation = useNavigation();
  const restaurant = useSelector(selectRestaurant);
  const items = useSelector(selectBasketItems);
  const currentAddress = useSelector(selectCurrentAddress);
  const [groupedItemsInBasket, setGroupedItemsInBasket] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const dispatch = useDispatch();
  const basketTotal = useSelector(selectBasketTotal);

  useEffect(() => {
    const grouped = items.reduce((res, item) => {
      (res[item.id] = res[item.id] || []).push(item);
      return res;
    }, {});
    setGroupedItemsInBasket(grouped);
  }, [items]);

  const handlePlaceOrder = () => {
    if (!currentAddress?.zone) {
      Alert.alert('Adresse manquante', 'Veuillez sélectionner votre adresse de livraison', [{ text: 'OK' }]);
      return;
    }
    try {
      dispatch(createOrder({
        restaurant, items: groupedItemsInBasket, deliveryAddress: currentAddress,
        subtotal: basketTotal, deliveryFee: 500, total: basketTotal + 500, paymentMethod: selectedPayment,
        restaurantName: restaurant.title, restaurantImage: restaurant.imgUrl || '',
      }));
      navigation.navigate('OrderTracking');
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de créer la commande.', [{ text: 'OK' }]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* ═══ Header ═══ */}
      <View className="bg-surface flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1" activeOpacity={0.7}>
          <ArrowLeftIcon size={22} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-text">Panier</Text>
          <Text className="text-muted text-xs">{restaurant.title}</Text>
        </View>
      </View>

      {/* ═══ Content ═══ */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Address */}
        {currentAddress?.zone ? (
          <View className="mx-4 mt-4">
            <Card>
              <View className="flex-row items-center mb-2">
                <View className="bg-primarySoft p-2 rounded-full mr-3">
                  <MapPinIcon size={16} color="#7A1E3A" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text">Livrer à</Text>
                  <Text className="text-base font-bold text-text">{currentAddress.zone}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Address')} activeOpacity={0.7}>
                  <Text className="text-primary font-bold text-sm">Modifier</Text>
                </TouchableOpacity>
              </View>
              {currentAddress.landmark ? <Text className="text-sm text-muted">{currentAddress.landmark}</Text> : null}
              {currentAddress.phoneNumber ? (
                <View className="flex-row items-center mt-2 pt-2 border-t border-border">
                  <Text className="text-sm text-muted">📞 {currentAddress.phoneNumber}</Text>
                </View>
              ) : null}
              {currentAddress.deliveryTime ? (
                <View className="mt-2 bg-primarySoft py-2 px-3 rounded-sm flex-row items-center justify-center">
                  <ClockIcon size={14} color="#7A1E3A" />
                  <Text className="text-sm text-primary font-semibold ml-1.5">Estimé : {currentAddress.deliveryTime}</Text>
                </View>
              ) : null}
            </Card>
          </View>
        ) : (
          <View className="mx-4 mt-4">
            <Card className="bg-accentSoft border-accent/20">
              <View className="flex-row items-center mb-2">
                <ExclamationTriangleIcon size={18} color="#F59E0B" />
                <Text className="text-warning font-bold ml-2">Adresse requise</Text>
              </View>
              <Text className="text-warning/80 text-sm mb-3">Veuillez sélectionner une adresse</Text>
              <Button variant="secondary" size="sm" label="Ajouter une adresse" onPress={() => navigation.navigate('Address')} />
            </Card>
          </View>
        )}

        {/* Items */}
        <View className="mx-4 mt-4">
          <Text className="text-base font-bold text-text mb-2">Vos articles</Text>
          <Card padded={false} className="overflow-hidden">
            {Object.entries(groupedItemsInBasket).map(([key, items], idx) => {
              let imgUri = null;
              try { imgUri = items[0]?.image ? urlFor(items[0].image).url() : null; } catch { imgUri = null; }
              return (
                <View key={key} className={`flex-row items-center py-3 px-4 ${idx < Object.entries(groupedItemsInBasket).length - 1 ? 'border-b border-border' : ''}`}>
                  <View className="bg-primarySoft px-2 py-0.5 rounded-sm mr-3">
                    <Text className="text-primary font-bold text-sm">{items.length}x</Text>
                  </View>
                  {imgUri ? (
                    <Image source={{ uri: imgUri }} className="h-10 w-10 rounded-sm bg-bg" />
                  ) : (
                    <View className="h-10 w-10 rounded-sm bg-bg items-center justify-center">
                      <Text>🍽️</Text>
                    </View>
                  )}
                  <Text className="flex-1 font-semibold text-text ml-3" numberOfLines={1}>{items[0]?.name}</Text>
                  <Text className="text-muted font-medium text-sm mr-3">
                    <Currency quantity={items[0]?.price} currency="XAF" />
                  </Text>
                  <TouchableOpacity onPress={() => dispatch(removeFromBasket({ id: key }))} activeOpacity={0.7}>
                    <Text className="text-danger text-xs font-bold">Retirer</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </Card>
        </View>

        {/* Payment */}
        <View className="mx-4 mt-4">
          <PaymentOptions selectedPayment={selectedPayment} onPaymentSelect={setSelectedPayment} />
        </View>

        {/* Summary */}
        <View className="mx-4 mt-4">
          <Card>
            <Text className="text-base font-bold text-text mb-3">Résumé</Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Sous-total</Text>
              <Text className="text-text font-semibold"><Currency quantity={basketTotal} currency="XAF" /></Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Livraison</Text>
              <Text className="text-text font-semibold"><Currency quantity={500} currency="XAF" /></Text>
            </View>
            <View className="border-t border-border pt-2 mt-1 flex-row justify-between items-center">
              <Text className="text-lg font-bold text-text">Total</Text>
              <Text className="text-lg font-extrabold text-primary"><Currency quantity={basketTotal + 500} currency="XAF" /></Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* ═══ Sticky CTA ═══ */}
      <View className="absolute bottom-0 w-full bg-surface border-t border-border px-4 pt-2.5 pb-7">
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={!currentAddress?.zone || items.length === 0}
          activeOpacity={0.85}
          className={`rounded-md py-3.5 ${!currentAddress?.zone || items.length === 0 ? 'bg-muted/30' : 'bg-primary'}`}
        >
          <Text className={`text-center font-bold text-base ${!currentAddress?.zone || items.length === 0 ? 'text-muted' : 'text-white'}`}>
            {!currentAddress?.zone ? 'Ajouter une adresse' : `Commander • ${Currency({ quantity: basketTotal + 500, currency: 'XAF' })}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default BasketScreen

import { View, Text, SafeAreaView, TouchableOpacity, Image, ScrollView, Alert } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux';
import { selectRestaurant } from '../features/restaurantSlice';
import { removeFromBasket, selectBasketItems, selectBasketTotal } from '../features/basketSlice';
import { selectCurrentAddress } from '../features/addressSlice';
import { createOrder } from '../features/orderSlice';
import { XCircleIcon, MapPinIcon } from 'react-native-heroicons/solid';
import { urlFor } from '../sanity';
import Currency from "../utils/formatCurrency";
import PaymentOptions from '../components/PaymentOptions';

const BasketScreen = () => {
  const navigation = useNavigation();
  const restaurant = useSelector(selectRestaurant);
  const items = useSelector(selectBasketItems);
  const currentAddress = useSelector(selectCurrentAddress);
  const [groupedItemsInBasket, setGroupedItemsInBasket] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const dispatch = useDispatch();
  const basketTotal = useSelector(selectBasketTotal)

  useEffect(() => {
    const groupedItems = items.reduce((results, item) => {
      (results[item.id] = results[item.id] || []).push(item);
      return results;
    }, {});

    setGroupedItemsInBasket(groupedItems);
  }, [items])

  const handlePlaceOrder = () => {
    if (!currentAddress?.zone) {
      Alert.alert(
        'Adresse manquante',
        'Veuillez sélectionner votre adresse de livraison',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const orderData = {
        restaurant: restaurant,
        items: groupedItemsInBasket,
        deliveryAddress: currentAddress,
        subtotal: basketTotal,
        deliveryFee: 5.99,
        total: basketTotal + 5.99,
        paymentMethod: selectedPayment
      };

      dispatch(createOrder(orderData));
      navigation.navigate("OrderTracking");
    } catch (error) {
      console.error("Erreur lors de la création de la commande:", error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la création de votre commande. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }
  }
  return (
    <SafeAreaView className='flex-1 bg-white'>
      {/* Header fixe */}
      <View className='p-5 border-b border-gray-100 bg-white shadow-sm z-10'>
        <View>
          <Text className='text-lg font-bold text-center text-gray-900'>Panier</Text>
          <Text className='text-center text-gray-400 text-xs'>{restaurant.title}</Text>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()}
          className='rounded-full bg-gray-50 absolute top-3 right-5'
        >
          <XCircleIcon color="#F59E0B" height={50} width={50} />
        </TouchableOpacity>
      </View>

      {/* Contenu défilable */}
      <ScrollView className='flex-1 bg-gray-50' showsVerticalScrollIndicator={false}>
        {/* Adresse de livraison */}
        {currentAddress?.zone ? (
          <View className='bg-white mx-4 my-4 p-4 rounded-2xl shadow-sm border border-gray-100'>
            <View className='flex-row items-center mb-2'>
              <MapPinIcon size={20} color="#F59E0B" />
              <Text className='font-bold ml-2 text-gray-800'>Livrer à</Text>
            </View>
            <Text className='text-base font-medium text-gray-900'>{currentAddress?.zone}</Text>
            <Text className='text-sm text-gray-500'>{currentAddress?.landmark}</Text>
            <Text className='text-sm text-gray-400 mt-1'>{currentAddress?.description}</Text>
            <View className='flex-row items-center justify-between mt-3 pt-3 border-t border-gray-50'>
              <Text className='text-sm text-gray-600'>📞 {currentAddress?.phoneNumber}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Address')}>
                <Text className='text-[#F59E0B] font-bold'>Modifier</Text>
              </TouchableOpacity>
            </View>
            <View className='mt-3 bg-[#F59E0B]/10 p-2 rounded-lg'>
              <Text className='text-sm text-[#F59E0B] font-bold text-center'>
                Temps estimé: {currentAddress?.deliveryTime}
              </Text>
            </View>
          </View>
        ) : (
          <View className='bg-yellow-50 mx-4 my-4 p-4 rounded-2xl border border-yellow-100'>
            <Text className='text-yellow-800 font-bold mb-2'>⚠️ Adresse requise</Text>
            <Text className='text-yellow-700 text-sm mb-3'>
              Veuillez sélectionner une adresse de livraison
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Address')}
              className='bg-yellow-200 py-2 px-4 rounded-xl'
            >
              <Text className='text-yellow-900 font-bold text-center'>
                Ajouter une adresse
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info livraison */}
        <View className='flex-row items-center space-x-4 px-4 py-4 bg-white mx-4 rounded-2xl mb-4 shadow-sm border border-gray-100'>
          <Image source={{
            uri: "https://links.papareact.com/wru",
          }}
            className="h-7 w-7 bg-gray-300 p-4 rounded-full"
          />
          <Text className="flex-1 font-medium text-gray-800">Livraison en 30-45 min</Text>
          <TouchableOpacity>
            <Text className='text-[#F59E0B] font-bold'>Modifier</Text>
          </TouchableOpacity>
        </View>

        {/* Articles du panier */}
        <View className='mx-4 mb-4'>
          <Text className='text-lg font-bold mb-3 text-gray-800'>Vos articles</Text>
          <View className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
            {Object.entries(groupedItemsInBasket).map(([key, items]) => (
              <View key={key} className='flex-row items-center space-x-3 gap-3 py-4 px-4 border-b border-gray-50 last:border-b-0'>
                <Text className='text-[#F59E0B] font-bold'>{items.length} x</Text>
                <Image
                  source={{ uri: urlFor(items[0]?.image).url() }}
                  className='h-12 w-12 rounded-full bg-gray-200'
                />
                <Text className='flex-1 font-semibold text-gray-800'>{items[0]?.name}</Text>

                <Text className='text-gray-500 font-medium'>
                  <Currency quantity={items[0]?.price} currency="XAF" />
                </Text>

                <TouchableOpacity onPress={() => dispatch(removeFromBasket({ id: key }))}>
                  <Text className='text-red-500 text-xs font-bold uppercase'>
                    Supprimer
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Options de paiement */}
        <View className='mx-4 mb-4'>
          <PaymentOptions
            selectedPayment={selectedPayment}
            onPaymentSelect={setSelectedPayment}
          />
        </View>

        {/* Résumé des coûts */}
        <View className='mx-4 mb-24 bg-white rounded-2xl shadow-sm p-5 border border-gray-100'>
          <Text className='text-lg font-bold mb-4 text-gray-800'>Résumé de la commande</Text>

          <View className='space-y-3'>
            <View className='flex-row justify-between'>
              <Text className='text-gray-500'>Sous-total</Text>
              <Text className='text-gray-800 font-semibold'>
                <Currency quantity={basketTotal} currency="XAF" />
              </Text>
            </View>

            <View className='flex-row justify-between'>
              <Text className='text-gray-500'>Frais de livraison</Text>
              <Text className='text-gray-800 font-semibold'>
                <Currency quantity={500} currency="XAF" />
              </Text>
            </View>

            <View className='border-t border-gray-100 pt-3 mt-2'>
              <View className='flex-row justify-between items-center'>
                <Text className='text-xl font-bold text-gray-900'>Total</Text>
                <Text className='text-xl font-extrabold text-[#F59E0B]'>
                  <Currency quantity={basketTotal + 500} currency="XAF" />
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bouton de commande fixe en bas */}
      <View className='absolute bottom-0 w-full bg-white border-t border-gray-100 p-5 shadow-lg'>
        <TouchableOpacity
          onPress={() => handlePlaceOrder()}
          className={`rounded-2xl p-4 shadow-md ${!currentAddress?.zone ? 'bg-gray-300' : 'bg-[#F59E0B]'}`}
          disabled={!currentAddress?.zone}
          activeOpacity={0.8}
        >
          <Text className='text-center text-white text-lg font-bold'>
            {!currentAddress?.zone ? 'Ajouter une adresse' : 'Commander'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default BasketScreen
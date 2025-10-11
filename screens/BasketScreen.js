import { View, Text, SafeAreaView, TouchableOpacity, Image, ScrollView, Alert } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux';
import { selectRestaurant } from '../features/restaurantSlice';
import { removeFromBasket, selectBasketItems, selectBasketTotal } from '../features/basketSlice';
import { selectCurrentAddress } from '../features/addressSlice';
import { createOrder } from '../features/orderSlice';
import { XCircleIcon, MapPinIcon } from 'react-native-heroicons/outline';
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
      <View className='p-5 border-b border-[#00CCBB] bg-white shadow-xs'>
        <View>
          <Text className='text-lg font-bold text-center'>Panier</Text>
          <Text className='text-center text-gray-400'>{restaurant.title}</Text>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()}
         className='rounded-full bg-gray-100 absolute top-3 right-5'
            >
                <XCircleIcon color="#00CCBB" height={50} width={50}/>
        </TouchableOpacity>
      </View>

      {/* Contenu défilable */}
      <ScrollView className='flex-1 bg-gray-100' showsVerticalScrollIndicator={false}>
        {/* Adresse de livraison */}
        {currentAddress?.zone ? (
          <View className='bg-white mx-4 my-4 p-4 rounded-lg shadow-sm border border-gray-200'>
            <View className='flex-row items-center mb-2'>
              <MapPinIcon size={20} color="#00CCBB" />
              <Text className='font-semibold ml-2 text-gray-700'>Adresse de livraison</Text>
            </View>
            <Text className='text-base font-medium'>{currentAddress?.zone}</Text>
            <Text className='text-sm text-gray-600'>{currentAddress?.landmark}</Text>
            <Text className='text-sm text-gray-500 mt-1'>{currentAddress?.description}</Text>
            <View className='flex-row items-center justify-between mt-3'>
              <Text className='text-sm text-[#00CCBB]'>📞 {currentAddress?.phoneNumber}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Address')}>
                <Text className='text-[#00CCBB] font-semibold'>Modifier</Text>
              </TouchableOpacity>
            </View>
            <View className='mt-2 bg-[#00CCBB] bg-opacity-10 p-2 rounded'>
              <Text className='text-sm text-[#00CCBB] font-medium'>
                Temps estimé: {currentAddress?.deliveryTime}
              </Text>
            </View>
          </View>
        ) : (
          <View className='bg-yellow-50 mx-4 my-4 p-4 rounded-lg border border-yellow-200'>
            <Text className='text-yellow-800 font-semibold mb-2'>⚠️ Adresse requise</Text>
            <Text className='text-yellow-700 text-sm mb-3'>
              Veuillez sélectionner votre adresse de livraison pour continuer
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Address')}
              className='bg-yellow-200 py-2 px-4 rounded-lg'
            >
              <Text className='text-yellow-800 font-semibold text-center'>
                Ajouter une adresse
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info livraison */}
        <View className='flex-row items-center space-x-4 px-4 py-3 bg-white mx-4 rounded-lg mb-4'>
            <Image source={{
                uri: "https://links.papareact.com/wru",
            }}
            className= "h-7 w-7 bg-gray-300 p-4 rounded-full"
             />
             <Text className="flex-1">Livraison par le restaurant</Text>
             <Text className='text-[#00CCBB] text-sm'>
               {currentAddress?.deliveryTime || '30-45 min'}
             </Text>
        </View>

        {/* Articles du panier */}
        <View className='mx-4 mb-4'>
          <Text className='text-lg font-bold mb-3 text-gray-800'>Vos articles</Text>
          <View className='bg-white rounded-lg shadow-sm'>
            {Object.entries(groupedItemsInBasket).map(([key, items]) =>(
              <View key={key} className='flex-row items-center space-x-3 gap-3 py-3 px-4 border-b border-gray-100 last:border-b-0'>
                  <Text className='text-[#00CCBB] font-semibold'>{items.length}x</Text>
                  <Image
                  source={{uri : urlFor(items[0]?.image).url()}}
                  className='h-12 w-12 rounded-full'
                   />
                   <Text className='flex-1 font-medium'>{items[0]?.name}</Text>

                   <Text className='text-gray-600 font-semibold'>
                      <Currency quantity={items[0]?.price} currency="USD"/>
                   </Text>

                   <TouchableOpacity onPress={() => dispatch(removeFromBasket({id : key}))}>
                      <Text className='text-red-500 text-sm font-semibold'>
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
        <View className='mx-4 mb-4 bg-white rounded-lg shadow-sm p-4'>
          <Text className='text-lg font-bold mb-4 text-gray-800'>Résumé</Text>
          
          <View className='space-y-3'>
            <View className='flex-row justify-between'>
                <Text className='text-gray-600'>Sous-total</Text>
                <Text className='text-gray-800 font-semibold'>
                    <Currency quantity={basketTotal} currency="USD"/>
                </Text>
            </View>

            <View className='flex-row justify-between'>
                <Text className='text-gray-600'>Frais de livraison</Text>
                <Text className='text-gray-800 font-semibold'>
                    <Currency quantity={5.99} currency="USD"/>
                </Text>
            </View>

            <View className='border-t border-gray-200 pt-3'>
              <View className='flex-row justify-between'>
                  <Text className='text-lg font-bold text-gray-800'>Total</Text>
                  <Text className='text-lg font-bold text-[#00CCBB]'>
                      <Currency quantity={basketTotal + 5.99} currency="USD"/>
                  </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bouton de commande fixe en bas */}
      <View className='bg-white border-t border-gray-200 p-4'>
        <TouchableOpacity 
          onPress={() => handlePlaceOrder()}
          className={`rounded-lg p-4 ${!currentAddress?.zone ? 'bg-gray-400' : 'bg-[#00CCBB]'}`}
          disabled={!currentAddress?.zone}
        >
          <Text className='text-center text-white text-lg font-bold'>
            {!currentAddress?.zone ? 'Ajouter une adresse' : 'Passer la commande'}
          </Text>
        </TouchableOpacity>
        
        {currentAddress?.zone && (
          <Text className='text-center text-gray-500 text-sm mt-2'>
            Paiement: {selectedPayment === 'cash' ? 'Espèces à la livraison' : 
                       selectedPayment === 'airtel_money' ? 'Airtel Money' : 
                       selectedPayment === 'tigo_cash' ? 'Tigo Cash' : 'Carte bancaire'}
          </Text>
        )}
      </View>
    </SafeAreaView>
  )
}

export default BasketScreen
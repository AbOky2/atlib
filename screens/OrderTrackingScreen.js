import { View, Text, SafeAreaView, TouchableOpacity, Image, Linking, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { selectCurrentOrder, selectOrderStatuses } from '../features/orderSlice'
import { selectRestaurant } from '../features/restaurantSlice'
import { selectCurrentAddress } from '../features/addressSlice'
import { XMarkIcon, PhoneIcon, ClockIcon, MapPinIcon } from 'react-native-heroicons/outline'
import { CheckCircleIcon } from 'react-native-heroicons/solid'
import * as Progress from "react-native-progress"

const OrderTrackingScreen = () => {
  const navigation = useNavigation()
  const currentOrder = useSelector(selectCurrentOrder)
  const orderStatuses = useSelector(selectOrderStatuses)
  const restaurant = useSelector(selectRestaurant)
  const deliveryAddress = useSelector(selectCurrentAddress)
  
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  const getStatusProgress = (status) => {
    const statusOrder = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED']
    const currentIndex = statusOrder.indexOf(status)
    return (currentIndex + 1) / statusOrder.length
  }

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': '#F59E0B',
      'ACCEPTED': '#10B981',
      'PREPARING': '#3B82F6',
      'READY': '#8B5CF6',
      'OUT_FOR_DELIVERY': '#F97316',
      'DELIVERED': '#059669',
      'CANCELLED': '#EF4444'
    }
    return colors[status] || '#6B7280'
  }

  const handleCallRestaurant = () => {
    const phoneNumber = restaurant.phone || '66123456' // Numéro par défaut
    Alert.alert(
      'Appeler le restaurant',
      `Voulez-vous appeler ${restaurant.title} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler', onPress: () => Linking.openURL(`tel:${phoneNumber}`) }
      ]
    )
  }

  const handleCallDelivery = () => {
    const phoneNumber = deliveryAddress.phoneNumber
    Alert.alert(
      'Numéro de livraison',
      `Votre numéro: ${phoneNumber}\nLe livreur vous contactera sur ce numéro.`,
      [{ text: 'OK' }]
    )
  }

  const formatTime = (timeString) => {
    const date = new Date(timeString)
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const getDeliverySteps = () => {
    const steps = [
      { key: 'PENDING', label: 'Commande reçue', icon: '📝' },
      { key: 'ACCEPTED', label: 'Acceptée par le restaurant', icon: '✅' },
      { key: 'PREPARING', label: 'En préparation', icon: '👨‍🍳' },
      { key: 'READY', label: 'Prêt pour livraison', icon: '📦' },
      { key: 'OUT_FOR_DELIVERY', label: 'En cours de livraison', icon: '🏍️' },
      { key: 'DELIVERED', label: 'Livré', icon: '🎉' }
    ]

    return steps.map((step, index) => {
      const isActive = currentOrder?.status === step.key
      const isCompleted = getStatusProgress(currentOrder?.status) > (index + 1) / steps.length
      
      return (
        <View key={step.key} className="flex-row items-center mb-4">
          <View className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
            isActive ? 'bg-[#00CCBB]' : isCompleted ? 'bg-green-500' : 'bg-gray-300'
          }`}>
            {isCompleted ? (
              <CheckCircleIcon size={20} color="white" />
            ) : (
              <Text className="text-lg">{step.icon}</Text>
            )}
          </View>
          <View className="flex-1">
            <Text className={`font-semibold ${isActive ? 'text-[#00CCBB]' : 'text-gray-600'}`}>
              {step.label}
            </Text>
            {isActive && (
              <Text className="text-sm text-gray-500 mt-1">
                En cours... {formatTime(currentOrder?.updatedAt || currentOrder?.createdAt)}
              </Text>
            )}
          </View>
        </View>
      )
    })
  }

  if (!currentOrder) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text className="text-lg text-gray-600">Aucune commande en cours</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Home')}
          className="mt-4 bg-[#00CCBB] px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Retour à l'accueil</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <XMarkIcon size={24} color="#00CCBB" />
        </TouchableOpacity>
        <Text className="text-lg font-bold">Suivi de commande</Text>
        <TouchableOpacity onPress={handleCallRestaurant}>
          <PhoneIcon size={24} color="#00CCBB" />
        </TouchableOpacity>
      </View>

      {/* Order Status Card */}
      <View className="mx-4 mt-4 bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <View className="flex-row items-center mb-4">
          <View className="flex-1">
            <Text className="text-xl font-bold text-[#00CCBB]">
              {orderStatuses[currentOrder.status]}
            </Text>
            <Text className="text-sm text-gray-500">
              Commande #{currentOrder.id.slice(-6)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-sm font-semibold text-gray-700">
              {currentOrder.estimatedDeliveryTime}
            </Text>
            <Text className="text-xs text-gray-500">Temps estimé</Text>
          </View>
        </View>

        <Progress.Bar 
          progress={getStatusProgress(currentOrder.status)} 
          color={getStatusColor(currentOrder.status)}
          unfilledColor="#E5E7EB"
          borderWidth={0}
          height={6}
          width={null}
        />
      </View>

      {/* Restaurant Info */}
      <View className="mx-4 mt-4 bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <View className="flex-row items-center">
          <Image
            source={{ uri: restaurant.imgUrl ? restaurant.imgUrl : 'https://via.placeholder.com/60' }}
            className="w-12 h-12 rounded-full mr-3"
          />
          <View className="flex-1">
            <Text className="font-semibold text-lg">{restaurant.title}</Text>
            <Text className="text-sm text-gray-500">{restaurant.address}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleCallRestaurant}
            className="bg-[#00CCBB] px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-semibold">Appeler</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delivery Address */}
      <View className="mx-4 mt-4 bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <View className="flex-row items-start">
          <MapPinIcon size={24} color="#00CCBB" className="mr-3 mt-1" />
          <View className="flex-1">
            <Text className="font-semibold text-base mb-1">Adresse de livraison</Text>
            <Text className="text-sm text-gray-600 mb-1">
              {deliveryAddress.zone} - {deliveryAddress.landmark}
            </Text>
            <Text className="text-sm text-gray-500">
              {deliveryAddress.description}
            </Text>
            <Text className="text-sm text-[#00CCBB] mt-2">
              📞 {deliveryAddress.phoneNumber}
            </Text>
          </View>
        </View>
      </View>

      {/* Delivery Steps */}
      <View className="mx-4 mt-4 bg-white rounded-lg shadow-md p-4 border border-gray-200 flex-1">
        <Text className="font-semibold text-lg mb-4">État de la commande</Text>
        {getDeliverySteps()}
      </View>

      {/* Contact Section */}
      <View className="mx-4 mt-4 mb-4 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <Text className="font-semibold text-yellow-800 mb-2">
          📞 Contact important
        </Text>
        <Text className="text-sm text-yellow-700 mb-3">
          Le livreur vous contactera sur le {deliveryAddress.phoneNumber} avant la livraison.
        </Text>
        <TouchableOpacity 
          onPress={handleCallDelivery}
          className="bg-yellow-200 px-4 py-2 rounded-lg"
        >
          <Text className="text-yellow-800 font-semibold text-center">
            Vérifier mon numéro
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default OrderTrackingScreen 
import { View, Text, SafeAreaView, TouchableOpacity, Image, Linking, Alert, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { selectCurrentOrder, selectOrderStatuses } from '../features/orderSlice'
import { selectRestaurant } from '../features/restaurantSlice'
import { selectCurrentAddress } from '../features/addressSlice'
import { XMarkIcon, PhoneIcon, MapPinIcon } from 'react-native-heroicons/solid'
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
      `Appeler ${restaurant.title}?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler', onPress: () => Linking.openURL(`tel:${phoneNumber}`) }
      ]
    )
  }

  const handleCallDelivery = () => {
    const phoneNumber = deliveryAddress.phoneNumber
    Alert.alert(
      'Contact Livraison',
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
      { key: 'READY', label: 'Prête à récupérer', icon: '📦' },
      { key: 'OUT_FOR_DELIVERY', label: 'En cours de livraison', icon: '🏍️' },
      { key: 'DELIVERED', label: 'Livrée', icon: '🎉' }
    ]

    return steps.map((step, index) => {
      const isActive = currentOrder?.status === step.key
      const isCompleted = getStatusProgress(currentOrder?.status) > (index + 1) / steps.length

      return (
        <View key={step.key} className="flex-row items-center mb-6">
          <View className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shadow-sm ${isActive ? 'bg-[#F59E0B]' : isCompleted ? 'bg-green-100' : 'bg-gray-100'
            }`}>
            {isCompleted ? (
              <CheckCircleIcon size={24} color="#10B981" />
            ) : (
              <Text className="text-lg">{step.icon}</Text>
            )}
          </View>
          <View className="flex-1">
            <Text className={`font-bold text-base ${isActive ? 'text-[#F59E0B]' : isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
              {step.label}
            </Text>
            {isActive && (
              <Text className="text-xs text-gray-500 mt-1 font-medium italic">
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
        <Text className="text-lg text-gray-600 font-medium">Aucune commande active</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          className="mt-6 bg-[#F59E0B] px-8 py-3 rounded-2xl shadow-md"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-lg">Retour à l'accueil</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-gray-50 rounded-full">
          <XMarkIcon size={24} color="#F59E0B" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Suivi de commande</Text>
        <TouchableOpacity onPress={handleCallRestaurant} className="p-2 bg-gray-50 rounded-full">
          <PhoneIcon size={24} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
        {/* Order Status Card */}
        <View className="mx-4 mt-6 bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
          <View className="flex-row items-center mb-6">
            <View className="flex-1">
              <Text className="text-sm text-gray-500 font-medium mb-1">
                Commande #{currentOrder.id.slice(-6)}
              </Text>
              <Text className="text-2xl font-extrabold text-[#F59E0B]">
                {orderStatuses[currentOrder.status]}
              </Text>
            </View>
            <View className="items-end bg-gray-50 px-3 py-2 rounded-xl">
              <Text className="text-lg font-bold text-gray-900">
                {currentOrder.estimatedDeliveryTime}
              </Text>
              <Text className="text-xs text-gray-500">Temps estimé</Text>
            </View>
          </View>

          <Progress.Bar
            progress={getStatusProgress(currentOrder.status)}
            color={getStatusColor(currentOrder.status)}
            unfilledColor="#F3F4F6"
            borderWidth={0}
            height={8}
            width={null}
            borderRadius={4}
          />
        </View>

        {/* Restaurant Info */}
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <View className="flex-row items-center">
            <Image
              source={{ uri: restaurant.imgUrl ? restaurant.imgUrl : 'https://via.placeholder.com/60' }}
              className="w-14 h-14 rounded-xl mr-4 bg-gray-200"
            />
            <View className="flex-1">
              <Text className="font-bold text-lg text-gray-900">{restaurant.title}</Text>
              <Text className="text-sm text-gray-500" numberOfLines={1}>{restaurant.address}</Text>
            </View>
            <TouchableOpacity
              onPress={handleCallRestaurant}
              className="bg-[#F59E0B]/10 px-4 py-2 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-[#F59E0B] font-bold">Appeler</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Address */}
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <View className="flex-row items-start">
            <MapPinIcon size={24} color="#F59E0B" className="mr-3 mt-1" />
            <View className="flex-1">
              <Text className="font-bold text-base mb-1 text-gray-900">Adresse de livraison</Text>
              <Text className="text-sm text-gray-600 mb-1 font-medium">
                {deliveryAddress.zone} - {deliveryAddress.landmark}
              </Text>
              <Text className="text-sm text-gray-500 leading-5">
                {deliveryAddress.description}
              </Text>
              <Text className="text-sm text-[#F59E0B] mt-2 font-bold">
                📞 {deliveryAddress.phoneNumber}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Steps */}
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-5 border border-gray-100 mb-6">
          <Text className="font-bold text-lg mb-6 text-gray-900">État de la commande</Text>
          {getDeliverySteps()}
        </View>

        {/* Contact Section */}
        <View className="mx-4 mb-24 bg-yellow-50 rounded-2xl p-5 border border-yellow-100">
          <Text className="font-bold text-yellow-800 mb-2">
            📞 Contact Livraison
          </Text>
          <Text className="text-sm text-yellow-700 mb-4 leading-5">
            Le livreur vous contactera au {deliveryAddress.phoneNumber} avant la livraison.
          </Text>
          <TouchableOpacity
            onPress={handleCallDelivery}
            className="bg-yellow-200 px-4 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-yellow-900 font-bold text-center">
              Vérifier mon numéro
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default OrderTrackingScreen 
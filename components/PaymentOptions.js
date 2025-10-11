import { View, Text, TouchableOpacity, Image } from 'react-native'
import React, { useState } from 'react'
import { BanknotesIcon, CreditCardIcon, DevicePhoneMobileIcon } from 'react-native-heroicons/outline'

const PaymentOptions = ({ selectedPayment, onPaymentSelect }) => {
  const paymentMethods = [
    {
      id: 'cash',
      name: 'Espèces à la livraison',
      description: 'Paiement en espèces au livreur',
      icon: 'cash',
      available: true,
      popular: true
    },
    {
      id: 'airtel_money',
      name: 'Airtel Money',
      description: 'Paiement mobile Airtel',
      icon: 'mobile',
      available: true,
      popular: false
    },
    {
      id: 'tigo_cash',
      name: 'Tigo Cash',
      description: 'Paiement mobile Tigo',
      icon: 'mobile',
      available: true,
      popular: false
    },
    {
      id: 'credit_card',
      name: 'Carte bancaire',
      description: 'Visa, Mastercard',
      icon: 'card',
      available: false,
      popular: false
    }
  ]

  const getPaymentIcon = (type) => {
    switch (type) {
      case 'cash':
        return <BanknotesIcon size={24} color="#00CCBB" />
      case 'mobile':
        return <DevicePhoneMobileIcon size={24} color="#00CCBB" />
      case 'card':
        return <CreditCardIcon size={24} color="#00CCBB" />
      default:
        return <BanknotesIcon size={24} color="#00CCBB" />
    }
  }

  return (
    <View className="bg-white rounded-lg shadow-md p-4 mb-4">
      <Text className="text-lg font-bold mb-4">Mode de paiement</Text>
      
      {paymentMethods.map((method) => (
        <TouchableOpacity
          key={method.id}
          onPress={() => method.available && onPaymentSelect(method.id)}
          className={`flex-row items-center p-3 rounded-lg mb-2 border ${
            selectedPayment === method.id
              ? 'border-[#00CCBB] bg-[#00CCBB] bg-opacity-10'
              : method.available
              ? 'border-gray-200 bg-gray-50'
              : 'border-gray-200 bg-gray-100'
          }`}
          disabled={!method.available}
        >
          <View className="mr-3">
            {getPaymentIcon(method.icon)}
          </View>
          
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className={`font-semibold ${method.available ? 'text-gray-800' : 'text-gray-400'}`}>
                {method.name}
              </Text>
              {method.popular && (
                <View className="ml-2 bg-green-100 px-2 py-1 rounded-full">
                  <Text className="text-xs text-green-800 font-medium">Populaire</Text>
                </View>
              )}
              {!method.available && (
                <View className="ml-2 bg-gray-100 px-2 py-1 rounded-full">
                  <Text className="text-xs text-gray-600">Bientôt</Text>
                </View>
              )}
            </View>
            <Text className={`text-sm ${method.available ? 'text-gray-600' : 'text-gray-400'}`}>
              {method.description}
            </Text>
          </View>
          
          {selectedPayment === method.id && (
            <View className="w-6 h-6 rounded-full bg-[#00CCBB] flex items-center justify-center">
              <Text className="text-white text-xs">✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
      
      <View className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <Text className="text-blue-800 font-semibold text-sm mb-1">
          💡 Conseil
        </Text>
        <Text className="text-blue-700 text-sm">
          Le paiement en espèces est recommandé pour éviter les frais supplémentaires et les problèmes de connexion.
        </Text>
      </View>
    </View>
  )
}

export default PaymentOptions 
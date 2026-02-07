import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { BanknotesIcon, CreditCardIcon, DevicePhoneMobileIcon } from 'react-native-heroicons/outline'
import { CheckCircleIcon } from 'react-native-heroicons/solid'
import Badge from '../src/ui/Badge'

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

  const getPaymentIcon = (type, isSelected) => {
    const color = isSelected ? '#7A1E3A' : '#6B7280';
    switch (type) {
      case 'cash':
        return <BanknotesIcon size={22} color={color} />
      case 'mobile':
        return <DevicePhoneMobileIcon size={22} color={color} />
      case 'card':
        return <CreditCardIcon size={22} color={color} />
      default:
        return <BanknotesIcon size={22} color={color} />
    }
  }

  return (
    <View>
      <Text className="text-lg font-bold text-text mb-3">Mode de paiement</Text>

      {paymentMethods.map((method) => {
        const isSelected = selectedPayment === method.id;
        return (
          <TouchableOpacity
            key={method.id}
            onPress={() => method.available && onPaymentSelect(method.id)}
            disabled={!method.available}
            activeOpacity={0.7}
            className={`flex-row items-center p-4 rounded-md mb-2 border ${
              isSelected
                ? 'border-primary bg-primarySoft'
                : method.available
                  ? 'border-border bg-surface'
                  : 'border-border bg-bg'
            }`}
          >
            <View className="mr-3">
              {getPaymentIcon(method.icon, isSelected)}
            </View>

            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className={`font-semibold ${method.available ? 'text-text' : 'text-muted'}`}>
                  {method.name}
                </Text>
                {method.popular && (
                  <View className="ml-2">
                    <Badge variant="popular" label="Populaire" />
                  </View>
                )}
                {!method.available && (
                  <View className="ml-2">
                    <Badge variant="eta" label="Bientôt" />
                  </View>
                )}
              </View>
              <Text className={`text-sm mt-0.5 ${method.available ? 'text-muted' : 'text-muted/50'}`}>
                {method.description}
              </Text>
            </View>

            {isSelected && (
              <CheckCircleIcon size={24} color="#7A1E3A" />
            )}
          </TouchableOpacity>
        );
      })}

      {/* Tip Card */}
      <View className="mt-3 p-3 bg-primarySoft rounded-md border border-primary/10">
        <Text className="text-primary font-semibold text-sm mb-0.5">
          💡 Conseil
        </Text>
        <Text className="text-primary/80 text-sm leading-5">
          Le paiement en espèces est recommandé pour éviter les frais supplémentaires.
        </Text>
      </View>
    </View>
  )
}

export default PaymentOptions

import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import {
  ArrowLeftIcon, BanknotesIcon, DevicePhoneMobileIcon,
  CreditCardIcon, ChevronRightIcon, PlusIcon,
} from 'react-native-heroicons/outline'
import Card from '../src/ui/Card'
import Badge from '../src/ui/Badge'

const WalletScreen = () => {
  const navigation = useNavigation();

  const paymentMethods = [
    {
      id: 'cash',
      name: 'Espèces',
      description: 'Paiement à la livraison',
      icon: <BanknotesIcon size={22} color="#7A1E3A" />,
      active: true,
    },
    {
      id: 'airtel',
      name: 'Airtel Money',
      description: 'Paiement mobile Airtel',
      icon: <DevicePhoneMobileIcon size={22} color="#7A1E3A" />,
      active: true,
    },
    {
      id: 'tigo',
      name: 'Tigo Cash',
      description: 'Paiement mobile Tigo',
      icon: <DevicePhoneMobileIcon size={22} color="#7A1E3A" />,
      active: true,
    },
    {
      id: 'card',
      name: 'Carte bancaire',
      description: 'Visa, Mastercard',
      icon: <CreditCardIcon size={22} color="#6B7280" />,
      active: false,
    },
  ];

  return (
    <SafeAreaView className="bg-bg flex-1">
      {/* Header */}
      <View className="bg-surface flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3" activeOpacity={0.7}>
          <ArrowLeftIcon size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">Portefeuille</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Balance Card */}
        <View className="mx-4 mt-4">
          <Card className="bg-primary border-primary">
            <Text className="text-white/80 font-medium text-sm mb-1">Solde disponible</Text>
            <View className="flex-row items-baseline mb-4">
              <Text className="text-4xl font-bold text-white">0</Text>
              <Text className="text-xl font-bold text-white/80 ml-2">XAF</Text>
            </View>
            <TouchableOpacity
              className="bg-white/20 self-start px-5 py-2.5 rounded-full flex-row items-center"
              activeOpacity={0.7}
            >
              <PlusIcon size={18} color="white" />
              <Text className="text-white font-bold ml-2">Ajouter des fonds</Text>
            </TouchableOpacity>
            <Text className="text-white/50 text-xs mt-3">Recharge bientôt disponible</Text>
          </Card>
        </View>

        {/* Payment Methods */}
        <View className="mx-4 mt-6">
          <Text className="text-lg font-bold text-text mb-3">Moyens de paiement</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              activeOpacity={0.7}
              className={`flex-row items-center p-4 mb-2 rounded-md border ${
                method.active ? 'bg-surface border-border' : 'bg-bg border-border'
              }`}
            >
              <View className="mr-3">{method.icon}</View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className={`font-semibold ${method.active ? 'text-text' : 'text-muted'}`}>
                    {method.name}
                  </Text>
                  {!method.active && (
                    <Badge variant="eta" label="Bientôt" className="ml-2" />
                  )}
                </View>
                <Text className={`text-sm mt-0.5 ${method.active ? 'text-muted' : 'text-muted/50'}`}>
                  {method.description}
                </Text>
              </View>
              <ChevronRightIcon size={18} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Gift Card Section */}
        <View className="mx-4 mt-6">
          <Card className="bg-accentSoft border-accent/20">
            <Text className="text-lg font-bold text-text mb-1">🎁 Cartes cadeaux</Text>
            <Text className="text-muted text-sm mb-3">
              Offrez du crédit Bordeaux Date à vos proches.
            </Text>
            <TouchableOpacity
              className="bg-accent self-start px-4 py-2 rounded-full"
              activeOpacity={0.7}
            >
              <Text className="text-white font-bold text-sm">Bientôt disponible</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalletScreen

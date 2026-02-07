import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { ArrowLeftIcon } from 'react-native-heroicons/outline'

const PromotionsScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView className="bg-bg flex-1">
      <View className="bg-surface flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3" activeOpacity={0.7}>
          <ArrowLeftIcon size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">Promotions</Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-5xl mb-4">🏷️</Text>
        <Text className="text-xl font-bold text-text mb-2">Bientôt disponible</Text>
        <Text className="text-muted text-center text-base leading-6">
          Des offres et promotions exclusives arrivent bientôt. Restez à l'écoute !
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default PromotionsScreen

import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { ArrowLeftIcon, ChatBubbleLeftRightIcon, PhoneIcon, EnvelopeIcon } from 'react-native-heroicons/outline'
import Card from '../src/ui/Card'

const HelpScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView className="bg-bg flex-1">
      <View className="bg-surface flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3" activeOpacity={0.7}>
          <ArrowLeftIcon size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">Aide</Text>
      </View>

      <View className="flex-1 px-4 pt-4">
        <Text className="text-muted text-sm mb-4">
          Besoin d'aide ? Contactez-nous par l'un des moyens suivants.
        </Text>

        <TouchableOpacity activeOpacity={0.7}>
          <Card className="flex-row items-center mb-3">
            <View className="bg-primarySoft p-2.5 rounded-full mr-3">
              <PhoneIcon size={20} color="#7A1E3A" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-text">Appeler le support</Text>
              <Text className="text-sm text-muted">+235 XX XX XX XX</Text>
            </View>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7}>
          <Card className="flex-row items-center mb-3">
            <View className="bg-primarySoft p-2.5 rounded-full mr-3">
              <EnvelopeIcon size={20} color="#7A1E3A" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-text">Envoyer un email</Text>
              <Text className="text-sm text-muted">support@bordeauxdate.td</Text>
            </View>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7}>
          <Card className="flex-row items-center mb-3">
            <View className="bg-primarySoft p-2.5 rounded-full mr-3">
              <ChatBubbleLeftRightIcon size={20} color="#7A1E3A" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-text">WhatsApp</Text>
              <Text className="text-sm text-muted">Bientôt disponible</Text>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default HelpScreen

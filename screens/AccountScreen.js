import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import {
  HeartIcon, ClockIcon, MapPinIcon, ChevronRightIcon,
  UserIcon, CreditCardIcon, GiftIcon, TagIcon,
  LifebuoyIcon, UserGroupIcon, BriefcaseIcon,
} from 'react-native-heroicons/outline'
import Badge from '../src/ui/Badge'

const AccountScreen = () => {
  const navigation = useNavigation();

  const ActionButton = ({ icon, title, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-1 bg-primarySoft p-4 rounded-md items-center mr-2 h-24 justify-center border border-primary/10"
    >
      <View className="mb-2">{icon}</View>
      <Text className="font-bold text-primary text-xs">{title}</Text>
    </TouchableOpacity>
  );

  const MenuItem = ({ icon, title, subtitle, badge, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center py-4 border-b border-border"
    >
      <View className="bg-bg p-2 rounded-full mr-3">{icon}</View>
      <View className="flex-1">
        <Text className="text-text font-medium text-base">{title}</Text>
        {subtitle && <Text className="text-muted text-xs mt-0.5">{subtitle}</Text>}
      </View>
      {badge && <View className="mr-2">{badge}</View>}
      <ChevronRightIcon size={18} color="#6B7280" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView className="flex-1 px-4 pt-2" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6 mt-2">
          <Text className="text-2xl font-bold text-text tracking-tight flex-1 mr-4">Issa Abdramane</Text>
          <View className="bg-primarySoft rounded-full p-2.5 border border-primary/20">
            <UserIcon size={28} color="#7A1E3A" />
          </View>
        </View>

        {/* Action Grid */}
        <View className="flex-row mb-6">
          <ActionButton
            icon={<HeartIcon size={26} color="#7A1E3A" />}
            title="Favoris"
            onPress={() => navigation.navigate('Favorites')}
          />
          <ActionButton
            icon={<CreditCardIcon size={26} color="#7A1E3A" />}
            title="Wallet"
            onPress={() => navigation.navigate('Wallet')}
          />
          <ActionButton
            icon={<ClockIcon size={26} color="#7A1E3A" />}
            title="Commandes"
            onPress={() => navigation.navigate('Orders')}
          />
        </View>

        {/* Menu List */}
        <View>
          <MenuItem
            icon={<UserGroupIcon size={22} color="#6B7280" />}
            title="Profil familial"
            subtitle="Gérez un profil familial."
            onPress={() => {}}
          />
          <MenuItem
            icon={<MapPinIcon size={22} color="#6B7280" />}
            title="Trajets"
            onPress={() => navigation.navigate('Rides')}
          />
          <MenuItem
            icon={<TagIcon size={22} color="#6B7280" />}
            title="Promotions"
            onPress={() => navigation.navigate('Promotions')}
          />
          <MenuItem
            icon={<GiftIcon size={22} color="#6B7280" />}
            title="Envoi de cadeau"
            onPress={() => {}}
          />
          <MenuItem
            icon={<LifebuoyIcon size={22} color="#6B7280" />}
            title="Aide"
            onPress={() => navigation.navigate('Help')}
          />
          <MenuItem
            icon={<UserGroupIcon size={22} color="#6B7280" />}
            title="Groupes enregistrés"
            badge={<Badge variant="info" label="NOUVEAU" />}
            onPress={() => {}}
          />
          <MenuItem
            icon={<BriefcaseIcon size={22} color="#6B7280" />}
            title="Profil professionnel"
            subtitle="Automatiser les frais de déplacement..."
            onPress={() => {}}
          />
        </View>

        <TouchableOpacity className="py-4 border-b border-border" activeOpacity={0.7}>
          <Text className="text-text font-medium text-base">Confidentialité</Text>
        </TouchableOpacity>
        <TouchableOpacity className="py-4" activeOpacity={0.7}>
          <Text className="text-text font-medium text-base">Accessibilité</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tab bar provided by Tab.Navigator */}
    </SafeAreaView>
  );
};

export default AccountScreen

import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { BlurView } from 'expo-blur'
import {
  HomeIcon, MapPinIcon, ShoppingCartIcon, UserIcon, MagnifyingGlassIcon,
} from 'react-native-heroicons/outline'
import {
  HomeIcon as HomeIconSolid,
  UserIcon as UserIconSolid,
} from 'react-native-heroicons/solid'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { selectBasketItems } from '../features/basketSlice'

const NavItem = ({ icon, activeIcon, label, route, currentRoute, onPress, badge }) => {
  const isActive = currentRoute === route;
  const Icon = isActive && activeIcon ? activeIcon : icon;
  return (
    <TouchableOpacity onPress={onPress} className="items-center justify-center w-12 relative">
      <Icon size={24} color={isActive ? '#7A1E3A' : '#6B7280'} />
      {badge > 0 && (
        <View className="absolute -top-1 -right-0.5 bg-primary h-4 min-w-[16px] rounded-full items-center justify-center px-1">
          <Text className="text-white text-[9px] font-bold">{badge}</Text>
        </View>
      )}
      <Text className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-primary' : 'text-muted'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const CustomNavBar = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const currentRoute = route.name;
  const basketItems = useSelector(selectBasketItems);

  return (
    <View className="absolute bottom-0 w-full z-50">
      {/* Floating blur container — iOS style */}
      <BlurView
        intensity={55}
        tint="light"
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: 'rgba(229,231,235,0.7)',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <View className="px-5 py-3 flex-row items-center justify-between">
          <NavItem
            icon={HomeIcon}
            activeIcon={HomeIconSolid}
            label="Accueil"
            route="Home"
            currentRoute={currentRoute}
            onPress={() => navigation.navigate('Home')}
          />

          <NavItem
            icon={MapPinIcon}
            label="Lieux"
            route="Map"
            currentRoute={currentRoute}
            onPress={() => { }}
          />

          {/* Center Search */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.7}
            className="bg-bg rounded-full flex-row items-center h-10 px-4 border border-border"
            style={{ minWidth: 110 }}
          >
            <MagnifyingGlassIcon size={18} color="#6B7280" />
            <Text className="text-muted font-medium text-sm ml-2">Rechercher</Text>
          </TouchableOpacity>

          <NavItem
            icon={ShoppingCartIcon}
            label="Panier"
            route="Basket"
            currentRoute={currentRoute}
            onPress={() => navigation.navigate('Basket')}
            badge={basketItems.length}
          />

          <NavItem
            icon={UserIcon}
            activeIcon={UserIconSolid}
            label="Compte"
            route="Account"
            currentRoute={currentRoute}
            onPress={() => navigation.navigate('Account')}
          />
        </View>
      </BlurView>
    </View>
  );
};

export default CustomNavBar

import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { BlurView } from 'expo-blur'
import {
  HomeIcon, ShoppingBagIcon, UserIcon, MagnifyingGlassIcon,
} from 'react-native-heroicons/outline'
import {
  HomeIcon as HomeIconSolid,
  UserIcon as UserIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
} from 'react-native-heroicons/solid'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { selectBasketRestaurantCount } from '../features/basketSlice'

/**
 * CustomNavBar — works in two modes:
 *   1. As a Bottom Tab bar: receives `state` and `navigation` props from Tab.Navigator
 *   2. Standalone: rendered directly inside a screen (e.g. PaniersScreen)
 *
 * In standalone mode, "active" state is derived from the current route name.
 */
const CustomNavBar = ({ state: tabState, navigation: tabNavigation }) => {
  const rootNavigation = useNavigation()
  const restaurantCount = useSelector(selectBasketRestaurantCount)

  // Determine which tab is active
  const activeTabName = tabState
    ? tabState.routes[tabState.index]?.name
    : null

  const isTabActive = (name) => activeTabName === name

  const goToTab = (name) => {
    if (tabNavigation) {
      tabNavigation.navigate(name)
    } else {
      rootNavigation.navigate('MainTabs', { screen: name })
    }
  }

  const goToPaniers = () => {
    if (tabNavigation) {
      rootNavigation.navigate('Paniers')
    } else {
      rootNavigation.navigate('Paniers')
    }
  }

  const goToSearch = () => rootNavigation.navigate('Search')

  return (
    <View className="absolute bottom-0 w-full z-50">
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
          {/* Accueil */}
          <NavItem
            icon={HomeIcon}
            activeIcon={HomeIconSolid}
            label="Accueil"
            isActive={isTabActive('Home')}
            onPress={() => goToTab('Home')}
          />

          {/* Search — centre pill */}
          <TouchableOpacity
            onPress={goToSearch}
            activeOpacity={0.7}
            className="bg-bg rounded-full flex-row items-center h-10 px-4 border border-border"
            style={{ minWidth: 110 }}
          >
            <MagnifyingGlassIcon size={18} color="#6B7280" />
            <Text className="text-muted font-medium text-sm ml-2">Rechercher</Text>
          </TouchableOpacity>

          {/* Panier */}
          <NavItem
            icon={ShoppingBagIcon}
            activeIcon={ShoppingBagIconSolid}
            label="Panier"
            isActive={false}
            onPress={goToPaniers}
            badge={restaurantCount}
          />

          {/* Compte */}
          <NavItem
            icon={UserIcon}
            activeIcon={UserIconSolid}
            label="Compte"
            isActive={isTabActive('Account')}
            onPress={() => goToTab('Account')}
          />
        </View>
      </BlurView>
    </View>
  )
}

const NavItem = ({ icon: Icon, activeIcon, label, isActive, onPress, badge }) => {
  const ActiveIcon = isActive && activeIcon ? activeIcon : Icon
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="items-center justify-center w-12 relative"
    >
      <ActiveIcon size={24} color={isActive ? '#7A1E3A' : '#6B7280'} />
      {badge > 0 && (
        <View className="absolute -top-1 -right-0.5 bg-primary h-4 min-w-[16px] rounded-full items-center justify-center px-1">
          <Text className="text-white text-[9px] font-bold">{badge}</Text>
        </View>
      )}
      <Text
        className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-primary' : 'text-muted'}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}

export default CustomNavBar

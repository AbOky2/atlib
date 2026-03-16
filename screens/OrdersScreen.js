import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { ArrowLeftIcon, ChevronRightIcon, ClockIcon } from 'react-native-heroicons/outline'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectAuthToken } from '../features/authSlice'
import { formatCurrency } from '../utils/formatCurrency'
import { ORDER_STATUS_CONFIG } from '../constants/orderStatuses'

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'

const formatDate = (dateStr) => {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const formatItems = (items) => {
  if (!Array.isArray(items)) return ''
  return items.map((i) => `${i.qty || 1}x ${i.name}`).join(', ')
}

export default function OrdersScreen() {
  const navigation = useNavigation()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const token = useSelector(selectAuthToken)

  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchOrders = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/customer/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const data = await res.json()
      setOrders(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (isAuthenticated) fetchOrders()
  }, [isAuthenticated, fetchOrders])

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <SafeAreaView className="bg-bg flex-1">
        <View className="bg-surface flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3" activeOpacity={0.7}>
            <ArrowLeftIcon size={22} color="#111827" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-text">Mes Commandes</Text>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <View className="bg-[#f3f4f6] p-5 rounded-full mb-5">
            <ClockIcon size={40} color="#9ca3af" />
          </View>
          <Text className="text-xl font-bold text-[#111] mb-2 text-center">
            Suivez vos commandes
          </Text>
          <Text className="text-sm text-[#6b7280] text-center mb-8 leading-5">
            Connectez-vous pour retrouver l'historique de toutes vos commandes.
          </Text>
          <TouchableOpacity
            className="bg-[#111] rounded-[14px] py-4 px-10"
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text className="text-white text-[15px] font-bold">Se connecter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="mt-3.5"
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.7}
          >
            <Text className="text-[#6b7280] text-sm">
              Pas de compte ? <Text className="font-bold text-[#111]">Créer un compte</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── Authenticated ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="bg-bg flex-1">
      <View className="bg-surface flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3" activeOpacity={0.7}>
          <ArrowLeftIcon size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">Mes Commandes</Text>
      </View>

      {isLoading && orders.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-[#e53e3e] text-center mb-4">{error}</Text>
          <TouchableOpacity onPress={fetchOrders} activeOpacity={0.8}
            className="bg-[#111] rounded-xl py-3 px-6">
            <Text className="text-white font-semibold">Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchOrders} tintColor="#111" />
          }
        >
          {orders.length === 0 ? (
            <View className="items-center justify-center py-20 px-8">
              <View className="bg-[#f3f4f6] p-5 rounded-full mb-5">
                <ClockIcon size={40} color="#9ca3af" />
              </View>
              <Text className="text-xl font-bold text-[#111] mb-2">
                Aucune commande
              </Text>
              <Text className="text-sm text-[#6b7280] text-center">
                Vos commandes passées apparaîtront ici.
              </Text>
            </View>
          ) : (
            <View className="pt-4">
              {orders.map((order) => {
                const statusCfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING
                return (
                  <TouchableOpacity
                    key={order.id}
                    activeOpacity={0.85}
                    className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm shadow-black/5 elevation-2"
                  >
                    <View className="flex-row items-center mb-2.5">
                      <View className="flex-1">
                        <Text className="text-base font-bold text-[#111]">
                          {order.restaurant_name || 'Restaurant'}
                        </Text>
                        <Text className="text-xs text-[#9ca3af] mt-0.5">
                          {formatDate(order.created_at)}
                        </Text>
                      </View>
                      <ChevronRightIcon size={18} color="#9ca3af" />
                    </View>

                    <Text className="text-[13px] text-[#6b7280] mb-2.5" numberOfLines={2}>
                      {formatItems(order.items)}
                    </Text>

                    <View className="flex-row items-center justify-between pt-2.5 border-t border-[#f3f4f6]">
                      <Text className="text-[15px] font-bold text-[#111]">
                        {formatCurrency(order.total_xaf, 'XAF')}
                      </Text>
                      <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: statusCfg.bg }}>
                        <Text className="text-xs font-bold" style={{ color: statusCfg.color }}>
                          {statusCfg.label}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

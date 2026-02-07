import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { ArrowLeftIcon, ChevronRightIcon, ClockIcon } from 'react-native-heroicons/outline'
import { useSelector } from 'react-redux'
import { selectOrderHistory } from '../features/orderSlice'
import { ORDER_STATUS_CONFIG } from '../src/data/mockOrders'
import { formatCurrency } from '../utils/formatCurrency'

const OrdersScreen = () => {
  const navigation = useNavigation();
  const orders = useSelector(selectOrderHistory);

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView className="bg-bg flex-1">
      {/* Header */}
      <View className="bg-surface flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3" activeOpacity={0.7}>
          <ArrowLeftIcon size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">Mes Commandes</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {orders.length === 0 ? (
          <View className="items-center justify-center py-24 px-8">
            <View className="bg-primarySoft p-5 rounded-full mb-5">
              <ClockIcon size={40} color="#7A1E3A" />
            </View>
            <Text className="text-xl font-bold text-text mb-2 text-center">
              Aucune commande
            </Text>
            <Text className="text-muted text-center text-base">
              Vos commandes apparaîtront ici.
            </Text>
          </View>
        ) : (
          <View className="pt-4">
            {orders.map((order) => {
              const statusCfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
              return (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                  activeOpacity={0.85}
                  className="bg-surface mx-4 mb-3 rounded-md border border-border p-4"
                >
                  <View className="flex-row items-center mb-3">
                    {order.restaurantImage && (
                      <Image
                        source={{ uri: order.restaurantImage }}
                        className="h-12 w-12 rounded-sm bg-bg mr-3"
                      />
                    )}
                    <View className="flex-1">
                      <Text className="text-base font-bold text-text">
                        {order.restaurantName || 'Restaurant'}
                      </Text>
                      <Text className="text-xs text-muted mt-0.5">
                        {formatDate(order.createdAt)}
                      </Text>
                    </View>
                    <ChevronRightIcon size={18} color="#6B7280" />
                  </View>

                  {/* Items summary */}
                  <Text className="text-sm text-muted mb-2" numberOfLines={2}>
                    {order.items?.map((item) => `${item.qty || item.length || 1}x ${item.name}`).join(', ')}
                  </Text>

                  {/* Bottom row: total + status */}
                  <View className="flex-row items-center justify-between pt-2 border-t border-border">
                    <Text className="text-base font-bold text-text">
                      {formatCurrency(order.totalXaf || order.total, 'XAF')}
                    </Text>
                    <View
                      className="px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: statusCfg.bgColor }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: statusCfg.color }}
                      >
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrdersScreen

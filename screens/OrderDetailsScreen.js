import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { ArrowLeftIcon, MapPinIcon } from 'react-native-heroicons/outline'
import { useSelector } from 'react-redux'
import { selectOrderHistory } from '../features/orderSlice'
import { ORDER_STATUS_CONFIG } from '../src/data/mockOrders'
import { formatCurrency } from '../utils/formatCurrency'
import Card from '../src/ui/Card'

const PAYMENT_LABELS = {
  cash: 'Espèces',
  airtel_money: 'Airtel Money',
  tigo_cash: 'Tigo Cash',
  credit_card: 'Carte bancaire',
};

const OrderDetailsScreen = () => {
  const navigation = useNavigation();
  const { params } = useRoute();
  const orders = useSelector(selectOrderHistory);
  const order = orders.find((o) => o.id === params?.orderId);

  if (!order) {
    return (
      <SafeAreaView className="bg-bg flex-1 items-center justify-center">
        <Text className="text-muted text-base">Commande introuvable</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-primary font-bold">Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusCfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
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
        <View className="flex-1">
          <Text className="text-lg font-bold text-text">Commande {order.id}</Text>
          <Text className="text-xs text-muted">{formatDate(order.createdAt)}</Text>
        </View>
        <View
          className="px-2.5 py-1 rounded-full"
          style={{ backgroundColor: statusCfg.bgColor }}
        >
          <Text className="text-xs font-bold" style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Restaurant info */}
        <View className="mx-4 mt-4">
          <Card className="flex-row items-center">
            {order.restaurantImage && (
              <Image
                source={{ uri: order.restaurantImage }}
                className="h-14 w-14 rounded-sm bg-bg mr-3"
              />
            )}
            <View className="flex-1">
              <Text className="text-base font-bold text-text">{order.restaurantName}</Text>
              {order.deliveryAddress && (
                <View className="flex-row items-center mt-1">
                  <MapPinIcon size={14} color="#6B7280" />
                  <Text className="text-sm text-muted ml-1">{order.deliveryAddress}</Text>
                </View>
              )}
            </View>
          </Card>
        </View>

        {/* Items */}
        <View className="mx-4 mt-4">
          <Text className="text-lg font-bold text-text mb-3">Articles</Text>
          <Card padded={false}>
            {order.items?.map((item, index) => (
              <View
                key={index}
                className={`flex-row items-center px-4 py-3 ${
                  index < order.items.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <View className="bg-primarySoft px-2 py-0.5 rounded-sm mr-3">
                  <Text className="text-primary font-bold text-sm">
                    {item.qty || item.length || 1}x
                  </Text>
                </View>
                <Text className="flex-1 font-medium text-text">{item.name}</Text>
                <Text className="text-muted font-medium text-sm">
                  {formatCurrency(item.price, 'XAF')}
                </Text>
              </View>
            ))}
          </Card>
        </View>

        {/* Payment & Summary */}
        <View className="mx-4 mt-4">
          <Card>
            <Text className="text-lg font-bold text-text mb-3">Résumé</Text>

            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Sous-total</Text>
              <Text className="text-text font-medium">
                {formatCurrency(order.subtotalXaf || order.subtotal, 'XAF')}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Frais de livraison</Text>
              <Text className="text-text font-medium">
                {formatCurrency(order.deliveryFeeXaf || order.deliveryFee || 0, 'XAF')}
              </Text>
            </View>
            <View className="border-t border-border pt-2 mt-1 flex-row justify-between">
              <Text className="text-base font-bold text-text">Total</Text>
              <Text className="text-base font-extrabold text-primary">
                {formatCurrency(order.totalXaf || order.total, 'XAF')}
              </Text>
            </View>

            <View className="border-t border-border pt-3 mt-3 flex-row justify-between">
              <Text className="text-muted">Paiement</Text>
              <Text className="text-text font-medium">
                {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderDetailsScreen

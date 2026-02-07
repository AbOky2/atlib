import { View, Text, TouchableOpacity, Image, ScrollView, Alert, Linking } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import React, { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { selectCurrentOrder, selectOrderStatuses } from '../features/orderSlice'
import { selectRestaurant } from '../features/restaurantSlice'
import { selectCurrentAddress } from '../features/addressSlice'
import {
  XMarkIcon, PhoneIcon, MapPinIcon, ChatBubbleLeftRightIcon,
  ClockIcon,
} from 'react-native-heroicons/outline'
import { CheckCircleIcon as CheckCircleSolid } from 'react-native-heroicons/solid'
import * as Progress from 'react-native-progress'
import Card from '../src/ui/Card'

const STEPS = [
  { key: 'PENDING', label: 'Commande reçue', icon: '📝' },
  { key: 'ACCEPTED', label: 'Acceptée', icon: '✅' },
  { key: 'PREPARING', label: 'En préparation', icon: '👨‍🍳' },
  { key: 'READY', label: 'Prête', icon: '📦' },
  { key: 'OUT_FOR_DELIVERY', label: 'En livraison', icon: '🏍️' },
  { key: 'DELIVERED', label: 'Livrée', icon: '🎉' },
];

const STATUS_ORDER = STEPS.map((s) => s.key);

const OrderTrackingScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const currentOrder = useSelector(selectCurrentOrder);
  const orderStatuses = useSelector(selectOrderStatuses);
  const restaurant = useSelector(selectRestaurant);
  const deliveryAddress = useSelector(selectCurrentAddress);
  useEffect(() => {
    // Keep alive for real-time updates
    const t = setInterval(() => {}, 60000);
    return () => clearInterval(t);
  }, []);

  const getProgress = (status) => {
    const idx = STATUS_ORDER.indexOf(status);
    return (idx + 1) / STATUS_ORDER.length;
  };

  const handleCall = (phone, label) => {
    Alert.alert('Appeler', `Appeler ${label} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Appeler', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  // No order fallback
  if (!currentOrder) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
        <View className="bg-primarySoft p-6 rounded-full mb-5">
          <ClockIcon size={44} color="#7A1E3A" />
        </View>
        <Text className="text-xl font-bold text-text mb-2">Aucune commande active</Text>
        <Text className="text-muted text-center mb-6">Passez votre première commande !</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
          className="bg-primary px-8 py-3.5 rounded-md"
        >
          <Text className="text-white font-bold text-base">Retour à l'accueil</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusIdx = STATUS_ORDER.indexOf(currentOrder.status);
  const progress = getProgress(currentOrder.status);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* ═══ Header ═══ */}
      <View
        className="bg-surface flex-row items-center justify-between px-4 pb-3 border-b border-border"
        style={{ paddingTop: Math.max(12, insets.top) }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          className="p-1.5 bg-bg rounded-full border border-border"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <XMarkIcon size={20} color="#111827" />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Text className="text-base font-bold text-text">Suivi de commande</Text>
          <View className="ml-2 h-2 w-2 rounded-full bg-danger" />
        </View>
        <TouchableOpacity
          onPress={() => handleCall(restaurant.phone || '66123456', restaurant.title)}
          activeOpacity={0.7}
          className="p-1.5 bg-bg rounded-full border border-border"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <PhoneIcon size={20} color="#7A1E3A" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ═══ Status Hero ═══ */}
        <View className="mx-4 mt-4">
          <Card className="bg-surface">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-muted text-xs font-medium mb-1">
                  Commande #{currentOrder.id?.slice(-6)}
                </Text>
                <Text className="text-text text-xl font-extrabold">
                  {orderStatuses[currentOrder.status]}
                </Text>
              </View>
              <View className="bg-primarySoft px-3 py-2 rounded-full items-center">
                <Text className="text-primary font-bold text-base">
                  {currentOrder.estimatedDeliveryTime}
                </Text>
                <Text className="text-primary/70 text-[10px]">estimé</Text>
              </View>
            </View>

            <Progress.Bar
              progress={progress}
              color="#7A1E3A"
              unfilledColor="#E5E7EB"
              borderWidth={0}
              height={7}
              width={null}
              borderRadius={4}
            />
          </Card>
        </View>

        {/* ═══ Note Card (visual only) ═══ */}
        <View className="mx-4 mt-4">
          <Card className="bg-bg border-border/80">
            <Text className="text-muted text-sm">Ajouter une note pour le livreur...</Text>
          </Card>
        </View>

        {/* ═══ Steps Timeline ═══ */}
        <View className="mx-4 mt-4">
          <Card>
            <Text className="text-base font-bold text-text mb-4">État de la commande</Text>
            {STEPS.map((step, idx) => {
              const isCurrent = currentOrder.status === step.key;
              const isCompleted = statusIdx > idx;
              const isLast = idx === STEPS.length - 1;

              return (
                <View key={step.key} className="flex-row">
                  {/* Timeline dot + line */}
                  <View className="items-center mr-3" style={{ width: 28 }}>
                    {isCompleted ? (
                      <CheckCircleSolid size={24} color="#16A34A" />
                    ) : isCurrent ? (
                      <View className="h-6 w-6 rounded-full bg-primary items-center justify-center">
                        <View className="h-2.5 w-2.5 rounded-full bg-white" />
                      </View>
                    ) : (
                      <View className="h-6 w-6 rounded-full bg-bg border-2 border-border" />
                    )}
                    {!isLast && (
                      <View className={`w-0.5 flex-1 my-1 ${
                        isCompleted ? 'bg-success' : 'bg-border'
                      }`} style={{ minHeight: 24 }} />
                    )}
                  </View>

                  {/* Label */}
                  <View className={`flex-1 ${!isLast ? 'pb-4' : ''}`}>
                    <View className="flex-row items-center">
                      <Text className="text-lg mr-2">{step.icon}</Text>
                      <Text className={`text-sm font-semibold ${
                        isCurrent ? 'text-primary' : isCompleted ? 'text-text' : 'text-muted'
                      }`}>
                        {step.label}
                      </Text>
                    </View>
                    {isCurrent && (
                      <Text className="text-xs text-muted mt-0.5 ml-7 italic">En cours...</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        </View>

        {/* ═══ Restaurant ═══ */}
        <View className="mx-4 mt-4">
          <Card className="flex-row items-center">
            <Image
              source={{ uri: restaurant.imgUrl || 'https://via.placeholder.com/60' }}
              className="w-12 h-12 rounded-md bg-bg mr-3"
            />
            <View className="flex-1">
              <Text className="font-bold text-text">{restaurant.title}</Text>
              <Text className="text-sm text-muted" numberOfLines={1}>{restaurant.address}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCall(restaurant.phone || '66123456', restaurant.title)}
              activeOpacity={0.7}
              className="bg-primarySoft px-3 py-2 rounded-md"
            >
              <Text className="text-primary font-bold text-sm">Appeler</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* ═══ Delivery Address ═══ */}
        <View className="mx-4 mt-4">
          <Card>
            <View className="flex-row items-start">
              <View className="bg-primarySoft p-2 rounded-full mr-3">
                <MapPinIcon size={18} color="#7A1E3A" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-text mb-0.5">Adresse de livraison</Text>
                <Text className="text-sm text-muted">
                  {deliveryAddress.zone}{deliveryAddress.landmark ? ` — ${deliveryAddress.landmark}` : ''}
                </Text>
                {deliveryAddress.description ? (
                  <Text className="text-sm text-muted/70 mt-0.5">{deliveryAddress.description}</Text>
                ) : null}
                {deliveryAddress.phoneNumber ? (
                  <Text className="text-sm text-primary font-semibold mt-1.5">
                    📞 {deliveryAddress.phoneNumber}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        </View>

        {/* ═══ Contact Tip ═══ */}
        <View className="mx-4 mt-4">
          <Card className="bg-accentSoft border-accent/20">
            <View className="flex-row items-center mb-1.5">
              <ChatBubbleLeftRightIcon size={18} color="#C8A24A" />
              <Text className="text-accent font-bold text-sm ml-2">Contact livraison</Text>
            </View>
            <Text className="text-accent/80 text-sm leading-5">
              Le livreur vous contactera au {deliveryAddress.phoneNumber || 'numéro enregistré'} avant la livraison.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderTrackingScreen

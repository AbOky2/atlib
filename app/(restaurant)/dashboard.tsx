import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui/Button";
import { Clock } from "lucide-react-native";
import { useRestaurantOrders, useMyRestaurantId, updateOrderStatus, ORDER_ERRORS } from "../../src/hooks/useSupabase";
import { statusMeta, isOrderStatus, type OrderStatus } from "../../src/lib/orderStatus";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from 'expo-haptics';

export default function RestaurantDashboard() {
    // The restaurant id comes from the `my_restaurant_id()` RPC — orders are keyed by
    // restaurant_id (a restaurants.id), NOT the auth user id, so filtering by user.id
    // showed nothing and broke sync with the client tracking screen.
    const { data: restaurantId } = useMyRestaurantId();
    const { data: orders, isLoading } = useRestaurantOrders(restaurantId ?? undefined);
    const queryClient = useQueryClient();

    const handleUpdateStatus = async (order: any, newStatus: OrderStatus) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Optimistic update so the admin UI reflects the change instantly.
            queryClient.setQueryData(['restaurant-orders', restaurantId], (old: any) =>
                Array.isArray(old) ? old.map((o: any) => (o.id === order.id ? { ...o, status: newStatus } : o)) : old,
            );
            // Conditional update through the state machine: rejected with
            // STATUS_CONFLICT if the order moved concurrently (e.g. cancelled).
            await updateOrderStatus(order.id, newStatus, isOrderStatus(order.status) ? order.status : undefined);
            await queryClient.invalidateQueries({ queryKey: ['restaurant-orders', restaurantId] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            if (error?.message === ORDER_ERRORS.STATUS_CONFLICT) {
                console.warn('[dashboard] status moved concurrently, resyncing');
            } else {
                console.error("Erreur lors de la mise à jour :", error);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            queryClient.invalidateQueries({ queryKey: ['restaurant-orders', restaurantId] });
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#0a0a0a]">
            <View className="px-6 py-6 border-b border-[#1c1b1b]">
                <Text className="font-manrope text-3xl font-black text-white tracking-tighter">Tableau de bord</Text>
                <Text className="font-inter text-[#a1a1aa] mt-1">Gestion des commandes • Temps réel</Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#FF5733" />
                </View>
            ) : (
                <ScrollView className="flex-1 px-6 mt-6" showsVerticalScrollIndicator={false}>
                    {!orders || orders.length === 0 ? (
                        <View className="items-center justify-center mt-20">
                            <Clock color="#444" size={48} />
                            <Text className="text-white font-manrope font-bold text-xl mt-4">Aucune commande</Text>
                            <Text className="text-[#a1a1aa] font-inter text-center mt-2">Les nouvelles commandes apparaîtront ici.</Text>
                        </View>
                    ) : (
                        orders.map((order: any) => {
                            const meta = statusMeta(order.status);
                            return (
                            <View key={order.id} className="bg-[#1c1b1b] rounded-3xl p-6 mb-5 border border-white/5">
                                <View className="flex-row justify-between items-start mb-4">
                                    <View>
                                        <Text className="font-manrope font-black text-xl text-white tracking-tight">Commande #{order.id.slice(0, 5).toUpperCase()}</Text>
                                        <View
                                            className="px-2 py-1 rounded-md self-start mt-2"
                                            style={{ backgroundColor: meta.tint }}
                                        >
                                            <Text
                                                className="text-[10px] font-bold uppercase tracking-wider"
                                                style={{ color: meta.color }}
                                            >{meta.label}</Text>
                                        </View>
                                    </View>
                                    <Text className="font-inter text-xs text-[#a1a1aa]">
                                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>

                                <View className="mb-6 bg-black/40 p-4 rounded-2xl border border-white/5">
                                    <Text className="font-inter text-[#a1a1aa] text-sm mb-1">Client: <Text className="text-white font-bold">{order.customer_name}</Text></Text>
                                    <Text className="font-inter text-[#a1a1aa] text-sm mb-3">Téléphone: <Text className="text-white font-bold">{order.customer_phone}</Text></Text>

                                    <View className="h-px bg-white/10 w-full mb-3" />

                                    {order.order_items?.map((item: any) => (
                                        <Text key={item.id} className="font-inter text-white text-sm">
                                            {item.qty}x <Text className="text-[#a1a1aa]">{item.name}</Text>
                                        </Text>
                                    ))}
                                </View>

                                <View className="flex-row gap-3">
                                    {order.status === 'PENDING' && (
                                        <Button label="Accepter" className="flex-1 bg-[#FF5733]" onPress={() => handleUpdateStatus(order, 'ACCEPTED')} />
                                    )}
                                    {order.status === 'ACCEPTED' && (
                                        <Button label="Commencer la préparation" className="flex-1 bg-[#FF5733]" onPress={() => handleUpdateStatus(order, 'PREPARING')} />
                                    )}
                                    {order.status === 'PREPARING' && (
                                        <Button label="Marquer prête" className="flex-1 bg-white" onPress={() => handleUpdateStatus(order, 'READY')} />
                                    )}
                                    {order.status === 'READY' && (
                                        <Button label="Expédier" className="flex-1 bg-white" onPress={() => handleUpdateStatus(order, 'OUT_FOR_DELIVERY')} />
                                    )}
                                    {order.status === 'OUT_FOR_DELIVERY' && (
                                        <Button label="Marquer livré" className="flex-1 bg-green-600" onPress={() => handleUpdateStatus(order, 'DELIVERED')} />
                                    )}
                                </View>
                            </View>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

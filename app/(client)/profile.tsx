import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Award, Heart, Wallet, HelpCircle, Settings, Tag, Gift, ChevronRight, Package, MessageSquare } from 'lucide-react-native';

import { useAuthStore } from '../../src/store/authStore';
import { useCartStore } from '../../src/store/cartStore';
import { useUserOrders } from '../../src/hooks/useSupabase';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { ScreenHeader, useHeaderOffset } from '../../src/components/ScreenHeader';
import { shadowSoft } from '../../src/lib/elevation';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const signOut = useAuthStore(state => state.signOut);
    const user = useAuthStore(state => state.user);
    const showToast = useCartStore(state => state.showToast);
    const showDialog = useCartStore(state => state.showDialog);

    // Fetch orders count for dynamic stats
    const { data: userOrders } = useUserOrders(user?.id);
    const orderCount = userOrders?.length || 0;
    const points = orderCount * 10;
    const initial = (user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase();

    const handleLogout = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDialog({
            title: "Déconnexion",
            message: "Êtes-vous sûr de vouloir vous déconnecter ?",
            confirmText: "Déconnexion",
            cancelText: "Annuler",
            destructive: true,
            onConfirm: () => {
                signOut();
                router.replace('/(client)/home');
            }
        });
    };

    const handleFeatureAlert = (feature: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showToast(`La fonctionnalité "${feature}" sera bientôt ajoutée.`, 'info');
    };

    const handleHelp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDialog({
            title: "Service Client",
            message: "Appuyez sur Confirmer pour nous écrire sur WhatsApp.",
            confirmText: "Ouvrir WhatsApp",
            cancelText: "Annuler",
            onConfirm: () => {
                Linking.openURL('whatsapp://send?phone=+23566000000&text=Bonjour,%20j%27ai%20besoin%20d%27aide%20avec%20Chad%20Delivery.');
            }
        });
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title="Profil"
                bordered={false}
                right={
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/(client)/notifications');
                        }}
                        className="w-10 h-10 items-center justify-center bg-surface-container-low rounded-full active:scale-95"
                    >
                        <Bell color="#1c1b1b" size={20} />
                    </Pressable>
                }
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: headerOffset + 12,
                    paddingBottom: insets.bottom + 120
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="px-6">
                    {/* Profile Header Section */}
                    <View className="flex-row items-center justify-between mb-11">
                        <View className="flex-row items-center gap-4 flex-1">
                            <View className="w-14 h-14 rounded-full bg-[#1c1b1b] items-center justify-center">
                                <Text className="text-2xl font-title text-white">{initial}</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-4xl font-display tracking-tight text-ink">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}</Text>
                                <View className="flex-row items-center px-3 py-1 bg-[#1c1b1b] rounded-full gap-1.5 self-start mt-2">
                                    <Award color="#fff" size={14} />
                                    <Text className="text-[10px] font-label tracking-[0.08em] uppercase text-white">Premium</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Stats Grid (Bento Style) */}
                    <View className="flex-row gap-4 mb-11">
                        <View className="flex-1 bg-white p-6 rounded-sheet flex-col justify-between h-32 border border-hairline" style={shadowSoft}>
                            <Text className="text-[10px] font-label tracking-[0.08em] text-ink-faint uppercase">Points</Text>
                            <Text className="text-3xl font-title text-ink">{new Intl.NumberFormat().format(points)}</Text>
                        </View>
                        <View className="flex-1 bg-white p-6 rounded-sheet flex-col justify-between h-32 border border-hairline" style={shadowSoft}>
                            <Text className="text-[10px] font-label tracking-[0.08em] text-ink-faint uppercase">Commandes</Text>
                            <Text className="text-3xl font-title text-ink">{orderCount}</Text>
                        </View>
                    </View>

                    {/* Referral Banner */}
                    <View className="mb-11 relative bg-[#FF5733] p-8 rounded-sheet overflow-hidden">
                        <View className="relative z-10 w-2/3">
                            <Text className="text-2xl font-title tracking-tight mb-2 leading-tight text-white">Partagez l'expérience</Text>
                            <Text className="text-sm font-label opacity-90 mb-5 text-white">Offrez 5 000 F à vos proches et recevez 3 000 F par parrainage.</Text>
                            <Pressable onPress={() => handleFeatureAlert('Parrainage')} className="bg-white px-6 py-3 rounded-full active:scale-95 self-start">
                                <Text className="text-[#FF5733] text-[10px] font-labelbold tracking-[0.08em] uppercase">Inviter des amis</Text>
                            </Pressable>
                        </View>
                        {/* Abstract Graphic */}
                        <View className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full" />
                        <View className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
                            <Gift color="#fff" size={100} />
                        </View>
                    </View>

                    {/* Settings List */}
                    <View className="mb-12">
                        <Text className="px-2 text-[10px] font-label tracking-[0.08em] text-ink-faint uppercase mb-4">Compte</Text>

                        <View className="flex-col gap-2">
                            <SettingItem icon={<Heart color="#1c1b1b" size={20} />} label="Favoris" onPress={() => router.push('/(client)/favorites')} />
                            <SettingItem icon={<Package color="#1c1b1b" size={20} />} label="Mes commandes" onPress={() => router.push('/(client)/orders')} />
                            <SettingItem icon={<MessageSquare color="#1c1b1b" size={20} />} label="Avis" onPress={() => handleFeatureAlert('Avis')} />
                            <SettingItem icon={<Wallet color="#1c1b1b" size={20} />} label="Portefeuille" onPress={() => handleFeatureAlert('Portefeuille')} />
                            <SettingItem icon={<Tag color="#1c1b1b" size={20} />} label="Promotions" onPress={() => router.push('/(client)/promotions')} />
                            <SettingItem icon={<HelpCircle color="#1c1b1b" size={20} />} label="Aide" onPress={handleHelp} />
                            <SettingItem icon={<Settings color="#1c1b1b" size={20} />} label="Paramètres" onPress={() => handleFeatureAlert('Paramètres')} />
                        </View>
                    </View>

                    {/* Logout Section */}
                    <View className="items-center pb-8">
                        <Pressable onPress={handleLogout} className="active:opacity-50 transition-opacity">
                            <Text className="text-[10px] font-label tracking-[0.08em] text-ink-faint uppercase">Se déconnecter</Text>
                        </Pressable>
                        <Text className="mt-4 text-[9px] text-ink-faint font-label">Version 4.29.1 (Gold Edition)</Text>
                    </View>
                </View>
            </ScrollView>


        </View>
    );
}

function SettingItem({ icon, label, onPress }: { icon: React.ReactNode, label: string, onPress?: () => void }) {
    return (
        <Pressable onPress={onPress} className="flex-row items-center justify-between p-5 bg-surface-container-low active:bg-surface-container-highest rounded-3xl transition-colors">
            <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 rounded-full bg-white flex items-center justify-center" style={shadowSoft}>
                    {icon}
                </View>
                <Text className="font-labelbold text-ink text-base">{label}</Text>
            </View>
            <ChevronRight color="#8d8a87" size={20} />
        </Pressable>
    );
}

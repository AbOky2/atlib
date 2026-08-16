import React from 'react';
import { View, Text, ScrollView, Pressable, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Award, Heart, Wallet, HelpCircle, Settings, Tag, Gift, ChevronRight, Package, MessageSquare, Store } from 'lucide-react-native';
import Constants from 'expo-constants';

import { useAuthStore } from '../../../src/store/authStore';
import { useCartStore } from '../../../src/store/cartStore';
import { useFavoritesStore } from '../../../src/store/favoritesStore';
import { useUserOrders, useMyRestaurantId } from '../../../src/hooks/useSupabase';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenHeader, useHeaderOffset } from '../../../src/components/ScreenHeader';
import { BRAND, BRAND_FULL, BRAND_CITY } from '../../../src/lib/brand';
import { openSupportChat } from '../../../src/lib/support';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const headerOffset = useHeaderOffset();
    const signOut = useAuthStore(state => state.signOut);
    const user = useAuthStore(state => state.user);
    const showToast = useCartStore(state => state.showToast);
    const showDialog = useCartStore(state => state.showDialog);
    const favoritesCount = useFavoritesStore(state => state.favoriteIds.length);

    // Fetch orders count for dynamic stats
    const { data: userOrders } = useUserOrders(user?.id);
    // null for a normal customer — the staff entry point stays hidden.
    const { data: myRestaurantId } = useMyRestaurantId(!!user);
    const orderCount = userOrders?.length || 0;
    const initial = (user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase();

    const handleShareApp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Share.share({
            message: `Découvre ${BRAND_FULL} — les meilleures tables de ${BRAND_CITY}, livrées chez toi. 🍽️`,
        }).catch(() => {});
    };

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
                router.replace('/home');
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
            onConfirm: () => openSupportChat(),
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
                            router.push('/notifications');
                        }}
                        className="w-10 h-10 items-center justify-center bg-fill rounded-full active:scale-95"
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
                            <View className="w-14 h-14 rounded-full bg-ink items-center justify-center">
                                <Text className="text-h2 font-title text-white">{initial}</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-h1 font-display tracking-tight text-ink">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}</Text>
                                <View className="flex-row items-center px-3 py-1 bg-ink rounded-full gap-1.5 self-start mt-2">
                                    <Award color="#fff" size={14} />
                                    <Text className="text-eyebrow font-label tracking-[0.08em] uppercase text-white">Membre {BRAND}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Stats Grid (Bento Style) — real numbers only */}
                    <View className="flex-row gap-4 mb-11">
                        <View className="flex-1 bg-white p-6 rounded-sheet flex-col justify-between h-32 border border-hairline">
                            <Text className="text-eyebrow font-label tracking-[0.08em] text-ink-faint uppercase">Commandes</Text>
                            <Text className="text-h1 font-title text-ink">{orderCount}</Text>
                        </View>
                        <View className="flex-1 bg-white p-6 rounded-sheet flex-col justify-between h-32 border border-hairline">
                            <Text className="text-eyebrow font-label tracking-[0.08em] text-ink-faint uppercase">Favoris</Text>
                            <Text className="text-h1 font-title text-ink">{favoritesCount}</Text>
                        </View>
                    </View>

                    {/* Share Banner — a real share sheet, no invented referral rewards */}
                    <View className="mb-11 relative bg-accent p-8 rounded-sheet overflow-hidden">
                        <View className="relative z-10 w-2/3">
                            <Text className="text-h2 font-title tracking-tight mb-2 leading-tight text-white">Partagez l'expérience</Text>
                            <Text className="text-body font-label opacity-90 mb-5 text-white">Faites découvrir {BRAND_FULL} à vos proches.</Text>
                            <Pressable onPress={handleShareApp} className="bg-white px-6 py-3 rounded-full active:scale-95 self-start">
                                <Text className="text-accent text-eyebrow font-labelbold tracking-[0.08em] uppercase">Inviter des amis</Text>
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
                        <Text className="px-2 text-eyebrow font-label tracking-[0.08em] text-ink-faint uppercase mb-4">Compte</Text>

                        <View className="flex-col gap-2">
                            {/* Staff entry point.
                                The dashboard existed but nothing in the app led to it:
                                a restaurant owner could sign in and still have no way
                                to reach their own orders. Shown only when the account
                                is actually linked to a restaurant. */}
                            {myRestaurantId ? (
                                <SettingItem
                                    icon={<Store color="#FF5733" size={20} />}
                                    label="Espace restaurant"
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        router.push('/(restaurant)/dashboard');
                                    }}
                                />
                            ) : null}
                            <SettingItem icon={<Heart color="#1c1b1b" size={20} />} label="Favoris" onPress={() => router.push('/favorites')} />
                            <SettingItem icon={<Package color="#1c1b1b" size={20} />} label="Mes commandes" onPress={() => router.push('/orders')} />
                            <SettingItem icon={<MessageSquare color="#1c1b1b" size={20} />} label="Avis" onPress={() => handleFeatureAlert('Avis')} />
                            <SettingItem icon={<Wallet color="#1c1b1b" size={20} />} label="Portefeuille" onPress={() => handleFeatureAlert('Portefeuille')} />
                            <SettingItem icon={<Tag color="#1c1b1b" size={20} />} label="Promotions" onPress={() => router.push('/promotions')} />
                            <SettingItem icon={<HelpCircle color="#1c1b1b" size={20} />} label="Aide" onPress={handleHelp} />
                            <SettingItem icon={<Settings color="#1c1b1b" size={20} />} label="Paramètres" onPress={() => handleFeatureAlert('Paramètres')} />
                        </View>
                    </View>

                    {/* Logout Section */}
                    <View className="items-center pb-8">
                        <Pressable onPress={handleLogout} className="active:opacity-50 transition-opacity">
                            <Text className="text-eyebrow font-label tracking-[0.08em] text-ink-faint uppercase">Se déconnecter</Text>
                        </Pressable>
                        <Text className="mt-4 text-eyebrow text-ink-faint font-label">Version {APP_VERSION}</Text>
                    </View>
                </View>
            </ScrollView>


        </View>
    );
}

function SettingItem({ icon, label, onPress }: { icon: React.ReactNode, label: string, onPress?: () => void }) {
    return (
        <Pressable onPress={onPress} className="flex-row items-center justify-between p-5 bg-fill active:bg-fill-strong rounded-panel transition-colors">
            <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    {icon}
                </View>
                <Text className="font-labelbold text-ink text-bodylg">{label}</Text>
            </View>
            <ChevronRight color="#8d8a87" size={20} />
        </Pressable>
    );
}

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Share } from 'react-native';
import { Bell, Heart, HelpCircle, Gift, ChevronRight, Package, Store, ShieldCheck, Trash2, type LucideIcon } from 'lucide-react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { verifiedAccountPhone } from '../../../src/lib/phoneAuth';
import { formatChadPhone } from '../../../src/lib/phone';
import { useAuthStore } from '../../../src/store/authStore';
import { useCartStore } from '../../../src/store/cartStore';
import { useFavoritesStore } from '../../../src/store/favoritesStore';
import { useUserOrders } from '../../../src/data/orders';
import { useMyRestaurantId } from '../../../src/data/restaurantAdmin';
import { ACCOUNT_ERRORS } from '../../../src/data/account';
import { ScreenHeader, useHeaderOffset } from '../../../src/components/ScreenHeader';
import { useBottomClearance } from '../../../src/components/ActiveOrderBanner';
import { Button, Card, TypeText, SCREEN_GUTTER, TOUCH_MIN } from '../../../src/components/ui';
import { BRAND_FULL, BRAND_CITY } from '../../../src/lib/brand';
import { openSupportChat } from '../../../src/lib/support';
import { COLORS } from '../../../src/lib/palette';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function ProfileScreen() {
    const headerOffset = useHeaderOffset();
    const bottomClearance = useBottomClearance();
    const signOut = useAuthStore(state => state.signOut);
    const deleteAccount = useAuthStore(state => state.deleteAccount);
    const user = useAuthStore(state => state.user);
    const showToast = useCartStore(state => state.showToast);
    const showDialog = useCartStore(state => state.showDialog);
    const favoritesCount = useFavoritesStore(state => state.favoriteIds.length);
    const [busy, setBusy] = useState<'signout' | 'delete' | null>(null);

    const { data: userOrders } = useUserOrders(user?.id);
    // null for a normal customer — the staff entry point stays hidden.
    const { data: myRestaurantId } = useMyRestaurantId(!!user);
    const orderCount = userOrders?.length || 0;
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
    const initial = displayName.charAt(0).toUpperCase();
    const phone = verifiedAccountPhone(user);

    const handleShareApp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Share.share({
            message: `Découvrez ${BRAND_FULL} : les meilleures tables de ${BRAND_CITY}, livrées chez vous.`,
        }).catch(() => {});
    };

    const handleLogout = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDialog({
            title: 'Se déconnecter ?',
            message: 'Vous pourrez vous reconnecter à tout moment avec votre email.',
            confirmText: 'Se déconnecter',
            cancelText: 'Annuler',
            destructive: true,
            onConfirm: async () => {
                setBusy('signout');
                await signOut();
                setBusy(null);
                // Only leave once the server really signed us out; the store
                // keeps the session (and explains) otherwise.
                if (!useAuthStore.getState().user) router.replace('/home');
                else showToast(useAuthStore.getState().error ?? 'Déconnexion impossible pour le moment.', 'error');
            },
        });
    };

    const handleDeleteAccount = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDialog({
            title: 'Supprimer votre compte ?',
            message: 'Vos coordonnées, adresses et favoris seront effacés définitivement. Vos commandes passées sont conservées anonymisées pour la comptabilité des restaurants.',
            confirmText: 'Supprimer définitivement',
            cancelText: 'Garder mon compte',
            destructive: true,
            onConfirm: async () => {
                setBusy('delete');
                const result = await deleteAccount();
                setBusy(null);
                if (result === 'ok') {
                    showToast('Votre compte a été supprimé.', 'success');
                    router.replace('/home');
                } else if (result === ACCOUNT_ERRORS.ACTIVE_ORDER) {
                    showDialog({
                        title: 'Commande en cours',
                        message: 'Votre compte pourra être supprimé une fois votre commande en cours livrée ou annulée.',
                        confirmText: 'Voir ma commande',
                        cancelText: 'Fermer',
                        onConfirm: () => router.push('/tracking'),
                    });
                } else if (result === ACCOUNT_ERRORS.STAFF_ACCOUNT) {
                    showToast('Ce compte gère un restaurant : contactez l’assistance pour le fermer.', 'error');
                } else if (result === ACCOUNT_ERRORS.SCHEMA_REQUIRED) {
                    showToast('La suppression n’est pas encore disponible. Contactez l’assistance.', 'error');
                } else {
                    showToast(useAuthStore.getState().error ?? 'Suppression impossible pour le moment. Réessayez.', 'error');
                }
            },
        });
    };

    const handleHelp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDialog({
            title: 'Assistance',
            message: 'Notre équipe vous répond sur WhatsApp.',
            confirmText: 'Ouvrir WhatsApp',
            cancelText: 'Annuler',
            onConfirm: () => { void openSupportChat(); },
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
                        accessibilityRole="button"
                        accessibilityLabel="Notifications"
                        className="items-center justify-center bg-fill rounded-full active:scale-95"
                        style={{ width: TOUCH_MIN, height: TOUCH_MIN }}
                    >
                        <Bell color={COLORS.ink} size={22} strokeWidth={2} />
                    </Pressable>
                }
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: headerOffset + 12, paddingBottom: bottomClearance }}
                showsVerticalScrollIndicator={false}
            >
                {/* Identity */}
                <View className="flex-row items-center mb-10" style={{ gap: 16 }}>
                    <View className="w-14 h-14 rounded-full bg-ink items-center justify-center">
                        <Text className="text-h2 font-title text-white">{initial}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-h1 font-display tracking-tight text-ink" numberOfLines={1}>{displayName}</Text>
                        {phone ? <TypeText variant="caption" tone="secondary" className="mt-1">{formatChadPhone(phone)} · Numéro vérifié</TypeText> : null}
                        {user?.email ? <TypeText variant="caption" tone="tertiary" className="mt-1" numberOfLines={1}>{user.email}</TypeText> : null}
                    </View>
                </View>

                {/* Real numbers only */}
                <View className="flex-row mb-10" style={{ gap: 16 }}>
                    <StatTile label="Commandes" value={orderCount} />
                    <StatTile label="Favoris" value={favoritesCount} />
                </View>

                {/* Share — a real share sheet, no invented referral reward */}
                <View className="mb-10 relative bg-accent p-6 rounded-panel overflow-hidden">
                    <View className="relative z-10">
                        <Text className="text-h2 font-title tracking-tight mb-2 text-ink">Partagez l’expérience</Text>
                        <TypeText className="mb-5 font-label">Faites découvrir {BRAND_FULL} à vos proches.</TypeText>
                        <Pressable
                            onPress={handleShareApp}
                            accessibilityRole="button"
                            accessibilityLabel="Inviter des amis"
                            className="bg-surface px-6 rounded-full active:scale-95 self-start items-center justify-center"
                            style={{ height: TOUCH_MIN }}
                        >
                            <Text className="text-ink text-eyebrow font-labelbold tracking-eyebrow uppercase">Inviter des amis</Text>
                        </Pressable>
                    </View>
                    <View pointerEvents="none" className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full" />
                    <View pointerEvents="none" className="absolute right-6 opacity-10" style={{ top: 30 }}>
                        <Gift color={COLORS.white} size={100} />
                    </View>
                </View>

                {/* Account */}
                <TypeText variant="eyebrow" tone="tertiary" className="mb-3">Compte</TypeText>
                <SettingsGroup className="mb-8">
                    {/* Staff entry point — shown only when the account is linked to a restaurant. */}
                    {myRestaurantId ? (
                        <SettingItem icon={Store} accent label="Espace restaurant" onPress={() => router.push('/(restaurant)/dashboard')} />
                    ) : null}
                    <SettingItem icon={Heart} label="Favoris" onPress={() => router.push('/favorites')} />
                    <SettingItem icon={Package} label="Mes commandes" onPress={() => router.push('/orders')} />
                    <SettingItem icon={HelpCircle} label="Aide" onPress={handleHelp} />
                </SettingsGroup>

                {/* Privacy — the two things the stores require to be reachable in-app. */}
                <TypeText variant="eyebrow" tone="tertiary" className="mb-3">Confidentialité</TypeText>
                <SettingsGroup className="mb-10">
                    <SettingItem icon={ShieldCheck} label="Politique de confidentialité" onPress={() => router.push('/privacy')} />
                    {user ? <SettingItem icon={Trash2} label="Supprimer mon compte" destructive onPress={handleDeleteAccount} /> : null}
                </SettingsGroup>

                <View className="items-center">
                    {user ? (
                        <Button label="Se déconnecter" variant="ghost" size="control" loading={busy === 'signout'} onPress={handleLogout} />
                    ) : (
                        <Button label="Se connecter" onPress={() => router.push('/login')} className="self-stretch" />
                    )}
                    <TypeText variant="caption" tone="tertiary" className="mt-4">Version {APP_VERSION}</TypeText>
                </View>
            </ScrollView>
        </View>
    );
}

function StatTile({ label, value }: { label: string; value: number }) {
    return (
        <View className="flex-1 bg-surface p-5 rounded-panel justify-between border border-hairline" style={{ height: 112 }}>
            <TypeText variant="eyebrow" tone="tertiary">{label}</TypeText>
            <Text className="text-h1 font-title text-ink">{value}</Text>
        </View>
    );
}

/**
 * A grouped list, the way Settings does it: one surface, rows separated by a
 * hairline that starts after the icon column — not a stack of pills.
 */
function SettingsGroup({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    const rows = React.Children.toArray(children).filter(Boolean);
    return (
        <Card className={`overflow-hidden ${className}`}>
            {rows.map((row, i) => (
                <View key={i}>
                    {i > 0 ? <View className="h-px bg-hairline" style={{ marginLeft: SETTING_TEXT_INSET }} /> : null}
                    {row}
                </View>
            ))}
        </Card>
    );
}

/** 16 pt padding + 36 pt icon disc + 14 pt gap: where the text of a row starts. */
const SETTING_TEXT_INSET = 16 + 36 + 14;

function SettingItem({ icon: Icon, label, onPress, accent = false, destructive = false }: {
    icon: LucideIcon; label: string; onPress: () => void; accent?: boolean; destructive?: boolean;
}) {
    const color = destructive ? COLORS.danger : accent ? COLORS.accentDark : COLORS.ink;
    return (
        <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
            accessibilityRole="button"
            accessibilityLabel={label}
            className="flex-row items-center px-4 active:bg-fill"
            style={{ height: 60, gap: 14 }}
        >
            <View className={`w-9 h-9 rounded-full items-center justify-center ${destructive ? 'bg-danger-soft' : accent ? 'bg-accent-soft' : 'bg-fill'}`}>
                <Icon color={color} size={18} strokeWidth={2} />
            </View>
            <Text className={`flex-1 font-label text-bodylg ${destructive ? 'text-danger' : 'text-ink'}`} numberOfLines={1}>{label}</Text>
            <ChevronRight color={COLORS.inkDisabled} size={20} strokeWidth={2} />
        </Pressable>
    );
}

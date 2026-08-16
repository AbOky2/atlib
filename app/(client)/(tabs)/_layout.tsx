import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { House, Search, ShoppingBag, User, type LucideIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useCartStore } from '../../../src/store/cartStore';
import { useAuthStore } from '../../../src/store/authStore';
import { GradientOverlay } from '../../../src/components/GradientOverlay';
import { shadowFloat } from '../../../src/lib/elevation';
import { COLORS } from '../../../src/lib/palette';

/**
 * The three destinations you can switch BETWEEN. Everything else — cart,
 * restaurant, checkout, tracking… — is pushed on top by the parent Stack.
 *
 * That separation is the point. Those screens used to be declared here as
 * `Tabs.Screen href: null`, which made the navigator treat a checkout step as a
 * sibling tab: transitions animated left or right depending on declaration
 * order, every screen stayed mounted for the whole session, and `router.replace`
 * between two of them could leave the navigator with nothing to draw — the blank
 * screen. The structure now says what it means.
 */
const ITEM_SIZE = 46;
const BADGE_SIZE = 18;
const CAPSULE_PADDING = 10;

/** Round nav item — dark disc when active, quiet icon otherwise. */
function NavCircle({
    Icon,
    active,
    onPress,
    label,
    badge,
}: {
    Icon: LucideIcon;
    active: boolean;
    onPress: () => void;
    label: string;
    badge?: number;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={badge ? `${label}, ${badge} article${badge > 1 ? 's' : ''}` : label}
            className={`items-center justify-center rounded-full active:scale-90 ${active ? 'bg-ink' : ''}`}
            style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
        >
            <Icon
                color={active ? '#ffffff' : COLORS.inkMuted}
                fill={active ? '#1c1b1b' : 'transparent'}
                size={22}
                strokeWidth={active ? 2.3 : 2}
            />
            {badge ? (
                <View
                    className="absolute bg-accent rounded-full items-center justify-center border-2 border-white"
                    style={{ top: 1, right: 0, minWidth: BADGE_SIZE, height: BADGE_SIZE, paddingHorizontal: 3 }}
                >
                    <Text className="text-white text-eyebrow font-labelbold">{badge > 9 ? '9+' : badge}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}

function CustomTabBar({ state, navigation }: any) {
    const insets = useSafeAreaInsets();
    const cartItemCount = useCartStore((s) => s.getTotalItems());
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const router = useRouter();

    const currentRoute = state.routes[state.index]?.name;
    const isHome = currentRoute === 'home';
    const isExplore = currentRoute === 'explore';
    const isProfile = currentRoute === 'profile';

    const goTab = (name: string, authRequired = false) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (authRequired && !isAuthenticated) {
            router.push('/login');
            return;
        }
        navigation.navigate(name);
    };

    return (
        <View
            className="absolute left-0 right-0 bottom-0 px-5"
            style={{ paddingBottom: Math.max(insets.bottom, 14) }}
            pointerEvents="box-none"
        >
            {/* Soft fade so scrolling content dissolves under the glass. */}
            <GradientOverlay rgb="252,249,248" from={1} heightPx={120} />

            {/* Frosted capsule.
                TWO nested views on purpose: iOS cannot draw a shadow on a node that
                also clips its children, so the outer one owns the elevation and the
                inner one owns the rounding, the border and the blur. */}
            <View className="self-center" style={[shadowFloat, { borderRadius: 999 }]}>
                <View
                    className="rounded-full overflow-hidden"
                    style={{
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.65)',
                        // BlurView renders no real blur on Android — compensate with a denser veil.
                        backgroundColor: Platform.OS === 'ios' ? 'rgba(252,249,248,0.55)' : 'rgba(252,249,248,0.96)',
                    }}
                >
                    {Platform.OS === 'ios' && (
                        <BlurView intensity={70} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                    )}
                    <View
                        className="flex-row items-center"
                        style={{ paddingHorizontal: CAPSULE_PADDING, paddingVertical: 8, gap: 6 }}
                    >
                        <NavCircle Icon={House} active={isHome} onPress={() => goTab('home')} label="Accueil" />
                        <NavCircle Icon={Search} active={isExplore} onPress={() => goTab('explore')} label="Rechercher" />
                        {/* The cart is a pushed screen, not a tab — hence router.push. */}
                        <NavCircle
                            Icon={ShoppingBag}
                            active={false}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/cart');
                            }}
                            label="Panier"
                            badge={cartItemCount}
                        />
                        <NavCircle Icon={User} active={isProfile} onPress={() => goTab('profile', true)} label="Profil" />
                    </View>
                </View>
            </View>
        </View>
    );
}

export default function TabsLayout() {
    return (
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false, tabBarShowLabel: false, animation: 'shift' }}
        >
            <Tabs.Screen name="home" options={{ title: 'Accueil' }} />
            <Tabs.Screen name="explore" options={{ title: 'Explorer' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
        </Tabs>
    );
}

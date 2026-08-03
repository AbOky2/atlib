import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Pressable, Platform, UIManager, LayoutAnimation } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { House, Search, ShoppingBag, User, type LucideIcon } from 'lucide-react-native';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { GradientOverlay } from '../../src/components/GradientOverlay';
import { shadowFloat } from '../../src/lib/elevation';
import { COLORS } from '../../src/lib/palette';
import { ActiveOrderBanner } from '../../src/components/ActiveOrderBanner';
import GlobalDialog from '../../src/components/GlobalDialog';
import GlobalOrderSync from '../../src/components/GlobalOrderSync';
import { OfflineBanner } from '../../src/components/OfflineBanner';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Floating glass nav (iOS-style capsule): one frosted pill hosting the four
// destinations, the active one sitting on a dark disc. Only shown on the browse
// screens — hidden on cart/checkout/tracking so it never collides with those
// screens' own bottom action bars.
const NAV_VISIBLE_ON = ['home', 'explore', 'profile'];

const ITEM_SIZE = 46;

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
            accessibilityLabel={label}
            className={`items-center justify-center rounded-full active:scale-90 ${active ? 'bg-[#1c1b1b]' : ''}`}
            style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
        >
            <View className="relative">
                <Icon
                    color={active ? '#ffffff' : COLORS.inkMuted}
                    fill={active ? '#1c1b1b' : 'transparent'}
                    size={22}
                    strokeWidth={active ? 2.3 : 2}
                />
                {badge ? (
                    <View className="absolute -top-2 -right-2.5 min-w-[17px] h-[17px] bg-[#FF5733] rounded-full items-center justify-center px-1 border-2 border-white">
                        <Text className="text-white text-[9px] font-labelbold">{badge > 9 ? '9+' : badge}</Text>
                    </View>
                ) : null}
            </View>
        </Pressable>
    );
}

function CustomTabBar({ state, navigation }: any) {
    const insets = useSafeAreaInsets();
    const cartItemCount = useCartStore((s) => s.getTotalItems());
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const router = useRouter();

    const prevExplore = React.useRef<boolean | null>(null);

    const currentRoute = state.routes[state.index]?.name;
    const isHome = currentRoute === 'home';
    const isExplore = currentRoute === 'explore';
    const isProfile = currentRoute === 'profile';

    if (!NAV_VISIBLE_ON.includes(currentRoute)) return null;

    // Smoothly morph the search pill ⇄ circle when entering/leaving Explore —
    // a longer, softer spring so the collapse reads as one continuous gesture.
    if (prevExplore.current !== null && prevExplore.current !== isExplore) {
        LayoutAnimation.configureNext({
            duration: 480,
            create: { type: LayoutAnimation.Types.easeOut, property: LayoutAnimation.Properties.opacity, duration: 220 },
            update: { type: LayoutAnimation.Types.spring, springDamping: 0.86 },
            delete: { type: LayoutAnimation.Types.easeIn, property: LayoutAnimation.Properties.opacity, duration: 120 },
        });
    }
    prevExplore.current = isExplore;

    const go = (name: string, authRequired = false) => {
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

            {/* Frosted capsule */}
            <View
                className="self-center rounded-full overflow-hidden"
                style={[
                    shadowFloat,
                    {
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.65)',
                        // BlurView renders no real blur on Android — compensate with a denser veil.
                        backgroundColor: Platform.OS === 'ios' ? 'rgba(252,249,248,0.55)' : 'rgba(252,249,248,0.96)',
                        width: isExplore ? undefined : '100%',
                    },
                ]}
            >
                {Platform.OS === 'ios' && (
                    <BlurView intensity={70} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                )}
                <View className="flex-row items-center justify-center gap-1.5 p-1.5">
                    <NavCircle Icon={House} active={isHome} onPress={() => go('home')} label="Accueil" />

                    {/* Search — a wide pill everywhere, collapsing to a circle on Explore. */}
                    <Pressable
                        onPress={() => go('explore')}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isExplore }}
                        accessibilityLabel="Rechercher"
                        className={`rounded-full flex-row items-center justify-center active:scale-[0.96] ${
                            isExplore ? 'bg-[#1c1b1b]' : 'flex-1 bg-white/70 px-5'
                        }`}
                        style={{ height: ITEM_SIZE, width: isExplore ? ITEM_SIZE : undefined }}
                    >
                        <Search
                            color={isExplore ? '#ffffff' : COLORS.inkMuted}
                            size={21}
                            strokeWidth={isExplore ? 2.4 : 2}
                        />
                        {!isExplore && (
                            <Text className="text-[15px] font-label text-ink-faint ml-3">Rechercher</Text>
                        )}
                    </Pressable>

                    <NavCircle
                        Icon={ShoppingBag}
                        active={false}
                        onPress={() => go('cart')}
                        label="Panier"
                        badge={cartItemCount}
                    />
                    <NavCircle Icon={User} active={isProfile} onPress={() => go('profile', true)} label="Profil" />
                </View>
            </View>
        </View>
    );
}

export default function ClientLayout() {
    return (
        <>
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                // Cross-fade + slight shift between tabs — the pill morph and the
                // screen change read as ONE natural gesture instead of a hard cut.
                animation: 'shift',
            }}
        >
            {/* Main tab screens */}
            <Tabs.Screen name="home" options={{ title: 'Accueil' }} />
            <Tabs.Screen name="explore" options={{ title: 'Explorer' }} />
            <Tabs.Screen name="cart" options={{ title: 'Panier' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profil' }} />

            {/* Hidden from tab bar — accessed via push navigation */}
            <Tabs.Screen name="restaurant" options={{ href: null }} />
            <Tabs.Screen name="payment-method" options={{ href: null }} />
            <Tabs.Screen name="order-confirmed" options={{ href: null }} />
            <Tabs.Screen name="tracking" options={{ href: null }} />
            <Tabs.Screen name="favorites" options={{ href: null }} />
            <Tabs.Screen name="orders" options={{ href: null }} />
            <Tabs.Screen name="reviews" options={{ href: null }} />
            <Tabs.Screen name="checkout-address" options={{ href: null }} />
            <Tabs.Screen name="notifications" options={{ href: null }} />
            <Tabs.Screen name="promotions" options={{ href: null }} />
            <Tabs.Screen name="addresses" options={{ href: null }} />
        </Tabs>
        <OfflineBanner />
        <ActiveOrderBanner />
        <GlobalDialog />
        <GlobalOrderSync />
        </>
    );
}

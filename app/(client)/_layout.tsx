import { Stack } from 'expo-router';

import { ActiveOrderBanner } from '../../src/components/ActiveOrderBanner';
import GlobalDialog from '../../src/components/GlobalDialog';
import GlobalOrderSync from '../../src/components/GlobalOrderSync';
import { OfflineBanner } from '../../src/components/OfflineBanner';

/**
 * The customer app: a Stack of pushed screens, with the tab bar living inside
 * `(tabs)` as one entry of that stack.
 *
 * Every screen here used to be a `Tabs.Screen` with `href: null` — a checkout
 * step declared as a sibling of Home. Three symptoms came from that single lie:
 * transitions animated left or right depending on declaration order rather than
 * on the direction of travel, every screen stayed mounted for the whole session
 * (so a sheet opened on a restaurant could outlive the screen that owned it),
 * and `router.replace` between two of them could leave the navigator with
 * nothing to render — the blank, unresponsive screen.
 *
 * One direction of travel now: pushing slides in from the right, going back
 * slides out to the right. `order-confirmed` is the deliberate exception — it is
 * a curtain between paying and tracking, so it fades and refuses the back
 * gesture, which would otherwise drop the customer back onto the payment screen
 * for an order already placed.
 */
export default function ClientLayout() {
    return (
        <>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                }}
            >
                <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                <Stack.Screen name="restaurant" />
                <Stack.Screen name="cart" />
                <Stack.Screen name="checkout-address" />
                <Stack.Screen name="payment-method" />
                <Stack.Screen
                    name="order-confirmed"
                    options={{ animation: 'fade', gestureEnabled: false }}
                />
                <Stack.Screen name="tracking" options={{ gestureEnabled: false }} />
                <Stack.Screen name="orders" />
                <Stack.Screen name="favorites" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="addresses" />
                <Stack.Screen name="privacy" />
            </Stack>

            {/* Surfaces that must survive navigation, mounted once above the stack. */}
            <OfflineBanner />
            <ActiveOrderBanner />
            <GlobalDialog />
            <GlobalOrderSync />
        </>
    );
}

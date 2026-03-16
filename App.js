import './global.css'
import { useEffect, useRef } from 'react'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Provider, useDispatch } from 'react-redux'
import * as Notifications from 'expo-notifications'
import { store } from './store'
import { loadStoredAuth } from './features/authSlice'
import ErrorBoundary from './components/ErrorBoundary'

// ─── Tab screens ─────────────────────────────────────────────────────────────
import HomeScreen from './screens/HomeScreen'
import AccountScreen from './screens/AccountScreen'

// ─── Stack screens ────────────────────────────────────────────────────────────
import RestaurantScreen from './screens/RestaurantScreen'
import SearchScreen from './screens/SearchScreen'
import PaniersScreen from './screens/PaniersScreen'
import BasketScreen from './screens/BasketScreen'
import AddressScreen from './screens/AddressScreen'
import PreparingOrderScreen from './screens/PreparingOrderScreen'
import OrderTrackingScreen from './screens/OrderTrackingScreen'
import CartSummaryScreen from './screens/CartSummaryScreen'
import WalletScreen from './screens/WalletScreen'
import FavoritesScreen from './screens/FavoritesScreen'
import OrdersScreen from './screens/OrdersScreen'
import OrderDetailsScreen from './screens/OrderDetailsScreen'
import RidesScreen from './screens/RidesScreen'
import PromotionsScreen from './screens/PromotionsScreen'
import HelpScreen from './screens/HelpScreen'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'

// ─── Custom tab bar ───────────────────────────────────────────────────────────
import CustomNavBar from './components/CustomNavBar'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomNavBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  )
}

// ─── Auth bootstrap — loads persisted token on startup ────────────────────────
function AuthBootstrap() {
  const dispatch = useDispatch()
  useEffect(() => { dispatch(loadStoredAuth()) }, [])
  return null
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const navigationRef = useNavigationContainerRef()
  const notifResponseSub = useRef(null)

  // Navigate to OrderTracking from a notification payload
  const handleNotificationResponse = (response) => {
    const data = response?.notification?.request?.content?.data
    if (data?.type === 'order_status') {
      // Wait for navigator to be ready before navigating
      const tryNavigate = () => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('OrderTracking')
        } else {
          setTimeout(tryNavigate, 100)
        }
      }
      tryNavigate()
    }
  }

  useEffect(() => {
    // ── Listener for taps while app is running (foreground / background) ──
    notifResponseSub.current =
      Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)

    // ── Handle the notification that LAUNCHED the app (app was killed) ──
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response)
    })

    return () => {
      notifResponseSub.current?.remove()
    }
  }, [])

  return (
    <Provider store={store}>
      <ErrorBoundary>
        <NavigationContainer ref={navigationRef}>
          <AuthBootstrap />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            {/* Root — tabs */}
            <Stack.Screen name="MainTabs" component={MainTabs} />

            {/* Discovery */}
            <Stack.Screen name="Restaurant" component={RestaurantScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />

            {/* Cart flow */}
            <Stack.Screen name="Paniers" component={PaniersScreen} />
            <Stack.Screen name="Basket" component={BasketScreen} />

            {/* Address — slide up modal */}
            <Stack.Screen
              name="Address"
              component={AddressScreen}
              options={{ presentation: 'modal' }}
            />

            {/* Cart summary — bottom sheet modal */}
            <Stack.Screen
              name="CartSummary"
              component={CartSummaryScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />

            {/* Order flow */}
            <Stack.Screen name="PreparingOrder" component={PreparingOrderScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />

            {/* Account sub-screens */}
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
            <Stack.Screen name="Rides" component={RidesScreen} />
            <Stack.Screen name="Promotions" component={PromotionsScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />

            {/* Auth */}
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    </Provider>
  )
}

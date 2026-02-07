import './global.css';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import RestaurantScreen from './screens/RestaurantScreen';
import SearchScreen from './screens/SearchScreen';
import { Provider } from 'react-redux';
import { store } from './store';
import BasketScreen from './screens/BasketScreen';
import PreparingOrderScreen from './screens/PreparingOrderScreen';
import DeliveryScreen from './screens/DeliveryScreen';
import AddressScreen from './screens/AddressScreen';
import OrderTrackingScreen from './screens/OrderTrackingScreen';
import AccountScreen from './screens/AccountScreen';
import WalletScreen from './screens/WalletScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import OrdersScreen from './screens/OrdersScreen';
import OrderDetailsScreen from './screens/OrderDetailsScreen';
import RidesScreen from './screens/RidesScreen';
import PromotionsScreen from './screens/PromotionsScreen';
import HelpScreen from './screens/HelpScreen';

const Stack = createNativeStackNavigator();

const noHeader = { headerShown: false };

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#7A1E3A',
            headerTitleStyle: { fontWeight: '600', color: '#111827' },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        >
          {/* Core */}
          <Stack.Screen name="Home" component={HomeScreen} options={noHeader} />
          <Stack.Screen name="Restaurant" component={RestaurantScreen} options={noHeader} />
          <Stack.Screen name="Search" component={SearchScreen} options={noHeader} />

          {/* Basket — full page push, NOT modal */}
          <Stack.Screen name="Basket" component={BasketScreen} options={noHeader} />

          {/* Address modal */}
          <Stack.Screen name="Address" component={AddressScreen}
            options={{ presentation: 'modal', ...noHeader }} />

          {/* Order flow */}
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen}
            options={{ presentation: 'fullScreenModal', ...noHeader }} />
          <Stack.Screen name="PreparingOrderScreen" component={PreparingOrderScreen}
            options={{ presentation: 'fullScreenModal', ...noHeader }} />
          <Stack.Screen name="Delivery" component={DeliveryScreen}
            options={{ presentation: 'fullScreenModal', ...noHeader }} />

          {/* Account & sub-screens */}
          <Stack.Screen name="Account" component={AccountScreen} options={noHeader} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} options={noHeader} />
          <Stack.Screen name="Wallet" component={WalletScreen} options={noHeader} />
          <Stack.Screen name="Orders" component={OrdersScreen} options={noHeader} />
          <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={noHeader} />
          <Stack.Screen name="Rides" component={RidesScreen} options={noHeader} />
          <Stack.Screen name="Promotions" component={PromotionsScreen} options={noHeader} />
          <Stack.Screen name="Help" component={HelpScreen} options={noHeader} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}

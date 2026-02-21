import { createSlice } from '@reduxjs/toolkit'

// URL du backend admin-web (Next.js)
// En développement : http://localhost:3000 (simulateur iOS/Android)
// Sur appareil physique : http://VOTRE_IP_LAN:3000
const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const initialState = {
  currentOrder: null,
  orderHistory: [],
  orderStatuses: {
    PENDING:          'En attente',
    ACCEPTED:         'Acceptée',
    PREPARING:        'En préparation',
    READY:            'Prête',
    OUT_FOR_DELIVERY: 'En livraison',
    DELIVERED:        'Livrée',
    CANCELLED:        'Annulée',
  },
}

export const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    createOrder: (state, action) => {
      const newOrder = {
        id: action.payload?.id || `ord_${Date.now()}`,
        ...action.payload,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        estimatedDeliveryTime: '45-60 min',
      }
      state.currentOrder = newOrder
      state.orderHistory.unshift(newOrder)
    },
    updateOrderStatus: (state, action) => {
      const { status, estimatedTime } = action.payload;
      if (state.currentOrder) {
        state.currentOrder.status = status;
        state.currentOrder.updatedAt = new Date().toISOString();
        if (estimatedTime) state.currentOrder.estimatedDeliveryTime = estimatedTime;
      }
      const idx = state.orderHistory.findIndex((o) => o.id === state.currentOrder?.id);
      if (idx >= 0) state.orderHistory[idx].status = status;
    },
    addOrderToHistory: (state, action) => {
      state.orderHistory.unshift(action.payload)
      state.currentOrder = null
    },
    setDeliveryInstructions: (state, action) => {
      if (state.currentOrder) state.currentOrder.deliveryInstructions = action.payload;
    },
    updateDeliveryTime: (state, action) => {
      if (state.currentOrder) state.currentOrder.estimatedDeliveryTime = action.payload;
    },
  },
})

export const {
  createOrder,
  updateOrderStatus,
  addOrderToHistory,
  setDeliveryInstructions,
  updateDeliveryTime,
} = orderSlice.actions

// ─────────────────────────────────────────────────────────────
// Async — communique avec l'admin-web (Next.js) comme backend
// ─────────────────────────────────────────────────────────────

export const createOrderRemote = (payload) => async (dispatch) => {
  const orderId = payload?.id || `ord_${Date.now()}`;

  const order = {
    id: orderId,
    restaurant_id: payload.restaurant?.id || payload.restaurantId || 'unknown',
    restaurant_name: payload.restaurant?.title || payload.restaurantName || '',
    customer_name: payload.customerName || 'Client',
    customer_phone: payload.deliveryAddress?.phoneNumber || '',
    delivery_address: payload.deliveryAddress?.zone || '',
    push_token: payload.pushToken || null,
    status: 'PENDING',
    subtotal_xaf: payload.subtotal || 0,
    delivery_fee_xaf: payload.deliveryFee || 0,
    total_xaf: payload.total || 0,
    payment_method: payload.paymentMethod || 'cash',
  };

  const items = Object.values(payload.items || {}).flat().map((item) => ({
    order_id: orderId,
    name: item.name,
    qty: 1,
    price_xaf: item.price || 0,
  }));

  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, items }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.warn('Backend order creation failed:', err.error);
    }
  } catch (err) {
    console.warn('Backend unreachable, order saved locally:', err.message);
  }

  dispatch(createOrder({ ...payload, id: orderId }));
};

export const fetchOrderByIdRemote = (orderId) => async (dispatch) => {
  if (!orderId) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.order?.status) {
      dispatch(updateOrderStatus({ status: data.order.status }));
    }
  } catch (err) {
    console.warn('fetchOrderByIdRemote failed:', err.message);
  }
};

export const selectCurrentOrder = (state) => state.order.currentOrder
export const selectOrderHistory = (state) => state.order.orderHistory
export const selectOrderStatuses = (state) => state.order.orderStatuses

export default orderSlice.reducer

import { createSlice } from '@reduxjs/toolkit'
import { mockOrders } from '../src/data/mockOrders'

const initialState = {
  currentOrder: null,
  orderHistory: mockOrders, // seed with mock data
  orderStatuses: {
    PENDING: 'En attente',
    ACCEPTED: 'Acceptée',
    PREPARING: 'En préparation',
    READY: 'Prêt',
    OUT_FOR_DELIVERY: 'En cours de livraison',
    DELIVERED: 'Livré',
    CANCELLED: 'Annulé'
  }
}

export const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    createOrder: (state, action) => {
      const newOrder = {
        id: 'ord_' + Date.now().toString(),
        ...action.payload,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        estimatedDeliveryTime: '45-60 min'
      }
      state.currentOrder = newOrder
      // also add to history immediately
      state.orderHistory.unshift(newOrder)
    },
    updateOrderStatus: (state, action) => {
      if (state.currentOrder) {
        state.currentOrder.status = action.payload.status
        state.currentOrder.updatedAt = new Date().toISOString()
        if (action.payload.estimatedTime) {
          state.currentOrder.estimatedDeliveryTime = action.payload.estimatedTime
        }
      }
      // also update in history
      const idx = state.orderHistory.findIndex(
        (o) => o.id === state.currentOrder?.id
      );
      if (idx >= 0) {
        state.orderHistory[idx].status = action.payload.status;
      }
    },
    addOrderToHistory: (state, action) => {
      state.orderHistory.unshift(action.payload)
      state.currentOrder = null
    },
    setDeliveryInstructions: (state, action) => {
      if (state.currentOrder) {
        state.currentOrder.deliveryInstructions = action.payload
      }
    },
    updateDeliveryTime: (state, action) => {
      if (state.currentOrder) {
        state.currentOrder.estimatedDeliveryTime = action.payload
      }
    }
  },
})

export const {
  createOrder,
  updateOrderStatus,
  addOrderToHistory,
  setDeliveryInstructions,
  updateDeliveryTime
} = orderSlice.actions

export const selectCurrentOrder = (state) => state.order.currentOrder
export const selectOrderHistory = (state) => state.order.orderHistory
export const selectOrderStatuses = (state) => state.order.orderStatuses

export default orderSlice.reducer

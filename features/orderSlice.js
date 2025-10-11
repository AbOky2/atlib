import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  currentOrder: null,
  orderHistory: [],
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
        id: Date.now().toString(),
        ...action.payload,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        estimatedDeliveryTime: '45-60 min'
      }
      state.currentOrder = newOrder
    },
    updateOrderStatus: (state, action) => {
      if (state.currentOrder) {
        state.currentOrder.status = action.payload.status
        state.currentOrder.updatedAt = new Date().toISOString()
        if (action.payload.estimatedTime) {
          state.currentOrder.estimatedDeliveryTime = action.payload.estimatedTime
        }
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
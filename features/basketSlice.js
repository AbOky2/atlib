import { createSlice, createSelector } from '@reduxjs/toolkit'

const initialState = {
  items: [],
}

export const basketSlice = createSlice({
  name: 'basket',
  initialState,
  reducers: {
    addToBasket: (state, action) => {
      state.items = [...state.items, action.payload]
    },
    removeFromBasket: (state, action) => {
      // Remove exactly one item matching both dish id AND restaurantId
      const index = state.items.findIndex(
        (item) =>
          item.id === action.payload.id &&
          item.restaurantId === action.payload.restaurantId,
      )
      if (index >= 0) {
        const next = [...state.items]
        next.splice(index, 1)
        state.items = next
      }
    },
    clearRestaurantBasket: (state, action) => {
      state.items = state.items.filter((item) => item.restaurantId !== action.payload)
    },
    clearBasket: (state) => {
      state.items = []
    },
    // Set exact quantity for a dish in a restaurant (replaces add/remove loop)
    setItemQuantity: (state, action) => {
      const { id, restaurantId, qty, ...rest } = action.payload
      state.items = state.items.filter(
        (item) => !(item.id === id && item.restaurantId === restaurantId),
      )
      for (let i = 0; i < qty; i++) {
        state.items.push({ id, restaurantId, ...rest })
      }
    },
  },
})

export const {
  addToBasket,
  removeFromBasket,
  clearRestaurantBasket,
  clearBasket,
  setItemQuantity,
} = basketSlice.actions

// ─── Base selectors ────────────────────────────────────────────────────────

export const selectBasketItems = (state) => state.basket.items

export const selectBasketItemsWithId = createSelector(
  [selectBasketItems, (_, id) => id],
  (items, id) => items.filter((item) => item.id === id),
)

export const selectBasketTotal = (state) =>
  state.basket.items.reduce((sum, item) => sum + (item.price || 0), 0)

// ─── Per-restaurant selectors ──────────────────────────────────────────────

export const selectBasketItemsByRestaurant = createSelector(
  [selectBasketItems],
  (items) => {
    const grouped = {}
    items.forEach((item) => {
      const rid = item.restaurantId
      if (!grouped[rid]) {
        grouped[rid] = {
          restaurantId: rid,
          restaurantTitle: item.restaurantTitle || 'Restaurant',
          restaurantImgUrl: item.restaurantImgUrl || null,
          items: [],
          total: 0,
        }
      }
      grouped[rid].items.push(item)
      grouped[rid].total += item.price || 0
    })
    return Object.values(grouped)
  },
)

export const selectBasketRestaurantCount = createSelector(
  [selectBasketItems],
  (items) => new Set(items.map((i) => i.restaurantId)).size,
)

export const selectBasketTotalForRestaurant = createSelector(
  [selectBasketItems, (_, restaurantId) => restaurantId],
  (items, restaurantId) =>
    items
      .filter((i) => i.restaurantId === restaurantId)
      .reduce((sum, i) => sum + (i.price || 0), 0),
)

export default basketSlice.reducer

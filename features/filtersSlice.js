import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  /** 'all' | 'groceries' | 'rides' | 'alcohol' */
  activeTopTab: 'all',
  /** e.g. 'halal', 'burgers', 'pizzas', null */
  activeCategory: null,
  /** toggle filters */
  pickupOnly: false,
  offersOnly: false,
  /** 1-4 or null */
  priceLevel: null,
  /** max delivery fee in XAF, or null for any */
  maxDeliveryFee: null,
  /** text search */
  searchQuery: '',
}

export const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setTopTab: (state, action) => {
      state.activeTopTab = action.payload;
      // reset category when switching tabs
      state.activeCategory = null;
    },
    setCategory: (state, action) => {
      // toggle: tap same category again to deselect
      state.activeCategory =
        state.activeCategory === action.payload ? null : action.payload;
    },
    togglePickup: (state) => {
      state.pickupOnly = !state.pickupOnly;
    },
    toggleOffers: (state) => {
      state.offersOnly = !state.offersOnly;
    },
    setPriceLevel: (state, action) => {
      // toggle: tap same to deselect
      state.priceLevel =
        state.priceLevel === action.payload ? null : action.payload;
    },
    setMaxDeliveryFee: (state, action) => {
      state.maxDeliveryFee = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    resetFilters: () => initialState,
  },
})

export const {
  setTopTab,
  setCategory,
  togglePickup,
  toggleOffers,
  setPriceLevel,
  setMaxDeliveryFee,
  setSearchQuery,
  resetFilters,
} = filtersSlice.actions

// ── Selectors ──
export const selectActiveTopTab = (state) => state.filters.activeTopTab;
export const selectActiveCategory = (state) => state.filters.activeCategory;
export const selectPickupOnly = (state) => state.filters.pickupOnly;
export const selectOffersOnly = (state) => state.filters.offersOnly;
export const selectPriceLevel = (state) => state.filters.priceLevel;
export const selectMaxDeliveryFee = (state) => state.filters.maxDeliveryFee;
export const selectSearchQuery = (state) => state.filters.searchQuery;
export const selectFilters = (state) => state.filters;

/** Returns true if any filter beyond "all" tab is active */
export const selectHasActiveFilters = (state) => {
  const f = state.filters;
  return (
    f.activeTopTab !== 'all' ||
    f.activeCategory !== null ||
    f.pickupOnly ||
    f.offersOnly ||
    f.priceLevel !== null ||
    f.maxDeliveryFee !== null ||
    f.searchQuery.length > 0
  );
};

export default filtersSlice.reducer

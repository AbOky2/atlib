import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  activeCategory: null,
  pickupOnly: false,
  offersOnly: false,
  priceLevel: null,
  maxDeliveryFee: null,
  searchQuery: '',
}

export const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setCategory: (state, action) => {
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
  setCategory,
  togglePickup,
  toggleOffers,
  setPriceLevel,
  setMaxDeliveryFee,
  setSearchQuery,
  resetFilters,
} = filtersSlice.actions

export const selectActiveCategory = (state) => state.filters.activeCategory;
export const selectPickupOnly = (state) => state.filters.pickupOnly;
export const selectOffersOnly = (state) => state.filters.offersOnly;
export const selectPriceLevel = (state) => state.filters.priceLevel;
export const selectMaxDeliveryFee = (state) => state.filters.maxDeliveryFee;
export const selectSearchQuery = (state) => state.filters.searchQuery;
export const selectFilters = (state) => state.filters;

export const selectHasActiveFilters = (state) => {
  const f = state.filters;
  return (
    f.activeCategory !== null ||
    f.pickupOnly ||
    f.offersOnly ||
    f.priceLevel !== null ||
    f.maxDeliveryFee !== null ||
    f.searchQuery.length > 0
  );
};

export default filtersSlice.reducer

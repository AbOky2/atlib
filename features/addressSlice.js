import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  currentAddress: {
    zone: '',
    landmark: '',
    description: '',
    phoneNumber: '',
    estimatedDistance: '',
    deliveryTime: '30-45 min'
  },
  savedAddresses: [],
  availableZones: [
    'N\'Djamena Centre',
    'Chagoua', 
    'Moursal',
    'Ardep Djoumal',
    'Gassi',
    'Klemat',
    'Sabangali',
    'Angabo',
    'Goudji',
    'Kabalaye'
  ]
}

export const addressSlice = createSlice({
  name: 'address',
  initialState,
  reducers: {
    setCurrentAddress: (state, action) => {
      state.currentAddress = action.payload
    },
    addSavedAddress: (state, action) => {
      state.savedAddresses.push(action.payload)
    },
    removeSavedAddress: (state, action) => {
      state.savedAddresses = state.savedAddresses.filter(
        (address) => address.id !== action.payload
      )
    },
    updateDeliveryTime: (state, action) => {
      state.currentAddress.deliveryTime = action.payload
    }
  },
})

export const { 
  setCurrentAddress, 
  addSavedAddress, 
  removeSavedAddress, 
  updateDeliveryTime 
} = addressSlice.actions

export const selectCurrentAddress = (state) => state.address.currentAddress
export const selectSavedAddresses = (state) => state.address.savedAddresses
export const selectAvailableZones = (state) => state.address.availableZones

export default addressSlice.reducer 
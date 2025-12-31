import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    items: [], // Array of restaurant IDs
}

export const favoritesSlice = createSlice({
    name: 'favorites',
    initialState,
    reducers: {
        toggleFavorite: (state, action) => {
            const index = state.items.indexOf(action.payload);
            if (index >= 0) {
                state.items.splice(index, 1);
            } else {
                state.items.push(action.payload);
            }
        },
    },
})

export const { toggleFavorite } = favoritesSlice.actions

export const selectFavorites = (state) => state.favorites.items;
export const selectIsFavorite = (state, id) => state.favorites.items.includes(id);

export default favoritesSlice.reducer

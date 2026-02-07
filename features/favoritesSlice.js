import { createSlice } from '@reduxjs/toolkit'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@bordeaux_date_favorites';

const initialState = {
  items: [], // Array of restaurant IDs
  loaded: false,
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
    setFavorites: (state, action) => {
      state.items = action.payload;
      state.loaded = true;
    },
  },
})

export const { toggleFavorite, setFavorites } = favoritesSlice.actions

// ── Thunks for AsyncStorage persistence ──

/** Load favorites from disk into Redux */
export const loadFavorites = () => async (dispatch) => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      dispatch(setFavorites(JSON.parse(stored)));
    } else {
      dispatch(setFavorites([]));
    }
  } catch (e) {
    console.warn('Failed to load favorites:', e);
    dispatch(setFavorites([]));
  }
};

/** Persist current favorites to disk */
export const persistFavorites = () => async (_, getState) => {
  try {
    const items = getState().favorites.items;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to persist favorites:', e);
  }
};

/** Toggle + persist in one dispatch */
export const toggleFavoriteAndPersist = (id) => (dispatch) => {
  dispatch(toggleFavorite(id));
  dispatch(persistFavorites());
};

// ── Selectors ──
export const selectFavorites = (state) => state.favorites.items;
export const selectIsFavorite = (state, id) => state.favorites.items.includes(id);
export const selectFavoritesLoaded = (state) => state.favorites.loaded;

export default favoritesSlice.reducer

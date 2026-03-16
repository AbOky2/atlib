import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'
const TOKEN_KEY = '@atlib_customer_token'
const USER_KEY = '@atlib_customer_user'

// ── Thunks ─────────────────────────────────────────────────────────────────

export const loadStoredAuth = createAsyncThunk('auth/loadStored', async () => {
  const token = await AsyncStorage.getItem(TOKEN_KEY)
  const userStr = await AsyncStorage.getItem(USER_KEY)
  if (!token || !userStr) return null
  return { token, user: JSON.parse(userStr) }
})

export const loginCustomer = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) return rejectWithValue(data.error ?? 'Identifiants incorrects')
    await AsyncStorage.setItem(TOKEN_KEY, data.token)
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user))
    return data
  } catch {
    return rejectWithValue('Serveur inaccessible')
  }
})

export const registerCustomer = createAsyncThunk('auth/register', async ({ email, password, name, phone }, { rejectWithValue }) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, phone }),
    })
    const data = await res.json()
    if (!res.ok) return rejectWithValue(data.error ?? 'Erreur lors de l\'inscription')
    await AsyncStorage.setItem(TOKEN_KEY, data.token)
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user))
    return data
  } catch {
    return rejectWithValue('Serveur inaccessible')
  }
})

export const logoutCustomer = createAsyncThunk('auth/logout', async () => {
  await AsyncStorage.removeItem(TOKEN_KEY)
  await AsyncStorage.removeItem(USER_KEY)
})

// ── Slice ───────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isLoading: false,
    error: null,
    hydrated: false,
  },
  reducers: {
    clearAuthError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    // loadStoredAuth
    builder.addCase(loadStoredAuth.fulfilled, (state, action) => {
      state.hydrated = true
      if (action.payload) {
        state.token = action.payload.token
        state.user = action.payload.user
      }
    })
    builder.addCase(loadStoredAuth.rejected, (state) => { state.hydrated = true })

    // login
    builder.addCase(loginCustomer.pending, (state) => { state.isLoading = true; state.error = null })
    builder.addCase(loginCustomer.fulfilled, (state, action) => {
      state.isLoading = false
      state.token = action.payload.token
      state.user = action.payload.user
    })
    builder.addCase(loginCustomer.rejected, (state, action) => {
      state.isLoading = false
      state.error = action.payload ?? 'Erreur inconnue'
    })

    // register
    builder.addCase(registerCustomer.pending, (state) => { state.isLoading = true; state.error = null })
    builder.addCase(registerCustomer.fulfilled, (state, action) => {
      state.isLoading = false
      state.token = action.payload.token
      state.user = action.payload.user
    })
    builder.addCase(registerCustomer.rejected, (state, action) => {
      state.isLoading = false
      state.error = action.payload ?? 'Erreur inconnue'
    })

    // logout
    builder.addCase(logoutCustomer.fulfilled, (state) => {
      state.token = null
      state.user = null
    })
  },
})

export const { clearAuthError } = authSlice.actions

// ── Selectors ───────────────────────────────────────────────────────────────

export const selectIsAuthenticated = (state) => !!state.auth.token
export const selectCurrentUser = (state) => state.auth.user
export const selectAuthToken = (state) => state.auth.token
export const selectAuthLoading = (state) => state.auth.isLoading
export const selectAuthError = (state) => state.auth.error
export const selectAuthHydrated = (state) => state.auth.hydrated

export default authSlice.reducer

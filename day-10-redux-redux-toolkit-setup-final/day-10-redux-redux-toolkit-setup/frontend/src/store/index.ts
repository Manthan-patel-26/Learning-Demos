/**
 * ============================================================
 * DAY 10: Redux Toolkit Store - Complete Setup
 * ============================================================
 * Demonstrates:
 *  - configureStore with multiple slices
 *  - TypedRootState and AppDispatch for type safety
 *  - createAsyncThunk for API calls
 *  - Entity adapter pattern for normalized state
 */

import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import authReducer from "./slices/authSlice";
import productsReducer from "./slices/productsSlice";
import cartReducer from "./slices/cartSlice";

// ─── CONFIGURE STORE ──────────────────────────────────────
// configureStore automatically:
//   - Sets up Redux DevTools
//   - Adds thunk middleware for async actions
//   - Adds serializability check (warns if you put non-serializable data in state)
export const store = configureStore({
  reducer: {
    auth: authReducer,       // User authentication state
    products: productsReducer, // Product list, loading, errors
    cart: cartReducer,       // Shopping cart items
  },
  // Optional: customize middleware
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // serializableCheck: Warns if you put Date objects, functions in state
      // Turn off if you have specific needs, but understand the tradeoffs
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"], // If using redux-persist
      },
    }),
  // devTools: true in dev, false in prod (auto-detected from NODE_ENV)
  devTools: process.env.NODE_ENV !== "production",
});

// ─── TYPE EXPORTS ─────────────────────────────────────────
// RootState: the full type of your Redux store
// Extract it from `store.getState` so it's always up to date
// Don't write this manually — it will drift out of sync!
export type RootState = ReturnType<typeof store.getState>;

// AppDispatch: the dispatch type, including thunk support
// Without this, dispatch() won't know about async thunks
export type AppDispatch = typeof store.dispatch;

// ─── TYPED HOOKS ──────────────────────────────────────────
// Use these instead of the raw useSelector/useDispatch.
// They're pre-typed so you don't have to type RootState every time.
//
// ❌ Wrong: const count = useSelector((state: RootState) => state.cart.count)
// ✅ Right: const count = useAppSelector((state) => state.cart.count)

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

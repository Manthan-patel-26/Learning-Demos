/**
 * DAY 11: Redux Store with RTK Query
 * The ecommerceApi.reducer handles all caching automatically.
 */
import { configureStore } from "@reduxjs/toolkit";
import { ecommerceApi } from "./api";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

export const store = configureStore({
  reducer: {
    // RTK Query injects its reducer at the key you defined in reducerPath
    [ecommerceApi.reducerPath]: ecommerceApi.reducer,
  },
  // RTK Query middleware handles cache lifetime, invalidation, polling
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(ecommerceApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

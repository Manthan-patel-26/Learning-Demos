/**
 * ============================================================
 * CART SLICE - Local State with Sync Reducers
 * ============================================================
 * The cart is local state (no API needed until checkout).
 * This shows the simplest slice pattern with Immer.
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  checkoutStatus: "idle" | "loading" | "success" | "error";
  orderId: string | null;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  checkoutStatus: "idle",
  orderId: null,
  error: null,
};

// Async checkout
export const checkout = createAsyncThunk<{ id: string }, CartItem[]>(
  "cart/checkout",
  async (items, { rejectWithValue }) => {
    try {
      const res = await fetch("http://localhost:3001/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      return data.data as { id: string };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Checkout failed");
    }
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Add to cart or increment quantity if already in cart
    addItem(state, action: PayloadAction<Omit<CartItem, "quantity">>) {
      const existing = state.items.find((i) => i.productId === action.payload.productId);
      if (existing) {
        // Immer: this LOOKS like mutation, RTK makes it immutable
        existing.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
    },
    removeItem(state, action: PayloadAction<string>) { // payload = productId
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    updateQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const item = state.items.find((i) => i.productId === action.payload.productId);
      if (item) {
        if (action.payload.quantity <= 0) {
          // Remove if quantity goes to 0
          state.items = state.items.filter((i) => i.productId !== action.payload.productId);
        } else {
          item.quantity = action.payload.quantity;
        }
      }
    },
    clearCart(state) {
      state.items = [];
      state.checkoutStatus = "idle";
      state.orderId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkout.pending, (state) => { state.checkoutStatus = "loading"; state.error = null; })
      .addCase(checkout.fulfilled, (state, action) => {
        state.checkoutStatus = "success";
        state.orderId = action.payload.id;
        state.items = []; // Clear cart on successful checkout
      })
      .addCase(checkout.rejected, (state, action) => {
        state.checkoutStatus = "error";
        state.error = action.payload as string ?? "Checkout failed";
      });
  },
});

export const { addItem, removeItem, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

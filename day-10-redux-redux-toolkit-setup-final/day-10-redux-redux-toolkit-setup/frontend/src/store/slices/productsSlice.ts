/**
 * ============================================================
 * PRODUCTS SLICE - Normalized State with EntityAdapter
 * ============================================================
 * createEntityAdapter normalizes your data into:
 *   { ids: ["1","2","3"], entities: { "1": {...}, "2": {...} } }
 *
 * WHY NORMALIZE?
 *  - O(1) lookup by ID instead of O(n) array.find()
 *  - No duplication if product appears in multiple lists
 *  - Easier to update: just update one entity, all views update
 */

import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  EntityState,
  PayloadAction,
} from "@reduxjs/toolkit";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  rating: number;
}

// createEntityAdapter<T>: T must have an `id: string` field
const productsAdapter = createEntityAdapter<Product>();

interface ProductsState extends EntityState<Product, string> {
  loading: boolean;
  error: string | null;
  selectedCategory: string | null;
}

// getInitialState() sets up the normalized structure + your extra fields
const initialState: ProductsState = productsAdapter.getInitialState({
  loading: false,
  error: null,
  selectedCategory: null,
});

export const fetchProducts = createAsyncThunk<Product[]>(
  "products/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("http://localhost:3001/api/products");
      const data = await res.json();
      if (data.status !== "success")
        throw new Error(data.error?.message ?? "Failed");
      return data.data as Product[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Could not fetch products",
      );
    }
  },
);

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setSelectedCategory(state, action: PayloadAction<string | null>) {
      state.selectedCategory = action.payload;
    },
    // updateOne, removeOne, addOne, etc. are provided by the adapter!
    updateProductStock(
      state,
      action: PayloadAction<{ id: string; stock: number }>,
    ) {
      productsAdapter.updateOne(state, {
        id: action.payload.id,
        changes: { stock: action.payload.stock },
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        // setAll: replace all entities with the fetched ones
        productsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to load products";
      });
  },
});

// Export the auto-generated selectors from the adapter
// These already know how to select from state.products
export const {
  selectAll: selectAllProducts,
  selectById: selectProductById,
  selectTotal: selectProductCount,
} = productsAdapter.getSelectors();

export const { setSelectedCategory, updateProductStock } =
  productsSlice.actions;
export default productsSlice.reducer;

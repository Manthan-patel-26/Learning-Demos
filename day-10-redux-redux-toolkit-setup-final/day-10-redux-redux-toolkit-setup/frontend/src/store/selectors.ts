/**
 * ============================================================
 * SELECTORS with RESELECT - Memoized Derived State
 * ============================================================
 * Problem: useSelector re-renders your component on EVERY store change,
 * even if the data you selected didn't change.
 *
 * createSelector memoizes: only recomputes if inputs change.
 * If products or cart items didn't change, returns cached result.
 *
 * WHY SEPARATE SELECTORS FILE?
 *  - Reuse the same selector across multiple components
 *  - Memoization is shared (one cache, not one per component)
 *  - Easier to test
 *  - Centralized logic for "what the UI needs" vs "what the store has"
 */

import { createSelector } from "reselect";
import { RootState } from "./index";
import { selectAllProducts } from "./slices/productsSlice";

// ─── BASIC SELECTORS (input selectors) ────────────────────
// These are simple — just read a piece of state.
// Used as inputs to createSelector.

const selectProductsState = (state: RootState) => state.products;
const selectCartState = (state: RootState) => state.cart;
const selectAuthState = (state: RootState) => state.auth;

// ─── DERIVED SELECTORS ────────────────────────────────────

/**
 * Select all products as an array (from normalized state).
 * Memoized: only recomputes when the products entity map changes.
 */
export const selectAllProductsList = createSelector(
  selectProductsState,
  (productsState) => selectAllProducts(productsState),
);

/**
 * Select products filtered by the selected category.
 * Only recomputes when products list OR selectedCategory changes.
 */
export const selectFilteredProducts = createSelector(
  selectAllProductsList,
  (state: RootState) => state.products.selectedCategory,
  (products, selectedCategory) => {
    if (!selectedCategory) return products;
    return products.filter((p) => p.category === selectedCategory);
  },
);

/**
 * Select unique product categories from the product list.
 */
export const selectCategories = createSelector(
  selectAllProductsList,
  (products) => [...new Set(products.map((p) => p.category))],
);

/**
 * Cart total item count (for the cart badge).
 * Memoized: only recomputes when cart items change.
 */
export const selectCartItemCount = createSelector(selectCartState, (cart) =>
  cart.items.reduce((sum, item) => sum + item.quantity, 0),
);

/**
 * Cart subtotal.
 */
export const selectCartSubtotal = createSelector(selectCartState, (cart) =>
  cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
);

/**
 * Combine cart + products to get enriched cart items.
 * The cart only stores productId/price/name — this adds product details.
 */
export const selectCartWithDetails = createSelector(
  selectCartState,
  selectAllProductsList,
  (cart, products) =>
    cart.items.map((cartItem) => {
      const product = products.find((p) => p.id === cartItem.productId);
      return {
        ...cartItem,
        rating: product?.rating ?? 0,
        maxStock: product?.stock ?? 0,
        isOutOfStock: (product?.stock ?? 0) === 0,
      };
    }),
);

/**
 * Auth convenience selectors
 */
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAdmin = (state: RootState) =>
  state.auth.user?.role === "admin";
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;

// Re-export for convenience
export const selectProductsLoading = (state: RootState) =>
  state.products.loading;
export const selectProductsError = (state: RootState) => state.products.error;
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCheckoutStatus = (state: RootState) =>
  state.cart.checkoutStatus;
export const selectSelectedCategory = (state: RootState) =>
  state.products.selectedCategory;

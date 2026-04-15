/**
 * ============================================================
 * DAY 11: RTK QUERY API SERVICE
 * ============================================================
 * RTK Query is a powerful data-fetching and caching tool built
 * into Redux Toolkit. It eliminates the need for writing
 * thunks, reducers, and loading/error state management manually.
 *
 * KEY CONCEPTS:
 *  1. createApi        — defines your API "service"
 *  2. fetchBaseQuery   — like fetch(), but pre-configured
 *  3. endpoints        — each query/mutation is an endpoint
 *  4. Tags (cache)     — RTK Query knows WHEN to invalidate cache
 *  5. Optimistic updates — update UI before server responds
 *  6. Prefetching      — load data before user needs it
 *  7. Pagination       — cursor/page-based with serializeQueryArgs
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// ─── TYPES ────────────────────────────────────────────────

export interface Product {
  id: string; name: string; price: number; category: string;
  stock: number; rating: number; imageUrl: string; description: string;
}

export interface CartItem {
  productId: string; quantity: number;
  product?: Product;
}

export interface PaginatedProducts {
  data: Product[];
  pagination: {
    page: number; limit: number; total: number;
    totalPages: number; hasNextPage: boolean;
  };
}

export interface ProductsQueryArgs {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

// ─── CREATE API ───────────────────────────────────────────
/**
 * createApi defines ALL your server interactions in one place.
 * - reducerPath: where it's stored in Redux state
 * - baseQuery:   how to make requests (like Axios baseURL + headers)
 * - tagTypes:    labels for cache groups (used for invalidation)
 * - endpoints:   your actual API calls
 */
export const ecommerceApi = createApi({
  reducerPath: "ecommerceApi",

  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:3001/api",
    // Add auth headers here for real apps:
    // prepareHeaders: (headers, { getState }) => {
    //   const token = (getState() as RootState).auth.accessToken;
    //   if (token) headers.set("Authorization", `Bearer ${token}`);
    //   return headers;
    // },
  }),

  // tagTypes: named cache groups. Mutations "invalidate" tags,
  // causing any queries "providing" those tags to refetch.
  tagTypes: ["Product", "Cart", "Order"],

  endpoints: (builder) => ({

    // ── QUERY: Paginated product list ─────────────────────
    // builder.query<ResultType, ArgType>
    getProducts: builder.query<PaginatedProducts, ProductsQueryArgs>({
      query: ({ page = 1, limit = 10, category, search } = {}) => {
        const params = new URLSearchParams({
          page: String(page), limit: String(limit),
          ...(category && { category }),
          ...(search && { search }),
        });
        return `/products?${params}`;
      },

      // providesTags: tells RTK Query "this query's cache represents these tags"
      // When something invalidates "Product", this query will refetch.
      providesTags: (result) =>
        result
          ? [
              // Tag each individual product
              ...result.data.map(({ id }) => ({ type: "Product" as const, id })),
              // Tag the whole list
              { type: "Product", id: "LIST" },
            ]
          : [{ type: "Product", id: "LIST" }],

      // ── INFINITE SCROLL with serializeQueryArgs ──────────
      // serializeQueryArgs: controls what counts as the "same query" for caching.
      // By ignoring `page`, all pages share the same cache entry.
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const { page: _page, ...rest } = queryArgs;
        return `${endpointName}(${JSON.stringify(rest)})`;
      },

      // merge: how to combine new page data with existing cache
      // Called when serializeQueryArgs returns the same key but page changed
      merge: (currentCache, newData, { arg }) => {
        if (arg.page === 1 || !arg.page) {
          // Fresh start (filter changed or first load)
          return newData;
        }
        // Append new products to existing list
        return {
          ...newData,
          data: [...currentCache.data, ...newData.data],
        };
      },

      // forceRefetch: always fetch if page changed (needed for infinite scroll)
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.page !== previousArg?.page,
    }),

    // ── QUERY: Single product ─────────────────────────────
    getProduct: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      // Transform raw response to extract the data field
      transformResponse: (response: { data: Product }) => response.data,
      providesTags: (_result, _err, id) => [{ type: "Product", id }],
    }),

    // ── MUTATION: Update product price (OPTIMISTIC UPDATE) ─
    // Optimistic update: update the UI immediately, before server confirms.
    // If server fails → roll back to the old value.
    updateProduct: builder.mutation<Product, { id: string; changes: Partial<Product> }>({
      query: ({ id, changes }) => ({
        url: `/products/${id}`,
        method: "PATCH",
        body: changes,
      }),

      // onQueryStarted: runs immediately when mutation is triggered
      // Before awaiting the server, we can update the cache optimistically.
      async onQueryStarted({ id, changes }, { dispatch, queryFulfilled }) {
        // OPTIMISTIC: immediately update the single-product cache
        const patchResult = dispatch(
          ecommerceApi.util.updateQueryData("getProduct", id, (draft) => {
            // Immer draft — mutate directly
            Object.assign(draft, changes);
          })
        );

        try {
          await queryFulfilled; // Wait for server response
          // Server confirmed → keep the optimistic update
        } catch {
          // Server rejected → ROLLBACK the optimistic update
          patchResult.undo();
          console.error("Update failed, rolled back optimistic update");
        }
      },

      // Also invalidate the list cache to refetch
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),

    // ── QUERY: Get cart ───────────────────────────────────
    getCart: builder.query<CartItem[], string>({
      query: (userId) => `/cart/${userId}`,
      transformResponse: (response: { data: CartItem[] }) => response.data,
      providesTags: ["Cart"],
    }),

    // ── MUTATION: Add to cart (OPTIMISTIC) ────────────────
    addToCart: builder.mutation<CartItem[], { userId: string; productId: string; quantity?: number }>({
      query: ({ userId, productId, quantity = 1 }) => ({
        url: `/cart/${userId}/items`,
        method: "POST",
        body: { productId, quantity },
      }),

      // Optimistic add to cart — the user sees instant feedback
      async onQueryStarted({ userId, productId, quantity = 1 }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          ecommerceApi.util.updateQueryData("getCart", userId, (draft) => {
            const existing = draft.find(i => i.productId === productId);
            if (existing) {
              existing.quantity += quantity;
            } else {
              draft.push({ productId, quantity });
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo(); // Rollback if server rejects
        }
      },

      // invalidatesTags: "Cart" tag is invalidated → getCart will refetch
      invalidatesTags: ["Cart"],
    }),

    // ── MUTATION: Remove from cart ────────────────────────
    removeFromCart: builder.mutation<void, { userId: string; productId: string }>({
      query: ({ userId, productId }) => ({
        url: `/cart/${userId}/items/${productId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Cart"],
    }),

    // ── MUTATION: Place order ─────────────────────────────
    placeOrder: builder.mutation<{ id: string }, { userId: string; items: CartItem[] }>({
      query: (body) => ({ url: "/orders", method: "POST", body }),
      transformResponse: (response: { data: { id: string } }) => response.data,
      // Placing an order clears the cart + creates an order
      invalidatesTags: ["Cart", "Order"],
    }),
  }),
});

// ─── EXPORT AUTO-GENERATED HOOKS ──────────────────────────
// RTK Query generates typed React hooks from every endpoint automatically!
// Naming: use<EndpointName>Query / use<EndpointName>Mutation
export const {
  useGetProductsQuery,
  useGetProductQuery,
  useUpdateProductMutation,
  useGetCartQuery,
  useAddToCartMutation,
  useRemoveFromCartMutation,
  usePlaceOrderMutation,
  // usePrefetch: manually trigger prefetch (e.g., on hover)
  usePrefetch,
} = ecommerceApi;

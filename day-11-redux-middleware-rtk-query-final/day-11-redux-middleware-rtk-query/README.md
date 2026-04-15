# Day 11: Redux Middleware & Side Effects (RTK Query)

**Date:** February 25, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build

RTK Query integration for the e-commerce API: auto-caching, optimistic cart updates, infinite scroll pagination, and prefetching on hover.

## 🚀 How to Run

```bash
cd backend && npm install && npm run dev   # port 3001
cd frontend && npm install && npm start   # port 3000
```

## 📁 Key Files

```
frontend/src/store/
├── api.ts     ← ALL RTK Query endpoints, tags, optimistic updates, infinite scroll
└── index.ts   ← Store setup with RTK Query middleware
```

## 📖 RTK Query vs Manual Redux

| Feature       | Manual (Day 10)          | RTK Query (Day 11)        |
| ------------- | ------------------------ | ------------------------- |
| Fetch data    | Write thunk              | `useGetProductsQuery()`   |
| Loading state | `loading: boolean` field | `isFetching` from hook    |
| Error state   | `error: string` field    | `isError` from hook       |
| Caching       | Write it yourself        | Automatic, configurable   |
| Invalidation  | Manual dispatch calls    | Tag-based declarative     |
| Optimistic UI | Complex onQueryStarted   | Built-in rollback support |

## 📖 Key Concepts

### 1. Cache Tags — How Invalidation Works

```typescript
// getProducts "provides" the "Product" tag
providesTags: [{ type: "Product", id: "LIST" }],

// updateProduct "invalidates" the "Product" tag
invalidatesTags: [{ type: "Product", id }],
// → RTK Query automatically refetches getProducts. No manual dispatch needed!
```

### 2. Optimistic Updates (click ★+ button in the demo)

```typescript
async onQueryStarted({ id, changes }, { dispatch, queryFulfilled }) {
  const patch = dispatch(api.util.updateQueryData("getProduct", id, draft => {
    Object.assign(draft, changes); // Update cache immediately
  }));
  try {
    await queryFulfilled; // Server confirmed ✅
  } catch {
    patch.undo();          // Server rejected → rollback 🔄
  }
}
```

### 3. Infinite Scroll

```typescript
serializeQueryArgs: ({ queryArgs: { page: _, ...rest } }) =>
  JSON.stringify(rest), // Same cache key for all pages (filter defines identity)

merge: (existing, incoming, { arg }) =>
  arg.page === 1 ? incoming   // Fresh start when filter changes
  : { ...incoming, data: [...existing.data, ...incoming.data] }, // Append

forceRefetch: ({ currentArg, previousArg }) =>
  currentArg?.page !== previousArg?.page, // Always re-fetch for new pages
```

### 4. Prefetching (hover over "Load More" to see it)

```typescript
const prefetchProducts = usePrefetch("getProducts");
<button onMouseEnter={() => prefetchProducts({ page: page + 1 })}>
  Load More
</button>
// Data is in cache by the time user clicks!
```

## ⚠️ Gotchas

| Problem             | Detail                                                              |
| ------------------- | ------------------------------------------------------------------- |
| Skip a query        | `skip: !userId` — don't fetch if no user logged in                  |
| Polling             | Add `pollingInterval: 30000` to auto-refetch every 30s              |
| Manual cache update | `api.util.upsertQueryData("getProduct", id, newData)`               |
| Cache invalidation  | Always use `invalidatesTags` on mutations — never manual `dispatch` |

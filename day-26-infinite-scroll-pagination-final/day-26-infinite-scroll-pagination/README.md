# Day 26 — Infinite Scroll & Pagination

## What You'll Learn
- **Intersection Observer API** – how browsers detect element visibility
- **Cursor-based pagination** – why it beats offset pagination at scale
- **React Query `useInfiniteQuery`** – the right tool for paginated data
- **Skeleton loading** – perceived performance tricks
- **Scroll position restoration** – back-navigation UX
- **Accessibility** – `role="feed"`, `aria-live`, `aria-busy`

---

## Project Structure

```
day-26-infinite-scroll-pagination/
├── backend/
│   ├── src/
│   │   ├── index.ts              ← Express app entry point
│   │   ├── routes/products.ts   ← Cursor-based pagination API
│   │   ├── utils/cursor.ts      ← Encode/decode opaque cursors
│   │   ├── middleware/errorHandler.ts
│   │   ├── types/index.ts
│   │   └── seed.ts              ← Generates 200 sample products
│   ├── prisma/schema.prisma
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ProductList.tsx   ← Main list with sentinel
    │   │   ├── ProductCard.tsx   ← Individual card + lazy image
    │   │   ├── SkeletonCard.tsx  ← Loading placeholder
    │   │   └── ProductFilters.tsx
    │   ├── hooks/
    │   │   ├── useInfiniteScroll.ts  ← Core: Observer + React Query
    │   │   └── useScrollRestoration.ts
    │   ├── api/products.ts
    │   └── types/index.ts
    └── package.json
```

---

## Prerequisites

- **Node.js v22+** — `node --version`
- **npm v10+** — `npm --version`

---

## Quick Start

### 1. Start the Backend

```bash
cd backend
npm install

# Generate Prisma client (required first time)
npx prisma generate

# Create the SQLite database and run migrations
npx prisma migrate dev --name init

# Seed with 200 sample products
npm run seed

# Start the dev server (hot reload with tsx)
npm run dev
```

Backend runs at: **http://localhost:3001**

### 2. Start the Frontend

```bash
# In a new terminal
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

Open your browser → you should see the product grid loading infinitely as you scroll!

---

## API Reference

### `GET /api/products`

Returns a paginated list of products.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | string | — | Opaque cursor from previous response |
| `limit` | number | 20 | Items per page (max: 100) |
| `category` | string | — | Filter by category |
| `sortBy` | enum | `createdAt` | `price` \| `rating` \| `createdAt` |
| `sortOrder` | enum | `desc` | `asc` \| `desc` |

**Response:**
```json
{
  "data": [{ "id": "...", "name": "...", "price": 29.99, ... }],
  "pagination": {
    "nextCursor": "eyJpZCI6Ii4uLiIsImNyZWF0ZWRBdCI6Ii4uLiJ9",
    "hasNextPage": true,
    "limit": 12
  }
}
```

When `nextCursor` is `null`, there are no more pages.

### `GET /api/products/categories`

Returns all categories with product counts.

```json
{ "data": [{ "name": "Electronics", "count": 34 }, ...] }
```

---

## Key Concepts Explained

### Cursor Pagination vs Offset Pagination

| | Offset (`SKIP 100`) | Cursor (after ID) |
|---|---|---|
| Performance | O(n) — scans skipped rows | O(log n) — uses index |
| Stable under mutations | ❌ Items shift on insert/delete | ✅ Stable |
| Random access | ✅ Jump to any page | ❌ Must traverse |
| Use case | Admin tables, small datasets | Infinite scroll, feeds |

### How Intersection Observer Works

```
┌─────────────────────────────┐
│         Viewport            │
│  ┌───────────────────────┐  │
│  │  Product Card 1       │  │
│  ├───────────────────────┤  │
│  │  Product Card 2       │  │
│  ├───────────────────────┤  │
│  │  Product Card 3       │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
    ↓ user scrolls down ↓
┌─────────────────────────────┐
│  Product Card 8             │
│  Product Card 9             │
│ ┌─────────────────────────┐ │
│ │  [SENTINEL enters view] │ │  ← Observer fires!
│ └─────────────────────────┘ │     → fetchNextPage()
└─────────────────────────────┘
```

### The "fetch n+1" trick

To know if there's a next page WITHOUT doing a COUNT(*) query:
1. Request `limit + 1` items from the database
2. If you got `limit + 1` items back → there IS a next page
3. Return only `limit` items to the client
4. The `(limit+1)`th item becomes the cursor for the next page

---

## Common Gotchas (from the curriculum)

### 1. Race Conditions
If filters change while a fetch is in progress, React Query automatically cancels the
stale query and only shows results for the latest query. The `queryKey: ['products', filters]`
ensures each filter combination has its own cache entry.

### 2. Scroll Position on Back Navigation
The `useScrollRestoration` hook saves to `sessionStorage` on scroll and restores on mount.
The key challenge: the DOM must render content before you can scroll to a saved position.
That's why we use `requestAnimationFrame` to defer the scroll.

### 3. CLS (Cumulative Layout Shift)
Skeleton cards + `aspect-ratio: 4/3` on images prevent layout shift.
Without explicit dimensions, images cause the layout to "jump" when they load.

### 4. Accessibility with Infinite Scroll
- `role="feed"` — semantic role for infinite scrollable content
- `aria-busy` — tells screen readers data is loading
- `aria-live="polite"` — announces new content without interrupting
- End-of-list message — screen reader users need to know loading has stopped

---

## Extending This Project

Ideas to take it further:

1. **Virtual scrolling** — render only visible items using `@tanstack/react-virtual`
   (for 10,000+ items, rendering all DOM nodes is too slow)

2. **Optimistic updates** — add a "Add to Cart" button that updates instantly

3. **Search** — add debounced search (covered in Day 27!)

4. **PostgreSQL** — swap SQLite: change `provider = "postgresql"` in schema and update `DATABASE_URL`

5. **Redis cursor caching** — cache cursor→offset mappings for deep pagination

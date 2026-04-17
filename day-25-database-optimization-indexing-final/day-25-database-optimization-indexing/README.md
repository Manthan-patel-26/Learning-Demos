# Day 25: Database Optimization & Indexing

**Date:** March 17, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Interactive benchmark dashboard: run 5 slow queries, add indexes with one click, re-run and see the speedup. Live EXPLAIN ANALYZE plans show Seq Scan → Index Scan.

## 🚀 How to Run

### 1. Start PostgreSQL
```bash
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=ecommerce_db \
  postgres:16-alpine
```

### 2. Set up database (creates 460k rows)
```bash
cd backend
cp .env.example .env        # Edit DATABASE_URL if needed
npm install
npm run db:setup            # Takes ~30 seconds
```

### 3. Start servers
```bash
npm run dev                 # Backend on port 3001
cd ../frontend && npm install && npm start  # Frontend on port 3000
```

### 4. Benchmark workflow
1. Open http://localhost:3000
2. Click "▶ Run" on each query — note the `durationMs` and "❌ Seq Scan"
3. Click **"+ Add All Indexes"**
4. Click "▶ Run" again — compare `durationMs` and "✅ Index Scan"
5. Use the EXPLAIN ANALYZE playground for custom queries

## 📁 Key Files
```
backend/src/
├── queries/
│   ├── setup.ts          ← Creates schema + 460k rows of test data
│   └── optimizations.ts  ← All SLOW/FAST query pairs + index SQL
└── index.ts              ← Benchmark API server
```

## 📖 Key Concepts

### EXPLAIN ANALYZE — Read a Query Plan
```sql
EXPLAIN ANALYZE
  SELECT * FROM orders WHERE status = 'pending';

-- WITHOUT index:
-- Seq Scan on orders  (cost=0.00..2345.00 rows=20000) (actual time=0.043..45.231)
--   Filter: (status = 'pending')
--   Rows Removed by Filter: 80000
-- Execution Time: 48.234 ms

-- WITH index on (status):
-- Index Scan using idx_orders_status on orders  (cost=0.42..85.36 rows=20000) (actual time=0.023..1.234)
-- Execution Time: 1.456 ms   ← 30x faster!
```

### When to Create an Index

```sql
-- ✅ Index on frequently filtered columns
CREATE INDEX idx_orders_status ON orders(status);
-- Use when: WHERE status = 'pending' appears often

-- ✅ Composite index for multi-column filters (column order matters!)
CREATE INDEX idx_products_cat_active ON products(category_id, is_active);
-- Use when: WHERE category_id = $1 AND is_active = TRUE appears often
-- ORDER: equality columns first, range/sort columns last

-- ✅ Partial index (smaller, faster, perfect for filtered queries)
CREATE INDEX idx_orders_pending ON orders(created_at)
  WHERE status = 'pending';
-- Only indexes ~20% of rows — much smaller than full index!

-- ❌ Don't over-index (each index slows INSERT/UPDATE/DELETE)
-- Rule of thumb: if you have 5+ indexes per table, reconsider
```

### N+1 Query Problem (Most Common Performance Bug)
```typescript
// ❌ N+1: 1 query for orders + N queries for users = 101 DB calls
const orders = await db.query("SELECT * FROM orders LIMIT 100");
for (const order of orders.rows) {
  const user = await db.query("SELECT * FROM users WHERE id = $1", [order.user_id]);
  order.user = user.rows[0];
}

// ✅ 1 JOIN query = 1 DB call
const orders = await db.query(`
  SELECT o.*, u.name AS user_name, u.email AS user_email
  FROM orders o JOIN users u ON u.id = o.user_id
  LIMIT 100
`);
```

## ⚠️ Index Gotchas

| Issue | Detail |
|-------|--------|
| Over-indexing | Every index slows writes (INSERT/UPDATE/DELETE). Only index what you query! |
| Column order | `INDEX ON (a, b)` helps `WHERE a = ?` and `WHERE a = ? AND b = ?`, but NOT `WHERE b = ?` alone |
| Low selectivity | Index on a boolean (`is_active`) may not be used — only 2 distinct values |
| LIKE queries | `LIKE 'prefix%'` can use index, `LIKE '%suffix'` cannot |
| NULL values | NULLs are indexed. `WHERE col IS NULL` can use index |
| Vacuum needed | Run `ANALYZE orders` after bulk inserts to update PostgreSQL statistics |

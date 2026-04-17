/**
 * ============================================================
 * DAY 25: QUERY OPTIMIZATION — Before & After Comparisons
 * ============================================================
 * Every optimization is paired: SLOW version vs FAST version.
 * Use EXPLAIN ANALYZE to see the query plan and actual timing.
 *
 * HOW TO USE:
 *   1. Run npm run db:setup (creates 460k rows)
 *   2. Run npm run dev
 *   3. Visit http://localhost:3001 to benchmark each query
 *   4. Click "Add Indexes" to see the improvement
 */

import { Pool, QueryResultRow } from "pg";
import dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
  connectionString: process.env["DATABASE_URL"] ??
    "postgresql://postgres:password@localhost:5432/ecommerce_db",
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

// ─── EXPLAIN ANALYZE HELPER ───────────────────────────────
// Returns both the query result AND the execution plan.
// The plan shows: Seq Scan (no index) vs Index Scan (using index).
export async function explainQuery<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<{
  rows: T[];
  durationMs: number;
  plan: string;
  usesIndex: boolean;
}> {
  const client = await pool.connect();
  try {
    const start = Date.now();

    // Run the actual query first to get results
    const result = await client.query<T>(sql, params);
    const durationMs = Date.now() - start;

    // Run EXPLAIN ANALYZE to get the query plan
    const explainResult = await client.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`,
      params
    );

    const plan = explainResult.rows
      .map((r: Record<string, string>) => r["QUERY PLAN"])
      .join("\n");

    // Check if the plan uses an index (look for "Index Scan" in the plan)
    const usesIndex = plan.includes("Index Scan") || plan.includes("Index Only Scan");

    return { rows: result.rows, durationMs, plan, usesIndex };
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────
// OPTIMIZATION 1: Filter without vs with index on `status`
// ─────────────────────────────────────────────────────────

/**
 * SLOW: Finds pending orders — sequential scan of 100k rows!
 * Without an index, PostgreSQL reads EVERY row and checks the condition.
 * On 100k rows this takes ~50-200ms (gets worse as table grows).
 */
export const SLOW_findPendingOrders = `
  SELECT id, user_id, total_amount, created_at
  FROM orders
  WHERE status = 'pending'
  ORDER BY created_at DESC
  LIMIT 20;
`;

/**
 * After adding index on (status):
 * CREATE INDEX idx_orders_status ON orders(status);
 *
 * PostgreSQL uses the index to find only rows where status='pending'
 * directly — reads ~1/5 of rows instead of all 100k. Much faster!
 */
export const FAST_findPendingOrders = `
  SELECT id, user_id, total_amount, created_at
  FROM orders
  WHERE status = 'pending'
  ORDER BY created_at DESC
  LIMIT 20;
  -- Same SQL, but WITH the index it uses Index Scan instead of Seq Scan
`;

// ─────────────────────────────────────────────────────────
// OPTIMIZATION 2: N+1 query problem
// ─────────────────────────────────────────────────────────

/**
 * N+1 PROBLEM (never do this in application code):
 *   Query 1: SELECT * FROM orders WHERE id IN (1...20) → 20 orders
 *   Query 2: SELECT * FROM users WHERE id = 1
 *   Query 3: SELECT * FROM users WHERE id = 2
 *   ...
 *   Query 21: SELECT * FROM users WHERE id = 20
 * Total: 21 queries for 20 orders! O(N) queries.
 */
export const NPLUSONE_description = `
  // This is what N+1 looks like in application code:
  const orders = await pool.query("SELECT * FROM orders LIMIT 20");
  for (const order of orders.rows) {
    // BAD: one query per order!
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [order.user_id]);
    order.user = user.rows[0];
  }
`;

/**
 * FIXED: Single JOIN query — O(1) database round trips!
 * PostgreSQL does the join efficiently with proper indexes.
 */
export const FIXED_ordersWithUsers = `
  SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    u.country
  FROM orders o
  -- JOIN is efficient because users.id is the PRIMARY KEY (automatic index)
  JOIN users u ON u.id = o.user_id
  WHERE o.status = 'delivered'
  ORDER BY o.created_at DESC
  LIMIT 20;
`;

// ─────────────────────────────────────────────────────────
// OPTIMIZATION 3: Composite index for multi-column filter
// ─────────────────────────────────────────────────────────

/**
 * SLOW: Filter by category AND active status — full table scan!
 * Even with index on category_id alone, PostgreSQL may not use it
 * efficiently when combined with is_active filter.
 */
export const SLOW_activeProductsByCategory = `
  SELECT id, name, price, stock
  FROM products
  WHERE category_id = $1
    AND is_active = TRUE
  ORDER BY price ASC
  LIMIT 20;
`;

/**
 * OPTIMIZED with composite index:
 * CREATE INDEX idx_products_cat_active ON products(category_id, is_active);
 *
 * Composite index rule: put the EQUALITY columns first, RANGE columns last.
 * column order in the index matters!
 * - category_id = $1 (equality) → goes first
 * - is_active = TRUE (equality) → goes second
 * - price (sort) → can be added third if needed
 */

// ─────────────────────────────────────────────────────────
// OPTIMIZATION 4: Aggregation with CTE
// ─────────────────────────────────────────────────────────

/**
 * SLOW: Top customers by spend — without indexes, this
 * requires scanning all 100k orders and 300k order_items.
 */
export const SLOW_topCustomers = `
  SELECT
    u.id,
    u.name,
    u.email,
    COUNT(DISTINCT o.id)::INT AS order_count,
    SUM(o.total_amount)::FLOAT AS total_spent,
    AVG(o.total_amount)::FLOAT AS avg_order_value
  FROM users u
  JOIN orders o ON o.user_id = u.id
  WHERE o.status != 'cancelled'
  GROUP BY u.id, u.name, u.email
  ORDER BY total_spent DESC
  LIMIT 10;
`;

/**
 * FAST: Use a CTE (Common Table Expression) with aggregate first,
 * then join to users only for the top 10.
 * This reduces the number of rows that need to be joined.
 */
export const FAST_topCustomers = `
  WITH customer_totals AS (
    -- Aggregate FIRST, then join — processes fewer rows
    SELECT
      user_id,
      COUNT(DISTINCT id)::INT AS order_count,
      SUM(total_amount)::FLOAT AS total_spent,
      AVG(total_amount)::FLOAT AS avg_order_value
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY user_id
    ORDER BY total_spent DESC
    LIMIT 10  -- Limit BEFORE joining to users
  )
  SELECT
    ct.*,
    u.name,
    u.email,
    u.country
  FROM customer_totals ct
  JOIN users u ON u.id = ct.user_id
  ORDER BY ct.total_spent DESC;
`;

// ─────────────────────────────────────────────────────────
// OPTIMIZATION 5: Partial index (index only when needed)
// ─────────────────────────────────────────────────────────

/**
 * Partial index: only index rows matching a WHERE condition.
 * Smaller index → faster lookups AND less storage!
 *
 * CREATE INDEX idx_orders_pending ON orders(created_at)
 *   WHERE status = 'pending';
 *
 * This index is only used when status = 'pending' in the query.
 * The index is much smaller than a full index on created_at.
 * Perfect when you always query by a specific status.
 */
export const QUERY_usingPartialIndex = `
  SELECT id, user_id, total_amount, created_at
  FROM orders
  WHERE status = 'pending'  -- Matches the partial index WHERE clause
    AND created_at > NOW() - INTERVAL '7 days'
  ORDER BY created_at DESC;
  -- PostgreSQL uses the partial index here instead of a full scan!
`;

// ─── SQL COMMANDS: Add all indexes ────────────────────────
export const ADD_INDEXES_SQL = `
  -- 1. Orders by status (most common filter)
  CREATE INDEX IF NOT EXISTS idx_orders_status
    ON orders(status);

  -- 2. Orders by user (for "user's order history")
  CREATE INDEX IF NOT EXISTS idx_orders_user_id
    ON orders(user_id);

  -- 3. Orders by date (for time-range queries)
  CREATE INDEX IF NOT EXISTS idx_orders_created_at
    ON orders(created_at DESC);

  -- 4. Composite: products by category AND active (most common product filter)
  CREATE INDEX IF NOT EXISTS idx_products_cat_active
    ON products(category_id, is_active);

  -- 5. Partial index: only pending orders (much smaller than full index)
  CREATE INDEX IF NOT EXISTS idx_orders_pending_date
    ON orders(created_at DESC)
    WHERE status = 'pending';

  -- 6. Order items by order (for "items in this order" lookups)
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id
    ON order_items(order_id);

  -- 7. Users by country (for regional reports)
  CREATE INDEX IF NOT EXISTS idx_users_country
    ON users(country);
`;

export const DROP_INDEXES_SQL = `
  DROP INDEX IF EXISTS idx_orders_status;
  DROP INDEX IF EXISTS idx_orders_user_id;
  DROP INDEX IF EXISTS idx_orders_created_at;
  DROP INDEX IF EXISTS idx_products_cat_active;
  DROP INDEX IF EXISTS idx_orders_pending_date;
  DROP INDEX IF EXISTS idx_order_items_order_id;
  DROP INDEX IF EXISTS idx_users_country;
`;

// ─── LIST ACTIVE INDEXES ──────────────────────────────────
export const LIST_INDEXES_SQL = `
  SELECT
    indexname,
    tablename,
    pg_size_pretty(pg_relation_size(indexname::REGCLASS)) AS index_size,
    CASE WHEN indexdef LIKE '%WHERE%' THEN 'Partial' ELSE 'Full' END AS index_type
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('orders', 'products', 'users', 'order_items')
  ORDER BY tablename, indexname;
`;

// ─── TABLE STATS ──────────────────────────────────────────
export const TABLE_STATS_SQL = `
  SELECT
    relname AS table_name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
  FROM pg_stat_user_tables
  WHERE relname IN ('orders', 'products', 'users', 'order_items')
  ORDER BY n_live_tup DESC;
`;

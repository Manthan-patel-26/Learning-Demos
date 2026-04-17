/**
 * ============================================================
 * DAY 25: Database Optimization — Benchmark Server
 * ============================================================
 * Provides API endpoints that run SLOW vs FAST queries
 * so you can measure the real impact of indexes.
 *
 * Start: npm run dev
 * Test: http://localhost:3001
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  pool, explainQuery,
  SLOW_findPendingOrders, FIXED_ordersWithUsers,
  SLOW_activeProductsByCategory,
  SLOW_topCustomers, FAST_topCustomers,
  ADD_INDEXES_SQL, DROP_INDEXES_SQL,
  LIST_INDEXES_SQL, TABLE_STATS_SQL,
} from "./queries/optimizations";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM orders");
    res.json({
      status: "ok",
      orders: result.rows[0]?.count,
      hint: result.rows[0]?.count === "0"
        ? "Database is empty! Run: npm run db:setup"
        : "Database ready for benchmarking!",
    });
  } catch {
    res.status(503).json({
      status: "error",
      message: "Cannot connect to database.",
      setup: "1. Start PostgreSQL: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16-alpine",
      then: "2. Run: npm run db:setup",
    });
  }
});

// ─── BENCHMARK ROUTES ──────────────────────────────────────

/**
 * Query 1: Filter orders by status
 * Slow without index on status column, fast with it
 */
app.get("/api/benchmark/pending-orders", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await explainQuery(SLOW_findPendingOrders);
    res.json({
      query: "Find pending orders (ORDER BY created_at DESC LIMIT 20)",
      ...result,
      optimization: result.usesIndex
        ? "✅ Using index — fast!"
        : "❌ Sequential scan — add: CREATE INDEX idx_orders_status ON orders(status)",
    });
  } catch (err) { next(err); }
});

/**
 * Query 2: N+1 solved — join users with orders
 */
app.get("/api/benchmark/orders-with-users", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await explainQuery(FIXED_ordersWithUsers);
    res.json({
      query: "Orders with user data — single JOIN query (vs N+1 separate queries)",
      ...result,
      optimization: "✅ Always use JOIN instead of N+1 application loops",
    });
  } catch (err) { next(err); }
});

/**
 * Query 3: Products by category — composite index test
 */
app.get("/api/benchmark/products/:categoryId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await explainQuery<{ id: number; name: string; price: string }>(
      SLOW_activeProductsByCategory,
      [parseInt(req.params["categoryId"] ?? "1")]
    );
    res.json({
      query: "Active products by category (filter: category_id + is_active = TRUE)",
      ...result,
      optimization: result.usesIndex
        ? "✅ Using composite index on (category_id, is_active)"
        : "❌ No composite index — add: CREATE INDEX idx_products_cat_active ON products(category_id, is_active)",
    });
  } catch (err) { next(err); }
});

/**
 * Query 4: Top customers — CTE vs simple aggregation comparison
 */
app.get("/api/benchmark/top-customers/slow", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await explainQuery(SLOW_topCustomers);
    res.json({ query: "Top 10 customers by spend — SLOW version (join then aggregate)", ...result });
  } catch (err) { next(err); }
});

app.get("/api/benchmark/top-customers/fast", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await explainQuery(FAST_topCustomers);
    res.json({ query: "Top 10 customers by spend — FAST version (CTE: aggregate THEN join)", ...result });
  } catch (err) { next(err); }
});

// ─── INDEX MANAGEMENT ─────────────────────────────────────

app.post("/api/indexes/add", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const start = Date.now();
    await pool.query(ADD_INDEXES_SQL);
    res.json({
      status: "success",
      message: "All indexes created!",
      durationMs: Date.now() - start,
      hint: "Now re-run the benchmark queries — compare durationMs and plan!",
    });
  } catch (err) { next(err); }
});

app.post("/api/indexes/drop", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query(DROP_INDEXES_SQL);
    res.json({ status: "success", message: "All custom indexes dropped — queries will be slow again!" });
  } catch (err) { next(err); }
});

app.get("/api/indexes/list", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(LIST_INDEXES_SQL);
    res.json({ status: "success", data: result.rows, count: result.rowCount });
  } catch (err) { next(err); }
});

app.get("/api/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await pool.query(TABLE_STATS_SQL);
    res.json({ status: "success", data: stats.rows });
  } catch (err) { next(err); }
});

// ─── EXPLAIN ANALYZE PLAYGROUND ───────────────────────────
// Run any SQL with EXPLAIN ANALYZE for custom benchmarking
app.post("/api/explain", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sql, params = [] } = req.body as { sql: string; params?: unknown[] };

    // Basic SQL injection prevention for this demo endpoint
    const forbidden = ["DROP", "DELETE", "INSERT", "UPDATE", "TRUNCATE", "ALTER"];
    if (forbidden.some(word => sql.toUpperCase().includes(word))) {
      res.status(400).json({ error: "Only SELECT queries are allowed in the playground" });
      return;
    }

    const result = await explainQuery(sql, params);
    res.json({ ...result });
  } catch (err) { next(err); }
});

// ─── ERROR HANDLER ────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err.message);
  res.status(500).json({ status: "error", error: { message: err.message } });
});

const PORT = parseInt(process.env["PORT"] ?? "3001");
app.listen(PORT, () => {
  console.log(`\n📊 Day 25 Database Optimizer on http://localhost:${PORT}`);
  console.log("\nPrerequisite: Start PostgreSQL and run:");
  console.log("   npm run db:setup    (creates 460k rows)");
  console.log("\nBenchmark endpoints:");
  console.log("   GET  /api/benchmark/pending-orders");
  console.log("   GET  /api/benchmark/orders-with-users");
  console.log("   GET  /api/benchmark/products/1");
  console.log("   GET  /api/benchmark/top-customers/slow");
  console.log("   GET  /api/benchmark/top-customers/fast");
  console.log("   POST /api/indexes/add    (adds all optimization indexes)");
  console.log("   POST /api/indexes/drop   (removes indexes — back to slow)");
  console.log("   GET  /api/indexes/list   (see current indexes)");
  console.log("   GET  /api/stats          (table row counts and sizes)");
});

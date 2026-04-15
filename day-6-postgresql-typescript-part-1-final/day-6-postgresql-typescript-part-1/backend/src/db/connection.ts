/**
 * ============================================================
 * DATABASE CONNECTION & POOL SETUP
 * ============================================================
 * Uses the `pg` library (node-postgres) with a connection pool.
 * 
 * WHY USE A POOL?
 * Opening a DB connection is expensive (~50-100ms, TCP handshake + auth).
 * A pool keeps a set of connections open and reuses them.
 * Without a pool: every query = new connection = slow & resource-heavy.
 * With a pool: queries reuse existing connections = fast.
 */

import { Pool, PoolClient, QueryResultRow, Submittable } from "pg";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

// ─── CONNECTION POOL ──────────────────────────────────────
export const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],

  // Pool size configuration:
  // - min: Keep at least 2 connections alive (ready for bursts)
  // - max: Never exceed 20 (protects DB from being overwhelmed)
  // Rule of thumb for max: (2 × CPU_cores) + number_of_disks
  min: 2,
  max: 20,

  // idleTimeoutMillis: Close idle connections after 30 seconds
  // Prevents resource leaks when traffic is low
  idleTimeoutMillis: 30_000,

  // connectionTimeoutMillis: Fail fast if we can't get a connection
  // Without this, requests queue up forever when DB is overloaded
  connectionTimeoutMillis: 2_000,
});

// Log pool errors (connection drops, etc.)
pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err);
});

// ─── QUERY HELPER (with TypeScript) ──────────────────────
/**
 * Type-safe query wrapper.
 * T is the shape of each row in the result.
 * 
 * Usage:
 *   const users = await query<User>("SELECT * FROM users WHERE id = $1", [id]);
 *   users.rows[0] is typed as User
 * 
 * IMPORTANT: Always use parameterized queries ($1, $2, ...) for user input.
 * NEVER use string interpolation: `WHERE id = '${id}'` ← SQL INJECTION!
 */
export async function query<T extends any[] | QueryResultRow | Submittable>(
  sql: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(sql, params);
    const duration = Date.now() - start;
    // Log slow queries (>100ms) for optimization
    if (duration > 100) {
      console.warn(`[Slow Query] ${duration}ms: ${sql.slice(0, 100)}`);
    }
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } catch (error) {
    console.error("[Query Error]", { sql: sql.slice(0, 200), params, error });
    throw error;
  }
}

// ─── TRANSACTION HELPER ───────────────────────────────────
/**
 * Runs multiple queries in a transaction.
 * If ANY query fails, ALL changes are rolled back.
 * 
 * Use for operations that must succeed or fail together:
 * - Creating an order + deducting stock
 * - Transferring money between accounts
 * 
 * The `fn` callback receives a PoolClient for transaction-scoped queries.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect(); // Get a dedicated connection
  try {
    await client.query("BEGIN");       // Start transaction
    const result = await fn(client);  // Run the operations
    await client.query("COMMIT");     // Commit all changes
    return result;
  } catch (error) {
    await client.query("ROLLBACK");   // Undo all changes on error
    throw error;
  } finally {
    client.release(); // ALWAYS release back to pool — even on error!
    // Forgetting this causes "pool exhaustion" — all 20 connections used forever
  }
}

// ─── SETUP SCRIPT ─────────────────────────────────────────
export async function setupDatabase(): Promise<void> {
  console.log("🔧 Setting up database...");
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    await pool.query(schema);
    console.log("✅ Database schema created successfully");
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    throw error;
  }
}

// Allow running directly: npx ts-node src/db/connection.ts
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

/**
 * ============================================================
 * DAY 32: DATABASE TRANSACTIONS & ACID
 * ============================================================
 * ACID Properties:
 *  A — Atomicity:   All operations succeed, or NONE do (no partial state)
 *  C — Consistency: DB goes from one valid state to another
 *  I — Isolation:   Concurrent transactions don't interfere
 *  D — Durability:  Committed data survives crashes
 *
 * Setup: npm run db:setup (needs PostgreSQL running)
 * Run:   npm run dev
 */
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { Pool, PoolClient } from "pg";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:password@localhost:5432/transactions_db",
});

// ─── HEALTH ───────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    const { rows } = await pool.query(
      "SELECT balance FROM accounts WHERE id IN (1,2) ORDER BY id"
    );
    res.json({ status: "ok", accounts: rows.map((r, i) => ({ id: i+1, balance: r.balance })) });
  } catch { res.status(503).json({ status: "error", message: "DB not ready. Run: npm run db:setup" }); }
});

// ─── HELPER: transaction wrapper ──────────────────────────
async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK"); // ← Atomicity: undo everything on error
    throw err;
  } finally {
    client.release(); // Always return to pool!
  }
}

// ─── 1. BASIC TRANSFER (demonstrates Atomicity) ───────────
/**
 * Transfer money between accounts.
 * Both the debit AND credit must succeed together — or neither does.
 * Without a transaction: if server crashes between debit & credit → money disappears!
 */
app.post("/api/transfer", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fromId, toId, amount } = req.body as { fromId: number; toId: number; amount: number };
    if (!fromId || !toId || !amount || amount <= 0) {
      res.status(400).json({ error: "fromId, toId, and positive amount required" }); return;
    }

    const result = await withTransaction(async (client) => {
      // Step 1: Check balance (and LOCK the row — prevents concurrent overdrafts)
      // SELECT ... FOR UPDATE: acquires a row-level lock
      // Other transactions must wait until this one commits/rolls back
      const { rows: [from] } = await client.query(
        `SELECT id, balance, name FROM accounts WHERE id = $1 FOR UPDATE`,
        [fromId]
      );
      if (!from) throw new Error(`Account ${fromId} not found`);
      if (parseFloat(from.balance) < amount) {
        throw new Error(`Insufficient funds: balance $${from.balance}, requested $${amount}`);
      }

      const { rows: [to] } = await client.query(
        `SELECT id, balance, name FROM accounts WHERE id = $1 FOR UPDATE`,
        [toId]
      );
      if (!to) throw new Error(`Account ${toId} not found`);

      // Step 2: Debit
      await client.query(
        `UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
        [amount, fromId]
      );

      // Step 3: Credit
      await client.query(
        `UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
        [amount, toId]
      );

      // Step 4: Log the transfer
      const { rows: [txn] } = await client.query(
        `INSERT INTO transactions (from_account_id, to_account_id, amount, description)
         VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
        [fromId, toId, amount, `Transfer from ${from.name} to ${to.name}`]
      );

      // Fetch updated balances
      const { rows: accounts } = await client.query(
        `SELECT id, name, balance FROM accounts WHERE id = ANY($1)`,
        [[fromId, toId]]
      );

      return { transactionId: txn.id, accounts, amount };
    });

    res.json({ status: "success", data: result, message: "Transfer completed atomically" });
  } catch (err) { next(err); }
});

// ─── 2. ORDER WITH INVENTORY (multi-table transaction) ────
/**
 * Place an order: create order + deduct stock + charge account — atomically.
 * If stock runs out mid-order, everything rolls back.
 */
app.post("/api/orders", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, items } = req.body as {
      accountId: number;
      items: Array<{ productId: number; quantity: number }>;
    };
    if (!accountId || !items?.length) {
      res.status(400).json({ error: "accountId and items[] required" }); return;
    }

    const result = await withTransaction(async (client) => {
      let totalAmount = 0;
      const lineItems: { productId: number; qty: number; price: number }[] = [];

      for (const item of items) {
        // Lock product row to prevent concurrent over-selling
        const { rows: [product] } = await client.query(
          `SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE`,
          [item.productId]
        );
        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}": ${product.stock} available, ${item.quantity} requested`);
        }

        // Deduct stock atomically
        await client.query(
          `UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2`,
          [item.quantity, item.productId]
        );

        const lineTotal = parseFloat(product.price) * item.quantity;
        totalAmount += lineTotal;
        lineItems.push({ productId: item.productId, qty: item.quantity, price: product.price });
      }

      // Check account balance
      const { rows: [account] } = await client.query(
        `SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE`,
        [accountId]
      );
      if (!account) throw new Error(`Account ${accountId} not found`);
      if (parseFloat(account.balance) < totalAmount) {
        throw new Error(`Insufficient funds: need $${totalAmount.toFixed(2)}, have $${account.balance}`);
      }

      // Charge account
      await client.query(
        `UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
        [totalAmount, accountId]
      );

      // Create order record
      const { rows: [order] } = await client.query(
        `INSERT INTO orders (account_id, total_amount, status)
         VALUES ($1, $2, 'confirmed') RETURNING id, created_at`,
        [accountId, totalAmount]
      );

      return { orderId: order.id, totalAmount: totalAmount.toFixed(2), items: lineItems.length };
    });

    res.status(201).json({ status: "success", data: result });
  } catch (err) { next(err); }
});

// ─── 3. OPTIMISTIC LOCKING (prevent lost updates) ─────────
/**
 * Optimistic locking: read a version number, update only if version hasn't changed.
 * PESSIMISTIC: lock the row (slow, blocks others)
 * OPTIMISTIC: don't lock, but detect conflicts at write time (fast, retry on conflict)
 * Use optimistic when: reads are frequent, conflicts are RARE
 * Use pessimistic when: conflicts are FREQUENT (financial systems)
 */
app.patch("/api/accounts/:id/optimistic", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { version, newBalance } = req.body as { version: number; newBalance: number };
    const id = parseInt(req.params["id"]!);

    // UPDATE only if version matches — no explicit lock needed!
    const { rowCount, rows } = await pool.query(
      `UPDATE accounts
       SET balance = $1, version = version + 1, updated_at = NOW()
       WHERE id = $2 AND version = $3
       RETURNING id, balance, version`,
      [newBalance, id, version]
    );

    if (rowCount === 0) {
      // Another transaction updated this row — retry needed!
      const current = await pool.query(`SELECT id, balance, version FROM accounts WHERE id = $1`, [id]);
      res.status(409).json({
        error: "Conflict: account was modified by another transaction. Retry with current version.",
        currentVersion: current.rows[0]?.version,
        currentBalance: current.rows[0]?.balance,
      });
      return;
    }

    res.json({ status: "success", data: rows[0], message: "Updated with optimistic lock" });
  } catch (err) { next(err); }
});

// ─── 4. ISOLATION LEVELS DEMO ─────────────────────────────
/**
 * Shows different isolation levels and what anomalies they prevent.
 * READ COMMITTED (default): prevents dirty reads
 * REPEATABLE READ:          prevents non-repeatable reads
 * SERIALIZABLE:             prevents phantom reads (strongest)
 */
app.get("/api/isolation-demo/:level", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const levels: Record<string, string> = {
      "read_committed": "READ COMMITTED",
      "repeatable_read": "REPEATABLE READ",
      "serializable": "SERIALIZABLE",
    };
    const level = levels[req.params["level"] ?? ""] ?? "READ COMMITTED";
    const client = await pool.connect();
    try {
      await client.query(`BEGIN ISOLATION LEVEL ${level}`);
      const { rows: snap1 } = await client.query(`SELECT id, balance FROM accounts ORDER BY id`);
      await new Promise(r => setTimeout(r, 100)); // Simulate time passing
      const { rows: snap2 } = await client.query(`SELECT id, balance FROM accounts ORDER BY id`);
      await client.query("COMMIT");
      res.json({
        isolationLevel: level,
        snapshot1: snap1,
        snapshot2: snap2,
        consistent: JSON.stringify(snap1) === JSON.stringify(snap2),
        note: `With ${level}: both reads return the same data within a transaction`,
      });
    } finally { client.release(); }
  } catch (err) { next(err); }
});

// ─── GET CURRENT STATE ────────────────────────────────────
app.get("/api/state", async (_req, res, next) => {
  try {
    const [accounts, transactions, products, orders] = await Promise.all([
      pool.query("SELECT id, name, balance, version FROM accounts ORDER BY id"),
      pool.query("SELECT id, from_account_id, to_account_id, amount, description, created_at FROM transactions ORDER BY created_at DESC LIMIT 10"),
      pool.query("SELECT id, name, price, stock FROM products ORDER BY id"),
      pool.query("SELECT id, account_id, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5"),
    ]);
    res.json({
      accounts: accounts.rows,
      recentTransactions: transactions.rows,
      products: products.rows,
      recentOrders: orders.rows,
    });
  } catch (err) { next(err); }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err.message);
  res.status(500).json({ status: "error", error: { message: err.message } });
});

app.listen(3001, () => {
  console.log("\n📊 Day 32 Transaction Server on http://localhost:3001");
  console.log("   Run: npm run db:setup (first time only)");
});

/**
 * ============================================================
 * DAY 6: PostgreSQL + TypeScript - Express Server
 * ============================================================
 * Run: npm run dev
 * Setup DB first: npm run db:setup
 */
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { pool, query, withTransaction } from "./db/connection";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ─── HEALTH CHECK WITH DB STATUS ──────────────────────────
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1"); // Simple connectivity check
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

// ─── PRODUCTS ROUTES ──────────────────────────────────────
// Query 1: Products with category and average rating
app.get("/api/products", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Named interface for the query result — TypeScript knows what each row looks like
    interface ProductRow {
      id: string;
      name: string;
      price: string; // PostgreSQL DECIMAL comes back as string
      category_name: string;
      avg_rating: string;
      review_count: string;
    }

    const { rows } = await query<ProductRow>(`
      SELECT
        p.id, p.name, p.price, p.stock,
        c.name AS category_name,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
        COUNT(r.id) AS review_count
      FROM shop.products p
      LEFT JOIN shop.categories c ON p.category_id = c.id
      LEFT JOIN shop.reviews r ON r.product_id = p.id
      WHERE p.is_active = TRUE
      GROUP BY p.id, p.name, p.price, p.stock, c.name
      ORDER BY avg_rating DESC, review_count DESC
    `);

    // Transform: convert string numbers to actual numbers
    const products = rows.map((row) => ({
      ...row,
      price: parseFloat(row.price),
      avgRating: parseFloat(row.avg_rating),
      reviewCount: parseInt(row.review_count),
    }));

    res.json({ status: "success", data: products });
  } catch (error) {
    next(error);
  }
});

// Query 5: Users who ordered a specific product
app.get("/api/products/:id/buyers", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // $1 is a parameterized query — safe from SQL injection!
    const { rows } = await query(
      `SELECT DISTINCT u.id, u.name, u.email, o.created_at AS order_date
       FROM shop.users u
       JOIN shop.orders o ON o.user_id = u.id
       JOIN shop.order_items oi ON oi.order_id = o.id
       WHERE oi.product_id = $1 AND o.status = 'delivered'
       ORDER BY o.created_at DESC`,
      [req.params["id"]] // SAFE: parameterized
    );
    res.json({ status: "success", data: rows });
  } catch (error) {
    next(error);
  }
});

// ─── ORDERS ROUTES ────────────────────────────────────────
// Create an order — uses a TRANSACTION to ensure consistency
app.post("/api/orders", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, items } = req.body as {
      userId: string;
      items: Array<{ productId: string; quantity: number }>;
    };

    // withTransaction: if anything fails, ALL changes roll back
    const order = await withTransaction(async (client) => {
      // Step 1: Create the order (with placeholder total — update after items)
      const { rows: [newOrder] } = await client.query(
        `INSERT INTO shop.orders (user_id, status, subtotal, total_amount, shipping_address)
         VALUES ($1, 'pending', 0, 0, '{"method":"standard"}')
         RETURNING id`,
        [userId]
      );

      let subtotal = 0;

      // Step 2: Insert each order item + deduct stock
      for (const item of items) {
        // Lock the product row to prevent race conditions
        // SELECT ... FOR UPDATE: other transactions must wait
        const { rows: [product] } = await client.query(
          `SELECT id, price, stock FROM shop.products WHERE id = $1 FOR UPDATE`,
          [item.productId]
        );

        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.id}`);
        }

        // Insert order item
        await client.query(
          `INSERT INTO shop.order_items (order_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [newOrder.id, item.productId, item.quantity, product.price]
        );

        // Deduct stock atomically
        await client.query(
          `UPDATE shop.products SET stock = stock - $1, updated_at = NOW() WHERE id = $2`,
          [item.quantity, item.productId]
        );

        subtotal += parseFloat(product.price) * item.quantity;
      }

      // Step 3: Update order with final total
      const { rows: [finalOrder] } = await client.query(
        `UPDATE shop.orders SET subtotal = $1, total_amount = $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [subtotal, newOrder.id]
      );

      return finalOrder;
    });

    res.status(201).json({ status: "success", data: order });
  } catch (error) {
    next(error);
  }
});

// ─── ANALYTICS ROUTES ─────────────────────────────────────
// Query 4: Monthly revenue report
app.get("/api/analytics/revenue", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
        COUNT(id) AS total_orders,
        ROUND(SUM(total_amount), 2) AS revenue,
        ROUND(AVG(total_amount), 2) AS avg_order_value
      FROM shop.orders
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `);
    res.json({ status: "success", data: rows });
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ status: "error", error: { message: err.message } });
});

const PORT = process.env["PORT"] ? parseInt(process.env["PORT"]) : 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Day 6 server on http://localhost:${PORT}`);
  console.log(`\nFirst run: npm run db:setup to create schema`);
});

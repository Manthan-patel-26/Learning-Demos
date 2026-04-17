/**
 * ============================================================
 * DAY 25: DATABASE OPTIMIZATION & INDEXING — Setup Script
 * ============================================================
 * Creates a realistic e-commerce dataset with 100k+ rows
 * to demonstrate the real impact of indexes and query optimization.
 *
 * Run: npm run db:setup
 * Then: npm run dev
 * Then: open http://localhost:3001 and compare query speeds
 *
 * PREREQUISITE: PostgreSQL running locally
 *   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16-alpine
 */

import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env["DATABASE_URL"] ??
    "postgresql://postgres:password@localhost:5432/ecommerce_db",
});

async function setup() {
  const client = await pool.connect();
  console.log("🔧 Setting up Day 25 database...\n");

  try {
    // ── SCHEMA ────────────────────────────────────────────
    await client.query(`
      -- Clean slate
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS categories CASCADE;

      CREATE TABLE categories (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL UNIQUE,
        slug       VARCHAR(100) NOT NULL UNIQUE
      );

      CREATE TABLE users (
        id         SERIAL PRIMARY KEY,
        email      VARCHAR(255) NOT NULL UNIQUE,
        name       VARCHAR(100) NOT NULL,
        country    VARCHAR(50),
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        -- NOTE: No indexes except the implicit UNIQUE ones on email.
        -- We'll add them later and measure the difference!
      );

      CREATE TABLE products (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        price       DECIMAL(10,2) NOT NULL,
        stock       INTEGER NOT NULL DEFAULT 0,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        -- No explicit indexes yet — we'll benchmark with and without
      );

      CREATE TABLE orders (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id),
        status       VARCHAR(20) NOT NULL DEFAULT 'pending',
        total_amount DECIMAL(10,2) NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE order_items (
        id         SERIAL PRIMARY KEY,
        order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity   INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL
      );
    `);
    console.log("✅ Schema created");

    // ── SEED DATA ─────────────────────────────────────────
    // Insert categories
    await client.query(`
      INSERT INTO categories (name, slug) VALUES
        ('Electronics', 'electronics'), ('Books', 'books'),
        ('Clothing', 'clothing'), ('Sports', 'sports'), ('Home', 'home');
    `);

    // Insert 10,000 users
    console.log("⏳ Inserting 10,000 users...");
    await client.query(`
      INSERT INTO users (email, name, country)
      SELECT
        'user' || i || '@example.com',
        'User ' || i,
        (ARRAY['US','UK','IN','DE','FR','CA','AU'])[1 + (i % 7)]
      FROM generate_series(1, 10000) AS s(i);
    `);

    // Insert 50,000 products
    console.log("⏳ Inserting 50,000 products...");
    await client.query(`
      INSERT INTO products (name, category_id, price, stock, is_active, created_at)
      SELECT
        'Product ' || i || ' - ' || (ARRAY['Pro','Plus','Max','Basic','Elite'])[1 + (i % 5)],
        1 + (i % 5),
        (random() * 500 + 5)::DECIMAL(10,2),
        (random() * 1000)::INTEGER,
        (i % 10 != 0),  -- 10% inactive
        NOW() - ((random() * 365)::INTEGER || ' days')::INTERVAL
      FROM generate_series(1, 50000) AS s(i);
    `);

    // Insert 100,000 orders
    console.log("⏳ Inserting 100,000 orders...");
    await client.query(`
      INSERT INTO orders (user_id, status, total_amount, created_at)
      SELECT
        1 + (random() * 9999)::INTEGER,
        (ARRAY['pending','confirmed','shipped','delivered','cancelled'])[1 + (i % 5)],
        (random() * 500 + 10)::DECIMAL(10,2),
        NOW() - ((random() * 730)::INTEGER || ' days')::INTERVAL
      FROM generate_series(1, 100000) AS s(i);
    `);

    // Insert 300,000 order items
    console.log("⏳ Inserting 300,000 order items...");
    await client.query(`
      INSERT INTO order_items (order_id, product_id, quantity, unit_price)
      SELECT
        1 + (random() * 99999)::INTEGER,
        1 + (random() * 49999)::INTEGER,
        1 + (random() * 5)::INTEGER,
        (random() * 200 + 5)::DECIMAL(10,2)
      FROM generate_series(1, 300000) AS s(i);
    `);

    console.log("\n✅ Data inserted:");
    const counts = await client.query(`
      SELECT 'users' AS table_name, COUNT(*) FROM users
      UNION ALL SELECT 'products', COUNT(*) FROM products
      UNION ALL SELECT 'orders', COUNT(*) FROM orders
      UNION ALL SELECT 'order_items', COUNT(*) FROM order_items;
    `);
    counts.rows.forEach(r => console.log(`   ${r.table_name}: ${r.count} rows`));

    console.log("\n🚀 Setup complete! Run: npm run dev");
    console.log("   Then benchmark queries at: http://localhost:3001\n");

  } finally {
    client.release();
    await pool.end();
  }
}

setup().catch(err => { console.error("Setup failed:", err); process.exit(1); });

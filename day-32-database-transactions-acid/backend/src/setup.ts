/**
 * DAY 32: Database Setup — Run once to create schema and seed data
 * Usage: npm run db:setup
 */
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:password@localhost:5432/transactions_db",
});

async function setup() {
  const client = await pool.connect();
  try {
    console.log("🔧 Setting up Day 32 database...");
    await client.query(`
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS transactions CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS accounts CASCADE;

      -- Accounts with optimistic locking version column
      CREATE TABLE accounts (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        balance    DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
        version    INTEGER NOT NULL DEFAULT 1,  -- For optimistic locking
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE transactions (
        id              SERIAL PRIMARY KEY,
        from_account_id INTEGER REFERENCES accounts(id),
        to_account_id   INTEGER REFERENCES accounts(id),
        amount          DECIMAL(12,2) NOT NULL,
        description     TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE products (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(200) NOT NULL,
        price      DECIMAL(10,2) NOT NULL,
        stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE orders (
        id           SERIAL PRIMARY KEY,
        account_id   INTEGER NOT NULL REFERENCES accounts(id),
        total_amount DECIMAL(10,2) NOT NULL,
        status       VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Seed accounts
      INSERT INTO accounts (name, balance) VALUES
        ('Alice (Account 1)', 1000.00),
        ('Bob   (Account 2)', 500.00),
        ('Charlie (Account 3)', 250.00);

      -- Seed products
      INSERT INTO products (name, price, stock) VALUES
        ('TypeScript Handbook', 29.99, 10),
        ('React in Depth', 39.99, 5),
        ('Node.js Pro', 49.99, 3),
        ('Limited Edition (stock=1)', 99.99, 1);
    `);
    console.log("✅ Schema and seed data created!");
    console.log("\nAccounts:");
    const { rows } = await client.query("SELECT id, name, balance FROM accounts");
    rows.forEach(r => console.log(`  Account ${r.id}: ${r.name} — $${r.balance}`));
    console.log("\nProducts:");
    const { rows: prods } = await client.query("SELECT id, name, price, stock FROM products");
    prods.forEach(p => console.log(`  Product ${p.id}: ${p.name} — $${p.price} (${p.stock} in stock)`));
  } finally {
    client.release();
    await pool.end();
  }
}

setup().catch(err => { console.error("Setup failed:", err); process.exit(1); });

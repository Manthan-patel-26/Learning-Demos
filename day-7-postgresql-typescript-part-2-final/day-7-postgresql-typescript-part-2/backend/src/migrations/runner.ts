/**
 * ============================================================
 * DATABASE MIGRATIONS SYSTEM
 * ============================================================
 * Migrations track schema changes over time — like git for your DB.
 *
 * WHY MIGRATIONS?
 *  - Teams can apply the same schema changes in order
 *  - Rollback bad changes with the "down" migration
 *  - Audit trail of every schema change
 *  - CI/CD can automatically migrate the DB on deploy
 *
 * HOW IT WORKS:
 *  1. A `migrations` table tracks which migrations have run
 *  2. On `up`: run all migrations that haven't been applied yet
 *  3. On `down`: reverse the last applied migration
 *
 * Run:  npx ts-node src/migrations/runner.ts up
 * Undo: npx ts-node src/migrations/runner.ts down
 */

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

// ─── MIGRATION DEFINITIONS ────────────────────────────────
// Each migration has:
//   - id: unique string, NEVER change this once applied
//   - up: SQL to apply the change
//   - down: SQL to reverse it (not always possible — document if not)
interface Migration {
  id: string;
  description: string;
  up: string;
  down: string;
}

const migrations: Migration[] = [
  {
    id: "001_initial_schema",
    description: "Create initial e-commerce schema",
    up: `
      CREATE SCHEMA IF NOT EXISTS shop;
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS shop.categories (
        id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        name       VARCHAR(100) NOT NULL UNIQUE,
        slug       VARCHAR(100) NOT NULL UNIQUE,
        parent_id  UUID        REFERENCES shop.categories(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shop.users (
        id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        email      VARCHAR(255) NOT NULL UNIQUE,
        name       VARCHAR(100) NOT NULL,
        role       VARCHAR(20)  NOT NULL DEFAULT 'customer'
                       CHECK (role IN ('admin', 'customer', 'vendor')),
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ  NULL
      );

      CREATE TABLE IF NOT EXISTS shop.products (
        id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
        name        VARCHAR(255)   NOT NULL,
        description TEXT,
        price       DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
        stock       INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
        sku         VARCHAR(100)   UNIQUE,
        category_id UUID           REFERENCES shop.categories(id) ON DELETE SET NULL,
        is_active   BOOLEAN        NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shop.orders (
        id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id          UUID           NOT NULL REFERENCES shop.users(id) ON DELETE RESTRICT,
        status           VARCHAR(20)    NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
        subtotal         DECIMAL(10, 2) NOT NULL DEFAULT 0,
        tax_amount       DECIMAL(10, 2) NOT NULL DEFAULT 0,
        shipping_amount  DECIMAL(10, 2) NOT NULL DEFAULT 0,
        total_amount     DECIMAL(10, 2) NOT NULL DEFAULT 0,
        shipping_address JSONB          NOT NULL DEFAULT '{}',
        notes            TEXT,
        created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shop.order_items (
        id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id    UUID           NOT NULL REFERENCES shop.orders(id) ON DELETE CASCADE,
        product_id  UUID           NOT NULL REFERENCES shop.products(id) ON DELETE RESTRICT,
        quantity    INTEGER        NOT NULL CHECK (quantity > 0),
        unit_price  DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
        created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shop.reviews (
        id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id  UUID        NOT NULL REFERENCES shop.products(id) ON DELETE CASCADE,
        user_id     UUID        NOT NULL REFERENCES shop.users(id) ON DELETE CASCADE,
        rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title       VARCHAR(200),
        body        TEXT,
        is_verified BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_user_product_review UNIQUE (user_id, product_id)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON shop.users(email);
      CREATE INDEX IF NOT EXISTS idx_products_category ON shop.products(category_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_orders_user ON shop.orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON shop.orders(status);
      CREATE INDEX IF NOT EXISTS idx_reviews_product ON shop.reviews(product_id);
    `,
    down: `
      DROP SCHEMA IF EXISTS shop CASCADE;
    `,
  },
  {
    id: "002_add_product_images",
    description: "Add images array to products",
    up: `
      ALTER TABLE shop.products
        ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';
    `,
    down: `
      ALTER TABLE shop.products DROP COLUMN IF EXISTS images;
    `,
  },
  {
    id: "003_seed_data",
    description: "Add initial seed data",
    up: `
      INSERT INTO shop.categories (name, slug) VALUES
        ('Electronics', 'electronics'),
        ('Clothing', 'clothing'),
        ('Books', 'books')
      ON CONFLICT (slug) DO NOTHING;

      INSERT INTO shop.users (email, name, role) VALUES
        ('admin@shop.com', 'Admin User', 'admin'),
        ('alice@example.com', 'Alice Smith', 'customer'),
        ('bob@example.com', 'Bob Jones', 'customer')
      ON CONFLICT (email) DO NOTHING;
    `,
    down: `
      DELETE FROM shop.users WHERE email IN ('admin@shop.com', 'alice@example.com', 'bob@example.com');
      DELETE FROM shop.categories WHERE slug IN ('electronics', 'clothing', 'books');
    `,
  },
];

// ─── MIGRATION RUNNER ─────────────────────────────────────

async function ensureMigrationsTable(): Promise<void> {
  // This table tracks which migrations have been applied
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id          VARCHAR(255) PRIMARY KEY,
      description VARCHAR(500) NOT NULL,
      applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query<{ id: string }>("SELECT id FROM migrations ORDER BY applied_at");
  return new Set(rows.map((r) => r.id));
}

async function runUp(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  // Find migrations that haven't been applied yet
  const pending = migrations.filter((m) => !applied.has(m.id));

  if (pending.length === 0) {
    console.log("✅ All migrations are up to date.");
    return;
  }

  for (const migration of pending) {
    const client = await pool.connect();
    try {
      console.log(`⬆  Applying migration: ${migration.id} - ${migration.description}`);
      await client.query("BEGIN");
      await client.query(migration.up);
      // Record that this migration was applied
      await client.query(
        "INSERT INTO migrations (id, description) VALUES ($1, $2)",
        [migration.id, migration.description]
      );
      await client.query("COMMIT");
      console.log(`   ✅ Done`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`   ❌ Failed: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }
  console.log(`\n✅ Applied ${pending.length} migration(s).`);
}

async function runDown(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  // Find the LAST applied migration (to reverse it)
  const lastApplied = [...applied].pop();
  if (!lastApplied) {
    console.log("No migrations to reverse.");
    return;
  }

  const migration = migrations.find((m) => m.id === lastApplied);
  if (!migration) {
    console.error(`Migration ${lastApplied} not found in code!`);
    return;
  }

  const client = await pool.connect();
  try {
    console.log(`⬇  Reversing migration: ${migration.id}`);
    await client.query("BEGIN");
    await client.query(migration.down);
    await client.query("DELETE FROM migrations WHERE id = $1", [migration.id]);
    await client.query("COMMIT");
    console.log(`   ✅ Reversed`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`   ❌ Failed:`, error);
    throw error;
  } finally {
    client.release();
  }
}

// ─── CLI ENTRYPOINT ───────────────────────────────────────
const command = process.argv[2];
(command === "down" ? runDown() : runUp())
  .then(() => pool.end())
  .catch((e) => { console.error(e); pool.end(); process.exit(1); });

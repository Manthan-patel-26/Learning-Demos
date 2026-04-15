-- ============================================================
-- E-COMMERCE DATABASE SCHEMA
-- Day 6: PostgreSQL with TypeScript - Part 1
-- ============================================================
-- Run this file to set up the database schema.
-- Command: psql -U postgres -d ecommerce_db -f schema.sql
-- OR use the npm run db:setup script.
--
-- DESIGN PRINCIPLES DEMONSTRATED:
--  1. Normalization (no data duplication)
--  2. Proper data types (UUID, DECIMAL, TIMESTAMPTZ)
--  3. Constraints (NOT NULL, UNIQUE, CHECK, FOREIGN KEY)
--  4. Indexes on columns used in WHERE/JOIN/ORDER BY
--  5. Soft deletes (deleted_at) vs hard deletes
-- ============================================================

-- Use a fresh schema to avoid conflicts
CREATE SCHEMA IF NOT EXISTS shop;
SET search_path TO shop;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- TABLE: users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    -- UUID is better than serial int for distributed systems
    -- (no conflicts when merging databases, no sequential guessing)
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) NOT NULL UNIQUE,  -- UNIQUE creates an index automatically
    name        VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('admin', 'customer', 'vendor')),  -- Enum-like constraint
    -- TIMESTAMPTZ stores the timezone — TIMESTAMP does not.
    -- ALWAYS use TIMESTAMPTZ unless you have a specific reason not to.
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ  NULL     -- NULL = not deleted (soft delete pattern)
);

-- Index on email for fast login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- Partial index: only index non-deleted users (smaller, faster)
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────
-- TABLE: categories
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,  -- URL-safe name: "electronics", "mens-clothing"
    parent_id   UUID         REFERENCES categories(id) ON DELETE SET NULL,  -- Self-referential for subcategories
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABLE: products
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id            UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(255)   NOT NULL,
    description   TEXT,          -- TEXT for unlimited length (not VARCHAR)
    -- DECIMAL(10, 2): 10 total digits, 2 after decimal point
    -- NEVER use FLOAT for money — floating point precision errors!
    -- Example: FLOAT: 0.1 + 0.2 = 0.30000000000000004
    --          DECIMAL: 0.1 + 0.2 = 0.30
    price         DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock         INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
    sku           VARCHAR(100)   UNIQUE,  -- Stock Keeping Unit — unique product identifier
    category_id   UUID           REFERENCES categories(id) ON DELETE SET NULL,
    is_active     BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Composite index: products filtered by category AND active status
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active);
-- Full-text search index on product name and description
CREATE INDEX IF NOT EXISTS idx_products_search ON products
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ─────────────────────────────────────────────
-- TABLE: orders
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    -- ON DELETE RESTRICT: can't delete a user who has orders
    status          VARCHAR(20)    NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    -- Store totals at time of purchase (prices can change later!)
    subtotal        DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount      DECIMAL(10, 2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    -- JSONB for flexible shipping address (no need for a separate table)
    shipping_address JSONB         NOT NULL DEFAULT '{}',
    notes           TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);  -- For "latest orders" queries

-- ─────────────────────────────────────────────
-- TABLE: order_items (junction/association table)
-- Orders have many products, products are in many orders
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id     UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    -- ON DELETE CASCADE: if an order is deleted, its items are also deleted
    product_id   UUID           NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity     INTEGER        NOT NULL CHECK (quantity > 0),
    -- Store price at time of purchase — snapshot! Product price may change later.
    unit_price   DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price  DECIMAL(10, 2) NOT NULL GENERATED ALWAYS AS (quantity * unit_price) STORED,
    -- GENERATED ALWAYS AS: computed column — DB calculates this automatically
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ─────────────────────────────────────────────
-- TABLE: reviews
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title       VARCHAR(200),
    body        TEXT,
    is_verified BOOLEAN     NOT NULL DEFAULT FALSE,  -- Verified purchase review
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Each user can only review a product once
    CONSTRAINT unique_user_product_review UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating  ON reviews(rating);

-- ─────────────────────────────────────────────
-- SEED DATA (for testing)
-- ─────────────────────────────────────────────
INSERT INTO categories (name, slug) VALUES
    ('Electronics', 'electronics'),
    ('Clothing', 'clothing'),
    ('Books', 'books')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (email, name, role) VALUES
    ('admin@shop.com', 'Admin User', 'admin'),
    ('alice@example.com', 'Alice Smith', 'customer'),
    ('bob@example.com', 'Bob Jones', 'customer')
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────
-- COMPLEX QUERIES (The Challenge!)
-- Study these — they cover joins, aggregations, subqueries
-- ─────────────────────────────────────────────

-- Query 1: Products with category name, average rating, and review count
-- (Multi-table JOIN + aggregation)
/*
SELECT
    p.id,
    p.name,
    p.price,
    c.name AS category_name,
    COALESCE(AVG(r.rating), 0) AS avg_rating,
    COUNT(r.id) AS review_count
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN reviews r ON r.product_id = p.id
WHERE p.is_active = TRUE
GROUP BY p.id, p.name, p.price, c.name
ORDER BY avg_rating DESC, review_count DESC;
*/

-- Query 2: Top customers by total spending
-- (Subquery as CTE, aggregation)
/*
WITH customer_spending AS (
    SELECT
        u.id,
        u.name,
        u.email,
        SUM(o.total_amount) AS total_spent,
        COUNT(o.id) AS order_count,
        MAX(o.created_at) AS last_order_date
    FROM users u
    JOIN orders o ON o.user_id = u.id
    WHERE o.status != 'cancelled'
    GROUP BY u.id, u.name, u.email
)
SELECT *, RANK() OVER (ORDER BY total_spent DESC) AS spending_rank
FROM customer_spending
ORDER BY total_spent DESC
LIMIT 10;
*/

-- Query 3: Products low on stock with pending order quantities
-- (Correlated subquery)
/*
SELECT
    p.id,
    p.name,
    p.stock AS current_stock,
    COALESCE(pending.ordered_qty, 0) AS qty_in_pending_orders,
    p.stock - COALESCE(pending.ordered_qty, 0) AS effective_stock
FROM products p
LEFT JOIN (
    SELECT oi.product_id, SUM(oi.quantity) AS ordered_qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status IN ('pending', 'confirmed')
    GROUP BY oi.product_id
) pending ON pending.product_id = p.id
WHERE p.stock < 10
ORDER BY effective_stock ASC;
*/

-- Query 4: Monthly revenue report
-- (Date functions, aggregation)
/*
SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(id) AS total_orders,
    SUM(total_amount) AS revenue,
    AVG(total_amount) AS avg_order_value,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count
FROM orders
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
*/

-- Query 5: Find users who ordered product X (parameterized version uses $1)
/*
SELECT DISTINCT u.id, u.name, u.email, o.created_at AS order_date
FROM users u
JOIN orders o ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
WHERE oi.product_id = $1
  AND o.status = 'delivered'
ORDER BY o.created_at DESC;
*/

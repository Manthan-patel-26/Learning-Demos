# Day 6: PostgreSQL with TypeScript - Part 1

**Date:** February 18, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build

Normalized e-commerce database schema with 5 complex SQL queries covering joins, aggregations, subqueries, CTEs, and window functions.

## 🚀 Prerequisites

Install PostgreSQL and create a database:

```bash
# Mac (Homebrew)
brew install postgresql@16
brew services start postgresql@16

#Ubuntu
# Install prerequisites
sudo apt update
sudo apt install -y postgresql-common

# Add the official PostgreSQL repository
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib

# Start the service
sudo systemctl start postgresql

# Check the status
sudo systemctl status postgresql

# Go to user
sudo -i -u postgres

# Create database
psql -U postgres
CREATE DATABASE ecommerce_db;
\q

# Check all databases
\l

# Change the password for postgres user
sudo -i -u postgres
psql
ALTER USER postgres WITH PASSWORD 'password';

```

## 🚀 How to Run

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ecommerce_db
npm install
npm run db:setup    # Creates all tables + seed data
npm run dev         # Starts server on port 3001
```

## Check the index file routes

## 📁 Key Files

```
backend/src/db/
├── schema.sql     ← Full database schema with all 5 complex queries (commented)
├── connection.ts  ← Pool setup, query helper, transaction helper
└── setup.ts       ← Runs the schema SQL file
```

## 📖 Key Concepts

### 1. Connection Pool

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: 2, // Always keep 2 connections alive
  max: 20, // Never exceed 20 simultaneous connections
  idleTimeoutMillis: 30_000, // Close idle connections after 30s
  connectionTimeoutMillis: 2_000, // Fail fast if can't connect
});
```

### 2. Parameterized Queries (SQL Injection Prevention)

```typescript
// ❌ DANGEROUS - SQL Injection!
const users = await pool.query(`SELECT * FROM users WHERE email = '${email}'`);
// Attacker input: email = "'; DROP TABLE users; --"

// ✅ SAFE - Parameterized query
const users = await query("SELECT * FROM users WHERE email = $1", [email]);
// pg driver safely escapes the input
```

### 3. Transactions

```typescript
// If creating the order succeeds but deducting stock fails,
// BOTH changes are rolled back. Database stays consistent.
await withTransaction(async (client) => {
  await client.query("INSERT INTO orders ...");
  await client.query("UPDATE products SET stock = stock - $1 ...", [qty]);
  // If this throws, INSERT is also undone!
});
```

### 4. N+1 Query Problem

```sql
-- ❌ N+1: 1 query for products + N queries for category name
-- JavaScript: products.map(p => db.query("SELECT * FROM categories WHERE id = ?", [p.category_id]))

-- ✅ 1 query with JOIN
SELECT p.*, c.name AS category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;
```

## ⚠️ PostgreSQL Gotchas

| Gotcha                   | Detail                                                    |
| ------------------------ | --------------------------------------------------------- |
| DECIMAL vs FLOAT         | Always use DECIMAL for money! FLOAT has precision errors  |
| TIMESTAMP vs TIMESTAMPTZ | Always use TIMESTAMPTZ — stores timezone info             |
| NULL in WHERE            | `WHERE col = NULL` never matches! Use `WHERE col IS NULL` |
| Cascade delete           | `ON DELETE CASCADE` auto-deletes child rows — careful!    |
| Connection leak          | Always `client.release()` in a finally block!             |

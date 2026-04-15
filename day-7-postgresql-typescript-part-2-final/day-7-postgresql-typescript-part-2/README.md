# Day 7: PostgreSQL with TypeScript - Part 2

**Date:** February 19, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build

Type-safe Repository Pattern with transaction support, connection pooling, migration scripts, and proper constraint violation handling.

## 🚀 How to Run

```bash
cd backend
cp .env.example .env   # Set your DATABASE_URL
npm install
npm run migrate        # Apply all migrations (creates schema + seed data)
npm run dev            # Start server on port 3001
```

## 📁 File Guide

```
backend/src/
├── repositories/index.ts    ← BaseRepository<T,C,U> + UserRepo + ProductRepo
├── migrations/runner.ts     ← Migration system with up/down support
└── index.ts                 ← Server using repos (no SQL in routes!)
```

## 📖 Key Concepts

### Repository Pattern

```typescript
// ❌ Without Repository — SQL scattered everywhere
app.get("/users", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  // Duplicated if you need this in 5 different routes!
});

// ✅ With Repository — one place, reusable
const userRepo = new UserRepository(pool);
app.get("/users", async (req, res) => {
  const user = await userRepo.findByEmail(email); // Clean, readable
});
```

### Generic Base Repository

```typescript
// T = Entity type, C = Create input, U = Update input
abstract class BaseRepository<T extends BaseEntity, C, U extends Partial<C>> {
  abstract readonly tableName: string;
  async findById(id: string): Promise<T | null> { ... }
  async create(data: C): Promise<T> { ... }
  async update(id: string, data: U): Promise<T | null> { ... }
}
// Extend: class UserRepository extends BaseRepository<User, CreateInput, UpdateInput>
```

### Migrations vs Raw Schema

```typescript
// ❌ Editing schema.sql directly — can't track changes
// "Did we already add the images column to prod?"

// ✅ Migrations — numbered, ordered, reversible
// 001_initial_schema.ts → applied 2024-01-01
// 002_add_product_images.ts → applied 2024-01-15
// 003_seed_data.ts → applied 2024-01-15
// The `migrations` table tracks what's been applied
```

### Constraint Error Handling

```typescript
try {
  await userRepo.create({
    email: "already@exists.com",
    name: "Bob",
    role: "customer",
  });
} catch (err) {
  if (err.message.includes("unique constraint")) {
    // 409 Conflict — not a 500 Internal Error!
    return res.status(409).json({ error: "Email already in use" });
  }
  throw err; // Unknown error — let global handler deal with it
}
```

## ⚠️ Gotchas

### Connection Release

```typescript
// ❌ Connection leak — pool exhausts after 20 requests!
const client = await pool.connect();
await client.query("...");
// Forgot client.release()!

// ✅ Always use try/finally
const client = await pool.connect();
try {
  await client.query("...");
} finally {
  client.release(); // ALWAYS runs, even if query throws
}
```

### Deadlocks

```
Transaction A locks Table Users, wants Table Orders
Transaction B locks Table Orders, wants Table Users
→ Deadlock! Both wait forever.

Prevention: Always lock tables in the SAME ORDER.
```

### Time Zone Handling

```sql
-- ❌ TIMESTAMP (no timezone) — ambiguous!
created_at TIMESTAMP  -- Is this UTC? Local time?

-- ✅ TIMESTAMPTZ — always stored as UTC, displayed in session timezone
created_at TIMESTAMPTZ  -- Unambiguous. Always do this.
```

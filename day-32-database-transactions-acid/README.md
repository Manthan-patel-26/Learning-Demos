# Day 32: Database Transactions & ACID

**Date:** March 26, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Transaction management system: atomic money transfers, multi-table order processing with inventory deduction, optimistic locking, race condition testing, and isolation level demos.

## 🚀 How to Run
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=transactions_db postgres:16-alpine

sudo -u postgres psql

CREATE DATABASE transactions_db;

cd backend && npm install
npm run db:setup    # Creates schema + seed data
npm run dev         # http://localhost:3001

# 2nd Terminal
cd frontend && npm install && npm start
```

## 📖 ACID in Practice

### Atomicity — The "all or nothing" guarantee
```typescript
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  -- If server crashes HERE, the debit is rolled back automatically!
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
-- Without transaction: money could disappear if crash between the two UPDATEs
```

### Isolation Levels
| Level | Dirty Read | Non-repeatable Read | Phantom Read |
|-------|-----------|--------------------| -------------|
| READ UNCOMMITTED | ✅ possible | ✅ possible | ✅ possible |
| READ COMMITTED (PostgreSQL default) | ❌ prevented | ✅ possible | ✅ possible |
| REPEATABLE READ | ❌ prevented | ❌ prevented | ✅ possible |
| SERIALIZABLE | ❌ prevented | ❌ prevented | ❌ prevented |

### Pessimistic vs Optimistic Locking
```typescript
// Pessimistic: lock the row (blocks concurrent access)
SELECT * FROM accounts WHERE id = $1 FOR UPDATE;
// Other transactions MUST WAIT until this transaction commits

// Optimistic: don't lock, detect conflicts at write time
UPDATE accounts SET balance = $1, version = version + 1
WHERE id = $2 AND version = $3;
// If rowCount = 0 → someone else updated → retry!
```

## ⚠️ Gotchas
| Problem | Detail |
|---------|--------|
| Deadlock | T1 locks row A wants B; T2 locks row B wants A → forever wait. Fix: always lock in same order |
| Lost update | T1 reads balance, T2 updates, T1 writes → T2's update is overwritten. Fix: use FOR UPDATE or optimistic locking |
| Connection leak | Always `client.release()` in finally block! |
| CHECK constraint | `balance >= 0` prevents negative balances at DB level — last line of defense |

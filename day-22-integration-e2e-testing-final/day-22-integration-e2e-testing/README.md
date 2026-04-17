# Day 22: Integration & E2E Testing

**Date:** March 12, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Integration test suite for the Users CRUD API: happy paths, validation errors, conflict handling, 404s, and full multi-step CRUD lifecycle tests.

## 🚀 How to Run Tests
```bash
cd frontend && npm install && npm start
cd backend && npm install

npm test                        # Run all tests
npm test -- --verbose           # Show each test name
npm test -- --coverage          # With coverage report
npm test -- --watch             # Watch mode (re-runs on change)
```

## 📁 Key Files
```
backend/src/
├── index.ts                ← Express app (exported — NOT app.listen())
└── __tests__/
    └── api.test.ts         ← 20+ integration tests using supertest
```

## 📖 Integration vs Unit vs E2E

| Level | Tests | Tools | Speed |
|-------|-------|-------|-------|
| **Unit** | One function in isolation | Jest, mocks | Fast (ms) |
| **Integration** | Multiple layers together (HTTP → handler → DB) | Jest + supertest | Medium (100ms) |
| **E2E** | Full user flow in real browser | Playwright, Cypress | Slow (seconds) |

## 📖 Key Patterns

### Test Isolation (Critical!)
```typescript
// ✅ Each test starts with fresh data
beforeEach(() => { resetStore(); });

// ❌ Tests that share state are order-dependent (flaky!)
// What if test 3 depends on data created by test 1?
```

### Testing with supertest
```typescript
import request from "supertest";
import { app } from "../index"; // Import the APP, not a running server

// supertest handles starting/stopping internally
const res = await request(app)
  .post("/api/users")
  .send({ name: "Alice", email: "alice@example.com" })
  .set("Authorization", "Bearer token123");

expect(res.status).toBe(201);
expect(res.body.data.email).toBe("alice@example.com");
```

### Exporting app separately from listen
```typescript
// ❌ Can't test this — starts listening on a port
app.listen(3001);

// ✅ Export app, listen conditionally
export const app = express();
// ... routes ...
if (require.main === module) {
  app.listen(3001); // Only when run directly, not when imported by tests
}
```

## 📖 Test Database Pattern (for real DBs)

```typescript
// jest.config.ts
export default {
  globalSetup: "./src/__tests__/setup.ts",     // Runs once before all tests
  globalTeardown: "./src/__tests__/teardown.ts", // Runs once after all tests
};

// setup.ts — create test database
async function setup() {
  process.env.DATABASE_URL = "postgresql://localhost/test_db";
  await pool.query("CREATE DATABASE test_db");
  await runMigrations();
}

// Each test: use transactions for rollback
beforeEach(async () => { await pool.query("BEGIN"); });
afterEach(async ()  => { await pool.query("ROLLBACK"); });
// Rollback after each test → data is never committed!
```

## ⚠️ Flaky Test Prevention

| Problem | Fix |
|---------|-----|
| Order-dependent tests | `beforeEach` resets data. Never use `beforeAll` for mutable state |
| Port conflicts | Export `app`, use supertest (no port needed) |
| Async timing | Always `await` assertions, use `--detectOpenHandles` flag |
| Database state leak | Use transactions + rollback, or reset seed data in `beforeEach` |

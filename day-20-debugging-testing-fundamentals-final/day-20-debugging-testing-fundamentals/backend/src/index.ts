/**
 * ============================================================
 * DAY 20: Buggy Server — Debug & Fix Me!
 * ============================================================
 * This server has intentional bugs. Your job:
 *  1. Memory leak — find and fix it
 *  2. Event loop blocking — identify and refactor
 *  3. Race condition — spot and eliminate
 *  4. Unhandled rejection — add proper error handling
 *
 * To debug:
 *   npm run build && node --inspect dist/index.js
 *   Open Chrome → chrome://inspect → click "inspect" under your Node process
 *   Use DevTools → Memory tab for heap snapshots
 *   Use DevTools → Profiler tab for CPU profiling
 */
import express, { Request, Response } from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── BUG 1: MEMORY LEAK ───────────────────────────────────
// Every request adds to this array but it's NEVER cleaned up.
// Over time: memory grows → out of memory → crash.
const requestLog: { timestamp: number; path: string; body: unknown }[] = [];
// FIX: Limit size or use a circular buffer:
// if (requestLog.length > 1000) requestLog.shift();

// ─── BUG 2: EVENT LOOP BLOCKING ───────────────────────────
// Synchronous heavy computation blocks all other requests.
// While this runs, no other request can be processed!
function slowSync(n: number): number {
  // BUG: Synchronous loop in a request handler
  let result = 0;
  for (let i = 0; i < n * 1_000_000; i++) {
    result += Math.sqrt(i);
  }
  return result;
  // FIX: Use worker_threads for CPU-heavy work, or async with setImmediate breaks
}

// ─── BUG 3: RACE CONDITION ────────────────────────────────
let balance = 1000;
// BUG: Non-atomic read-modify-write with async operations
async function withdraw(amount: number): Promise<boolean> {
  const currentBalance = balance; // Read
  await new Promise(r => setTimeout(r, 50)); // Simulate DB query
  // Another concurrent request can read the SAME balance here!
  if (currentBalance < amount) return false;
  balance = currentBalance - amount; // Write
  return true;
  // FIX: Use database transactions or atomic operations
  // In PostgreSQL: UPDATE accounts SET balance = balance - $1 WHERE balance >= $1
}

// ─── ROUTES ───────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    requestLogSize: requestLog.length,
    balance,
  });
});

app.get("/api/work/:n", (req: Request, res: Response) => {
  const n = parseInt(req.params["n"] ?? "1");
  requestLog.push({ timestamp: Date.now(), path: req.path, body: null }); // Bug 1

  // BUG 2: This blocks the event loop for ~n seconds!
  // Try: curl http://localhost:3001/api/work/3 &
  //      curl http://localhost:3001/health   ← This will hang!
  const result = slowSync(n);
  res.json({ result: Math.round(result), warning: "This blocked the event loop!" });
});

app.post("/api/withdraw", async (req: Request, res: Response) => {
  const { amount } = req.body as { amount: number };
  requestLog.push({ timestamp: Date.now(), path: req.path, body: req.body }); // Bug 1

  // BUG 3: Send 10 concurrent requests for 200 each (1000 total).
  // With race condition: balance can go negative!
  // curl -X POST http://localhost:3001/api/withdraw -H 'Content-Type: application/json' -d '{"amount":200}'
  const success = await withdraw(amount);
  res.json({ success, newBalance: balance, warning: success ? "Check balance with concurrent requests!" : "Insufficient funds" });
});

// BUG 4: Unhandled promise rejection — crashes the process in Node.js 15+
// This is NOT caught anywhere:
app.get("/api/crash", async (_req, res) => {
  // Simulates an async operation that rejects without being caught
  setTimeout(() => {
    Promise.reject(new Error("💥 Unhandled rejection! This crashes the process."));
  }, 100);
  res.json({ message: "Response sent, but process will crash in 100ms..." });
  // FIX: Wrap in try/catch or add .catch() handler
});

app.listen(3001, () => {
  console.log("\n🐛 Day 20 Buggy Server on http://localhost:3001");
  console.log("\nDebugging instructions:");
  console.log("  1. npm run build");
  console.log("  2. node --inspect dist/index.js");
  console.log("  3. Open Chrome → chrome://inspect");
  console.log("  4. Click 'inspect' under your Node process");
  console.log("\nBugs to find and fix:");
  console.log("  GET /api/work/3           → blocks event loop (3 seconds!)");
  console.log("  GET /health               → check requestLog size growing");
  console.log("  POST /api/withdraw (x10)  → race condition, balance goes negative");
  console.log("  GET /api/crash            → unhandled rejection");
});

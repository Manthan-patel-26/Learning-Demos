# Day 20: Debugging & Testing Fundamentals

**Date:** March 10, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Do
The backend has 4 intentional bugs. Your job is to find, understand, and fix all of them using Chrome DevTools inspector.

## 🚀 How to Debug

### Step 1: Start in Debug Mode
```bash
cd backend
npm run build

# Option A: Node.js inspector (attach Chrome DevTools)
node --inspect dist/index.js

# Option B: Break on first line
node --inspect-brk dist/index.js

# Option C: ts-node with inspector (no build needed)
node --inspect -r ts-node/register src/index.ts
```

### Step 2: Open Chrome DevTools
1. Open Chrome → navigate to `chrome://inspect`
2. Click **"inspect"** under your Node process
3. A DevTools window opens connected to your Node.js process

### Step 3: Reproduce Each Bug
```bash
# Bug 1: Memory Leak — watch heap grow
curl http://localhost:3001/health              # Note memoryMB
for i in {1..1000}; do curl -s http://localhost:3001/api/work/1 > /dev/null; done
curl http://localhost:3001/health              # memoryMB increased!

# Bug 2: Event Loop Blocking
curl http://localhost:3001/api/work/5 &        # Takes 5+ seconds
curl http://localhost:3001/health              # THIS HANGS until work/5 finishes!

# Bug 3: Race Condition (concurrent withdrawals)
for i in {1..10}; do
  curl -s -X POST http://localhost:3001/api/withdraw \
    -H "Content-Type: application/json" \
    -d '{"amount":200}' &
done
wait
curl http://localhost:3001/health              # Balance went negative!

# Bug 4: Unhandled Promise Rejection
curl http://localhost:3001/api/crash           # Process will crash after 100ms
```

## 📖 Debugging Techniques

### Memory Leak Detection (Chrome DevTools)
```
1. DevTools → Memory tab
2. Take a heap snapshot (baseline)
3. Make 1000 requests: for i in {1..1000}; do curl http://localhost:3001/api/work/1; done
4. Take another heap snapshot
5. Select "Comparison" between snapshots
6. Look for objects that grew (in our case: Array items in requestLog)
```

### Event Loop Blocking Detection
```
1. DevTools → Profiler tab → Start recording
2. Make a request to /api/work/3
3. Stop recording
4. Look for long synchronous frames (the for loop should be clearly visible)
```

## ✅ Bug Fixes (spoilers — try to find them first!)

```typescript
// Bug 1: Memory Leak FIX
requestLog.push({ timestamp: Date.now(), path: req.path, body: null });
if (requestLog.length > 1000) requestLog.shift(); // ← Add this!

// Bug 2: Event Loop Blocking FIX
// Move CPU work to a worker thread
import { Worker, workerData, parentPort } from "worker_threads";
// Or: break the loop into async chunks using setImmediate

// Bug 3: Race Condition FIX
// Use atomic database operation (no read-modify-write!)
// In PostgreSQL: UPDATE accounts SET balance = balance - $1
//   WHERE id = $2 AND balance >= $1 RETURNING *
// If rowCount === 0: insufficient funds

// Bug 4: Unhandled Rejection FIX
app.get("/api/crash", async (_req, res) => {
  try {
    await Promise.reject(new Error("Intentional error"));
  } catch (err) {
    next(err); // ← Always catch async errors!
  }
});
```

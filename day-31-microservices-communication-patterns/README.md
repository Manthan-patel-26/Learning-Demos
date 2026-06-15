# Day 31: Microservices Communication Patterns

**Date:** March 25, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Async job processing system with BullMQ: email queue (with priority + rate limiting), image processing queue (with concurrency control), report queue (with delays), retry logic, progress tracking, and graceful worker shutdown.

## 🚀 How to Run
```bash
# Terminal 1: Start Redis
docker run -d -p 6379:6379 redis:alpine

# Terminal 2: Start API server (producer)
cd backend && npm install && npm run dev

# Terminal 3: Start worker process (consumer)
cd backend && npm run worker

# Terminal 4: Start frontend
cd frontend && npm install && npm start
```

## 📁 Key Files
```
backend/src/
├── queues/index.ts     ← Queue definitions, types, producer helpers
├── workers/index.ts    ← Worker processes that consume the queues
└── index.ts            ← Express API (adds jobs, checks status)
```

## 📖 Key Concepts

### Producer → Queue → Consumer
```
API request → emailQueue.add(data) → Redis list → Worker processes job
                                                  → Retry on failure
                                                  → Job status stored
```

### BullMQ Core Concepts
```typescript
// PRODUCER: add a job
const job = await emailQueue.add("welcome-email", { to, subject }, {
  priority: 20,           // Higher = processed first
  delay: 5000,            // Wait 5s before processing
  attempts: 3,            // Retry up to 3 times
  backoff: { type: "exponential", delay: 1000 }, // 1s, 2s, 4s between retries
  jobId: `email_${to}`,   // Idempotency key — prevents duplicates
});

// WORKER: process jobs
const worker = new Worker("emails", async (job) => {
  await job.updateProgress(50);   // Update progress
  // ... do work ...
  return { messageId: "msg_123" }; // Stored as returnvalue
}, {
  connection: redis,
  concurrency: 5,                 // 5 jobs simultaneously
  limiter: { max: 100, duration: 60_000 }, // 100 jobs/minute
});
```

### Dead Letter Queues
```typescript
// Jobs that fail ALL retries go to the "failed" set.
// In production:
worker.on("failed", (job, error) => {
  // Move to manual review, send alert, log to Sentry
  deadLetterQueue.add("failed-email", { originalJob: job.data, error: error.message });
});

// Retry a failed job manually
const failedJob = await emailQueue.getJob(jobId);
await failedJob.retry();
```

## ⚠️ Gotchas

| Problem | Detail |
|---------|--------|
| Stalled jobs | Worker crashed during processing → BullMQ auto-retries after `stalledInterval` |
| Duplicate processing | Use `jobId` option as idempotency key |
| Job ordering | BullMQ doesn't guarantee FIFO without `priority`. Use priority queues for ordering |
| maxRetriesPerRequest | Must be `null` for BullMQ connections (different from regular ioredis) |
| graceful shutdown | Always call `worker.close()` before process.exit() |

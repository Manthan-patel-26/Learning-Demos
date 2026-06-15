/**
 * ============================================================
 * DAY 31: JOB QUEUE SYSTEM WITH BULLMQ
 * ============================================================
 * BullMQ is the production-grade Redis-backed job queue for Node.js.
 * It handles: retries, priorities, delays, rate limiting, concurrency.
 *
 * Architecture:
 *  Producer (API server)  →  Redis  →  Consumer (Worker process)
 *
 * WHY A MESSAGE QUEUE?
 *  - Decouple heavy work from the HTTP request/response cycle
 *  - Scale workers independently from the API server
 *  - Retry failed jobs automatically
 *  - Process jobs in priority order
 *  - Prevent overloading downstream services (rate limiting)
 *
 * PREREQUISITE: Redis running
 *   docker run -d -p 6379:6379 redis:alpine
 */

import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

// ─── REDIS CONNECTION ─────────────────────────────────────
// BullMQ requires a dedicated IORedis connection (NOT ioredis cluster)
export const redisConnection = new IORedis(
  process.env["REDIS_URL"] ?? "redis://localhost:6379",
  {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Required by BullMQ
  }
);

redisConnection.on("error", (err) =>
  console.error("[Redis] Connection error:", err.message)
);

// ─── JOB TYPE DEFINITIONS ─────────────────────────────────
// Strong typing makes queue jobs self-documenting and safe.

export interface EmailJobData {
  to: string;
  subject: string;
  template: "welcome" | "order_confirm" | "password_reset" | "newsletter";
  variables: Record<string, string>;
  userId?: string;
}

export interface ImageJobData {
  sourceUrl: string;
  outputPath: string;
  operations: Array<
    | { type: "resize"; width: number; height: number }
    | { type: "compress"; quality: number }
    | { type: "convert"; format: "webp" | "jpeg" | "png" }
    | { type: "watermark"; text: string }
  >;
  metadata?: Record<string, string>;
}

export interface ReportJobData {
  reportType: "daily_sales" | "user_activity" | "inventory" | "revenue";
  dateRange: { from: string; to: string };
  requestedBy: string;
  outputFormat: "pdf" | "csv" | "xlsx";
}

// ─── QUEUE FACTORY ────────────────────────────────────────
// Shared config for all queues
const defaultQueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    // Retry failed jobs with exponential backoff
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 1000, // Start at 1s, then 2s, 4s
    },
    // Remove completed jobs after 24h (keeps Redis lean)
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    // Keep failed jobs for 7 days for debugging
    removeOnFail: { age: 7 * 24 * 3600 },
  },
};

// ─── QUEUE INSTANCES ──────────────────────────────────────
// Each queue is a separate Redis list with its own workers.
// You can scale email workers independently from image workers.

export const emailQueue = new Queue<EmailJobData>("emails", {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 5,         // Email is critical — more retries
    priority: 10,        // Default priority (higher = processed first)
  },
});

export const imageQueue = new Queue<ImageJobData>("images", {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 2,         // Image processing — fewer retries (expensive)
    delay: 0,
  },
});

export const reportQueue = new Queue<ReportJobData>("reports", {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 2,
    // Reports can wait — lower priority than emails
  },
});

// ─── QUEUE EVENT LISTENERS ────────────────────────────────
// QueueEvents listens to events across ALL workers for a queue.
// Use for: logging, metrics, notifications, monitoring dashboards.

export function setupQueueEvents() {
  const emailEvents = new QueueEvents("emails", { connection: redisConnection });

  emailEvents.on("completed", ({ jobId, returnvalue }) => {
    console.log(`[Email Queue] ✅ Job ${jobId} completed:`, returnvalue);
  });

  emailEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(`[Email Queue] ❌ Job ${jobId} failed: ${failedReason}`);
    // In production: send to Sentry, trigger PagerDuty alert, etc.
  });

  emailEvents.on("progress", ({ jobId, data }) => {
    console.log(`[Email Queue] ⏳ Job ${jobId} progress:`, data);
  });

  emailEvents.on("stalled", ({ jobId }) => {
    // Stalled = worker died while processing — BullMQ auto-retries
    console.warn(`[Email Queue] ⚠️ Job ${jobId} stalled (worker crash?) — will retry`);
  });

  const imageEvents = new QueueEvents("images", { connection: redisConnection });
  imageEvents.on("completed", ({ jobId }) =>
    console.log(`[Image Queue] ✅ Job ${jobId} completed`)
  );
  imageEvents.on("failed", ({ jobId, failedReason }) =>
    console.error(`[Image Queue] ❌ Job ${jobId} failed: ${failedReason}`)
  );

  return { emailEvents, imageEvents };
}

// ─── PRODUCER HELPERS ─────────────────────────────────────
// Wrapper functions provide a type-safe API for adding jobs.

export async function sendEmail(
  data: EmailJobData,
  options: { priority?: number; delay?: number; jobId?: string } = {}
) {
  const job = await emailQueue.add(
    `email:${data.template}`, // Job name (used for filtering/monitoring)
    data,
    {
      priority: options.priority,
      delay: options.delay,       // Process after X ms (scheduled emails)
      jobId: options.jobId,       // Idempotency key (prevent duplicate sends)
    }
  );
  console.log(`[Producer] Added email job ${job.id} for ${data.to}`);
  return job;
}

export async function processImage(
  data: ImageJobData,
  options: { priority?: number } = {}
) {
  const job = await imageQueue.add("image:process", data, {
    priority: options.priority ?? 5,
  });
  console.log(`[Producer] Added image job ${job.id}`);
  return job;
}

export async function generateReport(data: ReportJobData) {
  // Reports are scheduled for later (non-urgent)
  const job = await reportQueue.add("report:generate", data, {
    delay: 5000, // Wait 5s before processing (batch similar requests)
  });
  console.log(`[Producer] Scheduled report job ${job.id}`);
  return job;
}

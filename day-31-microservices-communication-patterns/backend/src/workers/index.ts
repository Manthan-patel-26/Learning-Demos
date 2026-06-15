/**
 * ============================================================
 * DAY 31: WORKER PROCESSES — Queue Consumers
 * ============================================================
 * Workers run in SEPARATE processes from the API server.
 * This is critical: if a worker crashes, the API server keeps running.
 *
 * Run workers:   npm run worker
 * Run API:       npm run dev   (in a separate terminal)
 *
 * In production: use PM2 or Docker to run multiple worker instances:
 *   pm2 start dist/workers/index.js --name worker -i 4  (4 instances)
 */

import { Worker, Job } from "bullmq";
import { redisConnection, EmailJobData, ImageJobData, ReportJobData } from "../queues";

// ─── EMAIL WORKER ─────────────────────────────────────────
/**
 * Processes email jobs from the "emails" queue.
 * concurrency: 5 means this worker handles 5 emails simultaneously.
 * In production, replace simulateEmailSend with: nodemailer, SendGrid, AWS SES, etc.
 */
const emailWorker = new Worker<EmailJobData>(
  "emails",
  async (job: Job<EmailJobData>) => {
    const { to, subject, template, variables, userId } = job.data;

    console.log(`\n[Email Worker] Processing job ${job.id}`);
    console.log(`  To: ${to} | Template: ${template}`);

    // ── Update progress so UI can show % complete ──────────
    await job.updateProgress(10);

    // Step 1: Render the email template
    console.log(`  Rendering template: ${template}`);
    await simulateWork(200); // ~200ms to render HTML
    await job.updateProgress(40);

    // Step 2: Validate the email address
    if (!to.includes("@")) {
      // Throwing here will fail the job and trigger a retry
      throw new Error(`Invalid email address: ${to}`);
    }

    // Step 3: Send via email provider
    console.log(`  Sending to ${to}...`);
    await simulateWork(500); // ~500ms for SMTP/API call
    await job.updateProgress(90);

    // Step 4: Log the send event
    if (userId) {
      console.log(`  Logging send event for user ${userId}`);
      await simulateWork(50);
    }

    await job.updateProgress(100);
    console.log(`  ✅ Email sent successfully`);

    // Return value is stored in the job's returnvalue field
    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      to,
      template,
      sentAt: new Date().toISOString(),
    };
  },
  {
    connection: redisConnection,
    concurrency: 5,        // Process up to 5 emails simultaneously

    // ── Rate Limiting ──────────────────────────────────────
    // Limit to 100 emails per minute (respects provider rate limits)
    limiter: { max: 100, duration: 60_000 },

    // ── Dead Letter Queue ──────────────────────────────────
    // Jobs that fail all retry attempts go here for manual inspection
    // In production, you'd set up a separate "failed-emails" queue
  }
);

// ─── IMAGE PROCESSING WORKER ──────────────────────────────
/**
 * Processes image jobs. Lower concurrency (CPU-intensive).
 * In production: use Sharp for real image processing.
 */
const imageWorker = new Worker<ImageJobData>(
  "images",
  async (job: Job<ImageJobData>) => {
    const { sourceUrl, operations } = job.data;
    console.log(`\n[Image Worker] Processing job ${job.id}`);
    console.log(`  Source: ${sourceUrl}`);
    console.log(`  Operations: ${operations.map(o => o.type).join(", ")}`);

    const results: string[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i]!;
      const progress = Math.round(((i + 1) / operations.length) * 100);

      console.log(`  [${i + 1}/${operations.length}] Applying: ${op.type}`);
      await simulateWork(300); // Each operation ~300ms

      results.push(`${op.type} applied`);
      await job.updateProgress(progress);
    }

    console.log(`  ✅ Image processing complete`);
    return { operations: results, outputPath: job.data.outputPath };
  },
  {
    connection: redisConnection,
    concurrency: 2, // Image processing is CPU-heavy — fewer concurrent jobs
  }
);

// ─── REPORT WORKER ────────────────────────────────────────
const reportWorker = new Worker<ReportJobData>(
  "reports",
  async (job: Job<ReportJobData>) => {
    const { reportType, dateRange, requestedBy, outputFormat } = job.data;
    console.log(`\n[Report Worker] Generating ${reportType} report`);
    console.log(`  Range: ${dateRange.from} → ${dateRange.to}`);
    console.log(`  Format: ${outputFormat} for ${requestedBy}`);

    await job.updateProgress(20);
    await simulateWork(1000); // DB query simulation
    await job.updateProgress(60);
    await simulateWork(500);  // PDF/CSV generation simulation
    await job.updateProgress(100);

    console.log(`  ✅ Report ready`);
    return {
      reportUrl: `/reports/${reportType}_${Date.now()}.${outputFormat}`,
      generatedAt: new Date().toISOString(),
    };
  },
  { connection: redisConnection, concurrency: 1 }
);

// ─── ERROR HANDLING FOR WORKERS ───────────────────────────
// Workers emit "failed" events when a job exhausts all retries.
// This is your last chance to log/alert before the job is moved
// to the failed set (the "dead letter queue").

emailWorker.on("failed", (job, error) => {
  console.error(`[Email Worker] ❌ Job ${job?.id} permanently failed:`, error.message);
  // In production:
  // - Send alert to Slack/PagerDuty
  // - Log to Sentry
  // - Move to manual review queue
});

imageWorker.on("failed", (job, error) => {
  console.error(`[Image Worker] ❌ Job ${job?.id} permanently failed:`, error.message);
});

// Workers emit "completed" events on success
emailWorker.on("completed", (job, result) => {
  console.log(`[Email Worker] ✅ Job ${job.id} completed → messageId: ${result.messageId}`);
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────
// Critical: allow in-progress jobs to finish before shutting down.
// Without this, jobs are "stalled" and re-queued, risking duplicate processing.

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down workers gracefully...`);
  await Promise.all([
    emailWorker.close(),   // Stop accepting new jobs, finish current ones
    imageWorker.close(),
    reportWorker.close(),
  ]);
  redisConnection.disconnect();
  console.log("✅ All workers shut down cleanly");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ─── HELPER ───────────────────────────────────────────────
function simulateWork(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log("\n🔧 Workers started and listening for jobs...");
console.log("   Email worker:  concurrency=5, rate=100/min");
console.log("   Image worker:  concurrency=2");
console.log("   Report worker: concurrency=1");
console.log("\nAPI server should be running at http://localhost:3001");
console.log("Add jobs via: POST /api/jobs/email, POST /api/jobs/image\n");

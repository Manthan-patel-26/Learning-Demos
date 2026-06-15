/**
 * DAY 31: Job Queue API Server
 * Produces jobs — workers consume them asynchronously.
 * Run: npm run dev (API)  +  npm run worker (in separate terminal)
 */
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import {
  emailQueue, imageQueue, reportQueue,
  sendEmail, processImage, generateReport, setupQueueEvents,
} from "./queues";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

setupQueueEvents();

// ─── HEALTH ───────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    const [emailCount, imageCount, reportCount] = await Promise.all([
      emailQueue.count(), imageQueue.count(), reportQueue.count()
    ]);
    res.json({
      status: "ok",
      queues: { emails: emailCount, images: imageCount, reports: reportCount },
      hint: "Run `npm run worker` in a separate terminal to process jobs",
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      message: "Redis not connected",
      setup: "docker run -d -p 6379:6379 redis:alpine",
    });
  }
});

// ─── ADD EMAIL JOB ────────────────────────────────────────
app.post("/api/jobs/email", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { to, template = "welcome", subject = "Hello!", variables = {}, priority } = req.body;
    if (!to) { res.status(400).json({ error: "to is required" }); return; }

    const job = await sendEmail(
      { to, subject, template, variables },
      { priority, jobId: `email_${to}_${template}` } // idempotency key
    );

    res.status(202).json({
      status: "queued",
      jobId: job.id,
      message: "Email job added to queue",
      hint: "Check job status: GET /api/jobs/email/:id",
    });
  } catch (err) { next(err); }
});

// ─── ADD IMAGE JOB ────────────────────────────────────────
app.post("/api/jobs/image", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceUrl = "https://example.com/image.jpg", operations } = req.body;
    const ops = operations ?? [
      { type: "resize", width: 800, height: 600 },
      { type: "compress", quality: 80 },
      { type: "convert", format: "webp" },
    ];
    const job = await processImage({ sourceUrl, outputPath: `/output/${Date.now()}.webp`, operations: ops });
    res.status(202).json({ status: "queued", jobId: job.id, message: "Image processing job added" });
  } catch (err) { next(err); }
});

// ─── ADD REPORT JOB ───────────────────────────────────────
app.post("/api/jobs/report", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportType = "daily_sales", outputFormat = "pdf", requestedBy = "admin@example.com" } = req.body;
    const job = await generateReport({
      reportType, outputFormat, requestedBy,
      dateRange: { from: "2026-01-01", to: new Date().toISOString().split("T")[0]! },
    });
    res.status(202).json({ status: "queued", jobId: job.id, message: "Report job scheduled (5s delay)" });
  } catch (err) { next(err); }
});

// ─── JOB STATUS ───────────────────────────────────────────
app.get("/api/jobs/:queue/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = { emails: emailQueue, images: imageQueue, reports: reportQueue }[req.params["queue"]!];
    if (!q) { res.status(400).json({ error: "Unknown queue. Use: emails, images, reports" }); return; }

    const job = await q.getJob(req.params["id"]!);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const state = await job.getState();
    res.json({
      id: job.id, name: job.name, state,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      timestamp: { added: new Date(job.timestamp).toISOString(),
        processed: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finished: job.finishedOn ? new Date(job.finishedOn).toISOString() : null },
    });
  } catch (err) { next(err); }
});

// ─── QUEUE STATS ──────────────────────────────────────────
app.get("/api/queues/stats", async (_req, res, next) => {
  try {
    const stats = await Promise.all(
      [
        { name: "emails", queue: emailQueue },
        { name: "images", queue: imageQueue },
        { name: "reports", queue: reportQueue },
      ].map(async ({ name, queue }) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(), queue.getActiveCount(),
          queue.getCompletedCount(), queue.getFailedCount(), queue.getDelayedCount(),
        ]);
        return { name, waiting, active, completed, failed, delayed };
      })
    );
    res.json({ status: "success", data: stats });
  } catch (err) { next(err); }
});

// ─── BULK DEMO: Add 10 jobs at once ───────────────────────
app.post("/api/jobs/demo-bulk", async (_req, res, next) => {
  try {
    const emails = ["alice@example.com","bob@example.com","charlie@example.com",
                    "dave@example.com","eve@example.com"];
    const jobs = await Promise.all(emails.map((email, i) =>
      sendEmail(
        { to: email, subject: `Welcome!`, template: "welcome", variables: { name: email.split("@")[0]! } },
        { priority: i === 0 ? 20 : 10 } // Alice gets priority processing
      )
    ));
    res.status(202).json({
      status: "queued",
      jobCount: jobs.length,
      jobIds: jobs.map(j => j.id),
      note: "Alice's email has priority=20, others have priority=10",
    });
  } catch (err) { next(err); }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: err.message });
});

app.listen(3001, () => {
  console.log("\n🚀 Day 31 API on http://localhost:3001");
  console.log("   Prerequisites: Redis running (docker run -d -p 6379:6379 redis:alpine)");
  console.log("\n   Start workers: npm run worker (in separate terminal)");
  console.log("\n   Endpoints:");
  console.log("   POST /api/jobs/email        — add email job");
  console.log("   POST /api/jobs/image        — add image job");
  console.log("   POST /api/jobs/report       — add report job (delayed 5s)");
  console.log("   POST /api/jobs/demo-bulk    — add 5 emails with different priorities");
  console.log("   GET  /api/jobs/:queue/:id   — check job status");
  console.log("   GET  /api/queues/stats      — queue statistics");
});

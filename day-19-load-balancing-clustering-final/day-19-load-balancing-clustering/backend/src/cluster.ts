/**
 * ============================================================
 * DAY 19: Node.js Clustering with Graceful Shutdown
 * ============================================================
 * Node.js is single-threaded by default.
 * Clustering spawns one worker per CPU core → full CPU usage.
 *
 * Run single: npm run dev
 * Run cluster: npm run cluster
 */
import cluster from "cluster";
import os from "os";
import express, { Request, Response } from "express";
import cors from "cors";

const NUM_CPUS = os.cpus().length;

// ─── CLUSTER MODE ─────────────────────────────────────────
// cluster.isPrimary: the main process (fork manager)
// !cluster.isPrimary: a worker process (handles HTTP requests)
if (cluster.isPrimary) {
  console.log(`\n🔀 Primary process ${process.pid} starting`);
  console.log(`   Spawning ${NUM_CPUS} workers (one per CPU core)`);

  // Fork one worker per CPU
  for (let i = 0; i < NUM_CPUS; i++) {
    cluster.fork();
  }

  // If a worker crashes, restart it
  cluster.on("exit", (worker, code, signal) => {
    console.warn(
      `⚠️  Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Restarting...`,
    );
    cluster.fork(); // Automatic restart
  });

  // Optional: receive messages from workers
  cluster.on("message", (worker, message) => {
    if (message.type === "ready") {
      console.log(`   Worker ${worker.process.pid} is ready`);
    }
  });
} else {
  // ── WORKER PROCESS ──────────────────────────────────────
  // Each worker is an independent Node.js process.
  // They share the same port (the OS distributes connections between workers).
  // ⚠️ Workers do NOT share memory! No shared variables.
  // Use Redis/PostgreSQL for shared state across workers.

  const app = express();
  app.use(cors({ origin: "*" }));
  app.use(express.json());

  let requestCount = 0; // This is per-worker, not global!

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      workerId: cluster.worker?.id,
      workerPid: process.pid,
      requests: requestCount,
      uptime: Math.round(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    });
  });

  app.get("/api/work", (_req: Request, res: Response) => {
    requestCount++;
    // Simulate CPU work
    let result = 0;
    for (let i = 0; i < 1_000_000; i++) result += Math.sqrt(i);

    res.json({
      result: Math.round(result),
      handledBy: { workerId: cluster.worker?.id, pid: process.pid },
      totalRequests: requestCount,
      hint: "Make multiple requests to see different workers handling them!",
    });
  });

  // ── GRACEFUL SHUTDOWN ──────────────────────────────────
  // When the primary sends SIGTERM, each worker should:
  //  1. Stop accepting new connections
  //  2. Finish in-flight requests
  //  3. Exit cleanly
  const server = app.listen(3001, () => {
    console.log(
      `   Worker ${cluster.worker?.id} (PID: ${process.pid}) listening on :3001`,
    );
    process.send?.({ type: "ready" }); // Notify primary we're ready
  });

  process.on("SIGTERM", () => {
    console.log(`\nWorker ${cluster.worker?.id} shutting down gracefully...`);
    server.close(() => {
      console.log(`Worker ${cluster.worker?.id} closed all connections`);
      process.exit(0);
    });

    // Force exit after 30s if connections won't close
    setTimeout(() => process.exit(1), 30_000);
  });
}

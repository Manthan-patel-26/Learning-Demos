/**
 * ============================================================
 * DAY 5: Express TypeScript Boilerplate - Entry Point
 * ============================================================
 * Production-grade setup with:
 *  ✅ Typed middleware chain
 *  ✅ Env validation at startup
 *  ✅ Global error handler
 *  ✅ Request logger with timing
 *  ✅ Rate limiting
 *  ✅ Zod validation on all routes
 *  ✅ Custom error classes
 *  ✅ Graceful shutdown
 */

import express from "express";
import cors from "cors";
import { config, isDev } from "./config/env";
import {
  requestLogger,
  errorHandler,
  notFound,
  rateLimiter,
} from "./middleware";
import { usersRouter } from "./routes/users";

const app = express();

// ─── MIDDLEWARE ORDER MATTERS! ────────────────────────────
// Express processes middleware in the ORDER you add it.
// Wrong order = security holes or broken functionality.

// 1. CORS — must be FIRST to handle preflight OPTIONS requests
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (config.ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true, // Allow cookies to be sent cross-origin
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// 2. Rate limiter — early in chain, before parsing body (saves CPU)
app.use(rateLimiter);

// 3. Body parsers — before any route handler that needs req.body
app.use(express.json({ limit: "10kb" })); // Reject huge payloads (DoS protection)
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// 4. Request logger — after body parsing, before routes
app.use(requestLogger);

// ─── HEALTH CHECK ─────────────────────────────────────────
// Load balancers and orchestrators (K8s) ping this to check if app is alive.
// Keep it simple — no DB queries, no auth.
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
});

// ─── ROUTES ───────────────────────────────────────────────
app.use("/api/users", usersRouter);

// ─── ERROR HANDLERS (MUST be last) ────────────────────────
// 404 handler — catches all unmatched routes
app.use(notFound);
// Global error handler — MUST have 4 params (err, req, res, next)
app.use(errorHandler);

// ─── START SERVER ─────────────────────────────────────────
const server = app.listen(config.PORT, () => {
  console.log(`\n🚀 Server running in ${config.NODE_ENV} mode`);
  console.log(`   http://localhost:${config.PORT}\n`);
  if (isDev) {
    console.log("Endpoints:");
    console.log(`  GET    /health`);
    console.log(`  GET    /api/users`);
    console.log(`  GET    /api/users/:id`);
    console.log(`  POST   /api/users   (body: { name, email, role?, age? })`);
    console.log(`  PATCH  /api/users/:id`);
    console.log(`  DELETE /api/users/:id`);
  }
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────
// In production, SIGTERM is sent when the process should stop (e.g., deploy, scale down).
// We finish handling current requests before closing.
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("✅ HTTP server closed. Process exiting.");
    process.exit(0);
  });
  // Force shutdown after 10 seconds if still open
  setTimeout(() => {
    console.error("⚠️ Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT")); // Ctrl+C

// Handle unhandled promise rejections — don't let them silently fail
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  // In production, crash and let your process manager restart
  if (config.NODE_ENV === "production") process.exit(1);
});

export default app;

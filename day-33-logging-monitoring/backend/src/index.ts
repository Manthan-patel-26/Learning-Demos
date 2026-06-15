/**
 * DAY 33: Production Logging Server
 * Every request is logged with correlationId, timing, and PII redaction.
 */
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { logger, log, checkAlertRules } from "./logger";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ─── CORRELATION ID MIDDLEWARE ────────────────────────────
// Attach a unique ID to every request — trace it across all log lines!
// Frontend: set X-Correlation-ID header; Backend: generate if not provided.
declare global { namespace Express { interface Request { correlationId?: string; startTime?: number; } } }

app.use((req, _res, next) => {
  req.correlationId = (req.headers["x-correlation-id"] as string) ?? uuidv4().slice(0, 8);
  req.startTime = Date.now();
  next();
});

// ─── REQUEST LOGGER MIDDLEWARE ────────────────────────────
app.use((req, res, next) => {
  res.setHeader("X-Correlation-ID", req.correlationId!);

  // Log AFTER response is sent (we need the status code)
  res.on("finish", () => {
    const durationMs = Date.now() - (req.startTime ?? Date.now());
    log.request({
      method: req.method, path: req.path,
      statusCode: res.statusCode,
      durationMs,
      correlationId: req.correlationId!,
      ip: req.ip,
    });
    checkAlertRules(res.statusCode, req.path, durationMs);
  });
  next();
});

// ─── ROUTES ───────────────────────────────────────────────

app.get("/health", (_req, res) => {
  logger.info("Health check requested");
  res.json({ status: "ok", logging: "active", level: logger.level });
});

// Simulate a login with PII redaction demo
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  // ✅ SAFE: logger.ts redacts "password" field automatically
  logger.info("Login attempt", {
    correlationId: req.correlationId,
    email,           // ← Safe to log
    password,        // ← Will be [REDACTED] by PII redactor!
    token: "secret_token_123", // ← Also [REDACTED]!
  });
  log.security("Login attempt", { email, correlationId: req.correlationId });
  res.json({ success: email === "alice@example.com", correlationId: req.correlationId });
});

// Simulate slow query
app.get("/api/slow", async (req: Request, res: Response) => {
  const start = Date.now();
  await new Promise(r => setTimeout(r, 1200)); // 1.2s — slow!
  log.query("SELECT * FROM huge_table WHERE ...", Date.now() - start, {
    correlationId: req.correlationId,
  });
  res.json({ message: "Slow query completed", correlationId: req.correlationId });
});

// Trigger different log levels
app.get("/api/log-demo/:level", (req: Request, res: Response) => {
  const { level } = req.params;
  const msg = `Demo ${level} log entry`;
  const meta = { correlationId: req.correlationId, demoField: "safe_value", userSecret: "this_will_be_redacted" };

  if (level === "error") logger.error(msg, meta);
  else if (level === "warn") logger.warn(msg, meta);
  else if (level === "info") logger.info(msg, meta);
  else if (level === "debug") logger.debug(msg, meta);
  else logger.http(msg, meta);

  res.json({ logged: level, correlationId: req.correlationId });
});

// Trigger 500 error 3x to see alert
app.get("/api/break", (_req: Request, res: Response, next: NextFunction) => {
  next(new Error("Simulated 500 error — call 3 times to trigger ALERT!"));
});

// Simulate a business event
app.post("/api/orders", (req: Request, res: Response) => {
  const orderId = `ord_${Date.now()}`;
  log.event("ORDER_PLACED", {
    orderId, userId: req.body.userId, amount: req.body.amount,
    correlationId: req.correlationId,
  });
  res.status(201).json({ orderId, correlationId: req.correlationId });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  log.error("Unhandled request error", err, { correlationId: req.correlationId, path: req.path });
  res.status(500).json({
    error: "Internal server error",
    correlationId: req.correlationId, // Include so client can report it!
  });
});

app.listen(3001, () => {
  logger.info("Server started", { port: 3001, environment: process.env["NODE_ENV"] ?? "development" });
  console.log("\n📋 Day 33 Logging Server on http://localhost:3001");
  console.log("   Logs written to: ./logs/ directory");
  console.log("\n   Test PII redaction: POST /api/auth/login { email, password }");
  console.log("   Test slow query alert: GET /api/slow (>1s)");
  console.log("   Test error alert: GET /api/break (3x → alert fires)");
});

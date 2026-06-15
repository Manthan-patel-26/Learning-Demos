/**
 * ============================================================
 * DAY 33: PRODUCTION LOGGING SYSTEM WITH WINSTON
 * ============================================================
 * Features:
 *  1. Structured JSON logging (machine-readable)
 *  2. Multiple transports (console, file, daily rotation)
 *  3. PII redaction (never log passwords, tokens, SSNs)
 *  4. Correlation IDs (trace a request across logs)
 *  5. Log levels (error, warn, info, http, debug)
 *  6. Performance timing
 *  7. "Alerting" rules for critical errors
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// ─── LOG DIRECTORY ────────────────────────────────────────
const LOG_DIR = path.join(__dirname, "..", "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ─── PII REDACTION ────────────────────────────────────────
// NEVER log passwords, tokens, credit cards, or SSNs!
// This interceptor runs on every log entry.
const PII_FIELDS = new Set([
  "password", "passwordHash", "token", "accessToken", "refreshToken",
  "creditCard", "cardNumber", "cvv", "ssn", "secret", "apiKey",
  "authorization", "cookie",
]);

function redactPII(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) return obj.map(item => redactPII(item, depth + 1));

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_FIELDS.has(key.toLowerCase())) {
      redacted[key] = "[REDACTED]"; // Never log the actual value!
    } else {
      redacted[key] = redactPII(value, depth + 1);
    }
  }
  return redacted;
}

// Custom Winston format that applies PII redaction to every log entry
const redactFormat = winston.format((info) => {
  if (info["meta"]) info["meta"] = redactPII(info["meta"]);
  if (info["data"]) info["data"] = redactPII(info["data"]);
  if (info["body"]) info["body"] = redactPII(info["body"]);
  return info;
});

// ─── LOG FORMAT ───────────────────────────────────────────
// Structured JSON format for production (parseable by Datadog, CloudWatch, etc.)
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  redactFormat(),
  winston.format.errors({ stack: true }), // Include stack traces
  winston.format.json()
);

// Human-readable format for development console
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, correlationId, durationMs, ...meta }) => {
    const parts = [`${timestamp} ${level}: ${message}`];
    if (correlationId) parts.push(`[${correlationId}]`);
    if (durationMs !== undefined) parts.push(`(${durationMs}ms)`);
    if (Object.keys(meta).length > 0 && meta["service"] === undefined) {
      parts.push(JSON.stringify(meta));
    }
    return parts.join(" ");
  })
);

// ─── TRANSPORTS ───────────────────────────────────────────
// Transports = where logs go. Multiple destinations possible.

const isDev = process.env["NODE_ENV"] !== "production";

const transports: winston.transport[] = [
  // Console: pretty in dev, JSON in prod
  new winston.transports.Console({
    format: isDev ? devFormat : jsonFormat,
    level: isDev ? "debug" : "info",
  }),
];

// In production: add file transports
if (!isDev) {
  // Error log — persistent, important for debugging crashes
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB max
    })
  );

  // Daily rotating combined log — auto-deletes old files
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, "app-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "50m",
      maxFiles: "14d",          // Keep 14 days of logs
      format: jsonFormat,
      level: "info",
    }) as unknown as winston.transport
  );
}

// ─── WINSTON LOGGER ───────────────────────────────────────
export const logger = winston.createLogger({
  level: isDev ? "debug" : "info",
  defaultMeta: {
    service: "day33-api",
    environment: process.env["NODE_ENV"] ?? "development",
    version: "1.0.0",
  },
  transports,
  // Don't crash on uncaught exceptions — log them!
  exceptionHandlers: [
    new winston.transports.Console({ format: isDev ? devFormat : jsonFormat }),
    new winston.transports.File({ filename: path.join(LOG_DIR, "exceptions.log"), format: jsonFormat }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(LOG_DIR, "rejections.log"), format: jsonFormat }),
  ],
});

// ─── TYPED LOGGING HELPERS ────────────────────────────────
// Structured logging: use consistent field names across your whole app.
// This makes log queries in Datadog/CloudWatch/Elasticsearch powerful.

export const log = {
  /** Log a successful request */
  request: (meta: {
    method: string; path: string; statusCode: number;
    durationMs: number; correlationId: string;
    userId?: string; ip?: string;
  }) => {
    const level = meta.statusCode >= 500 ? "error"
      : meta.statusCode >= 400 ? "warn" : "http";
    logger.log(level, "HTTP Request", meta);
  },

  /** Log a business event (user signup, purchase, etc.) */
  event: (name: string, meta: Record<string, unknown> = {}) => {
    logger.info(`Event: ${name}`, { event: name, ...meta });
  },

  /** Log a database query with timing */
  query: (sql: string, durationMs: number, meta: Record<string, unknown> = {}) => {
    const level = durationMs > 1000 ? "warn" : "debug";
    logger.log(level, "Database query", {
      sql: sql.slice(0, 200), // Truncate long queries
      durationMs,
      slow: durationMs > 1000,
      ...meta,
    });
    if (durationMs > 1000) {
      logger.warn("SLOW QUERY DETECTED", { sql: sql.slice(0, 200), durationMs });
      // In production: trigger alert to Slack, PagerDuty, etc.
    }
  },

  /** Log security events */
  security: (event: string, meta: Record<string, unknown> = {}) => {
    logger.warn(`Security: ${event}`, { securityEvent: event, ...meta });
  },

  /** Log errors with full context */
  error: (message: string, err: unknown, meta: Record<string, unknown> = {}) => {
    const errorMeta = err instanceof Error
      ? { errorMessage: err.message, errorName: err.name, stack: err.stack }
      : { errorRaw: String(err) };
    logger.error(message, { ...errorMeta, ...meta });
  },
};

// ─── ALERTING RULES ───────────────────────────────────────
// In production, hook these up to PagerDuty, Slack, etc.
// Here we just log the alert — replace with real notifications.

const errorCounts: Record<string, number> = {};

export function checkAlertRules(statusCode: number, path: string, durationMs: number) {
  // Alert 1: 5xx error rate spike
  if (statusCode >= 500) {
    errorCounts[path] = (errorCounts[path] ?? 0) + 1;
    if ((errorCounts[path] ?? 0) >= 3) {
      logger.error("🚨 ALERT: High error rate on endpoint", {
        alert: "HIGH_ERROR_RATE", path, count: errorCounts[path],
        action: "Check application logs. Page on-call if sustained.",
      });
    }
  } else {
    errorCounts[path] = 0; // Reset on success
  }

  // Alert 2: Slow response time
  if (durationMs > 5000) {
    logger.error("🚨 ALERT: Slow response detected", {
      alert: "SLOW_RESPONSE", path, durationMs,
      action: "Check DB query performance, external APIs",
    });
  }
}

/**
 * ============================================================
 * DAY 9: Complete API Middleware Suite
 * ============================================================
 * Exports (in the order they should be used):
 *
 *  1. AppError, ValidationError, NotFoundError (error classes)
 *  2. requestLogger        — structured request/response logging
 *  3. responseFormatter    — standardize all API responses
 *  4. validateBody/Query   — Zod schema validation
 *  5. rateLimiter          — protect against abuse
 *  6. notFound             — 404 for unmatched routes
 *  7. errorHandler         — LAST: global error formatter
 */

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import rateLimit from "express-rate-limit";

// ─── 1. CUSTOM ERROR CLASSES ──────────────────────────────
// Hierarchy: AppError → ValidationError / NotFoundError / etc.

export class AppError extends Error {
  public readonly isOperational = true; // Distinguishes expected vs unexpected errors

  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      404,
      "NOT_FOUND",
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(msg = "Authentication required") {
    super(401, "UNAUTHORIZED", msg);
  }
}

export class ForbiddenError extends AppError {
  constructor(msg = "You don't have permission to perform this action") {
    super(403, "FORBIDDEN", msg);
  }
}

export class ConflictError extends AppError {
  constructor(resource: string, field?: string) {
    super(
      409,
      "CONFLICT",
      field
        ? `${resource} with this ${field} already exists`
        : `${resource} already exists`,
    );
  }
}

export class TooManyRequestsError extends AppError {
  constructor() {
    super(429, "RATE_LIMIT_EXCEEDED", "Too many requests. Please slow down.");
  }
}

// ─── 2. STRUCTURED LOGGER ─────────────────────────────────
// In production, pipe this to a logging service (Datadog, CloudWatch, etc.)

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  message: string;
  [key: string]: unknown;
}

export const logger = {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    // In production: replace with winston or pino
    // These output structured JSON, filter by level, ship to logging services
    if (level === "ERROR") console.error(JSON.stringify(entry));
    else if (level === "WARN") console.warn(JSON.stringify(entry));
    else if (process.env["LOG_LEVEL"] !== "silent")
      console.log(JSON.stringify(entry));
  },
  debug: (msg: string, meta?: Record<string, unknown>) =>
    logger.log("DEBUG", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) =>
    logger.log("INFO", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    logger.log("WARN", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    logger.log("ERROR", msg, meta),
};

// Extend Express Request with request tracking fields
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      requestId?: string;
    }
  }
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  req.startTime = Date.now();
  req.requestId = crypto.randomUUID().slice(0, 8); // Short unique ID per request

  // Set request ID header so clients can reference it in support tickets
  res.setHeader("X-Request-Id", req.requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - (req.startTime ?? Date.now());
    const statusCode = res.statusCode;
    const level: LogLevel =
      statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARN" : "INFO";

    logger.log(level, `${req.method} ${req.path}`, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode,
      durationMs,
      // Don't log full body — may contain passwords, PII!
      // Log only safe metadata:
      contentLength: res.getHeader("content-length"),
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    // Warn about slow responses (> 1 second)
    if (durationMs > 1000) {
      logger.warn("Slow response detected", {
        requestId: req.requestId,
        durationMs,
        path: req.path,
      });
    }
  });

  next();
}

// ─── 3. RESPONSE FORMATTER ────────────────────────────────
// Ensures ALL responses have the same shape
// Attach to res.json overrides the default behavior

export function responseFormatter(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Override res.json to always wrap in standard format
  const originalJson = res.json.bind(res);

  res.json = function (data: unknown) {
    // If already wrapped (has `status` field), pass through
    if (data && typeof data === "object" && "status" in (data as object)) {
      return originalJson(data);
    }
    // Wrap bare data in standard format
    return originalJson({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  };

  next();
}

// ─── 4. VALIDATION MIDDLEWARES ────────────────────────────

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Transform Zod errors into user-friendly messages
      const fieldErrors = result.error.flatten().fieldErrors;
      // Filter: don't expose internal field names that hint at DB schema
      next(new ValidationError("Request validation failed", fieldErrors));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(
        new ValidationError(
          "Query parameter validation failed",
          result.error.flatten().fieldErrors,
        ),
      );
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}

// ─── 5. RATE LIMITER ──────────────────────────────────────
// In-memory store (single process). For multi-server: use Redis store.
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health",
  handler: (_req, res) => {
    res.status(429).json({
      status: "error",
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Limit: 100 per 15 minutes.",
      },
    });
  },
});

// Stricter limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many auth attempts. Try again in 15 minutes.",
    },
  },
});

// ─── 6. NOT FOUND ─────────────────────────────────────────
export function notFound(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
}

// ─── 7. GLOBAL ERROR HANDLER ──────────────────────────────
// Must be LAST middleware — 4 params signature is required!
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isDev = process.env["NODE_ENV"] === "development";

  // ── Operational errors (our custom AppError subclasses) ─
  if (err instanceof AppError) {
    logger.warn("Operational error", {
      requestId: req.requestId,
      code: err.code,
      statusCode: err.statusCode,
      message: err.message,
    });

    res.status(err.statusCode).json({
      status: "error",
      error: {
        code: err.code,
        message: err.message,
        // Only include details (field errors etc) in dev, or for validation errors
        ...(isDev || err instanceof ValidationError
          ? { details: err.details }
          : {}),
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // ── Zod errors thrown directly ──────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      status: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.flatten().fieldErrors,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // ── Unknown/Programming errors ──────────────────────────
  // Log the FULL error (with stack trace) internally
  logger.error("Unexpected error", {
    requestId: req.requestId,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  // But DON'T expose internals to the client
  res.status(500).json({
    status: "error",
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      // In dev: include the stack so you can debug quickly
      ...(isDev && err instanceof Error ? { stack: err.stack } : {}),
    },
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
}

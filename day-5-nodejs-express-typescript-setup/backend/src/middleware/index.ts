/**
 * ============================================================
 * MIDDLEWARE SUITE - Production-Grade Express Middleware
 * ============================================================
 * Exports:
 *  - requestLogger   - Log all incoming requests with timing
 *  - validateBody    - Zod schema validation for request body
 *  - errorHandler    - Global error handler (MUST be last middleware)
 *  - notFound        - 404 handler for unmatched routes
 *  - rateLimiter     - Rate limiting (no Redis for simplicity)
 */

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import rateLimit from "express-rate-limit";
import { config } from "../config/env";

// ─────────────────────────────────────────────
// CUSTOM ERROR CLASSES
// Using custom classes lets you attach metadata (statusCode, code)
// and use `instanceof` checks in the error handler.
// ─────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError"; // Important for instanceof checks
    // Fixes prototype chain for custom errors in TypeScript + Node.js
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, "NOT_FOUND", `${resource} not found`);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

// ─────────────────────────────────────────────
// 1. REQUEST LOGGER
// Logs method, path, status, and response time.
// In production, use a library like `pino` or `winston`.
// ─────────────────────────────────────────────

// Extend Express's Request type to add custom properties
// This is the CORRECT way — augmenting the global namespace
declare global {
  namespace Express {
    interface Request {
      startTime?: number; // We'll add this in the logger
      requestId?: string; // Unique ID per request (useful for tracing)
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Record start time on the request  
  req.startTime = Date.now();
  req.requestId = Math.random().toString(36).slice(2, 10); // Simple ID

  const method = req.method.padEnd(6); // "GET   " "POST  " etc.
  const path = req.path;

  // Hook into the response finish event to log AFTER response is sent
  // This gives us the actual status code and response time
  res.on("finish", () => {
    const duration = Date.now() - (req.startTime ?? Date.now());
    const status = res.statusCode;

    // Color-code by status (works in most terminals)
    const statusColor =
      status >= 500 ? "\x1b[31m" : // Red for 5xx
      status >= 400 ? "\x1b[33m" : // Yellow for 4xx
      status >= 300 ? "\x1b[36m" : // Cyan for 3xx
      "\x1b[32m";                  // Green for 2xx
    const reset = "\x1b[0m";

    console.log(
      `[${req.requestId}] ${method} ${path} ${statusColor}${status}${reset} ${duration}ms`
    );
  });

  next(); // ALWAYS call next() in middleware — otherwise request hangs!
}

// ─────────────────────────────────────────────
// 2. BODY VALIDATION WITH ZOD
// Generic middleware factory: pass a Zod schema,
// get a middleware that validates req.body against it.
// ─────────────────────────────────────────────

/**
 * Creates a validation middleware for a given Zod schema.
 * 
 * Usage:
 *   router.post("/users", validateBody(createUserSchema), createUserHandler);
 * 
 * If validation fails: returns 400 with field-level error messages.
 * If validation passes: req.body is now the PARSED & TYPED data.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // ZodError.flatten() gives { fieldErrors: { field: ["message"] }, formErrors: [] }
      const errors = result.error.flatten().fieldErrors;
      next(new ValidationError("Request body validation failed", errors));
      return;
    }

    // Replace req.body with the parsed (and possibly transformed) data
    // This ensures downstream handlers get clean, typed data
    req.body = result.data;
    next();
  };
}

// ─────────────────────────────────────────────
// 3. GLOBAL ERROR HANDLER
// Must have EXACTLY 4 parameters: (err, req, res, next)
// This signature is how Express identifies error-handling middleware.
// MUST be registered LAST: app.use(errorHandler)
// ─────────────────────────────────────────────

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction // Must include even if unused
): void {
  // ── Custom AppError ────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      error: {
        code: err.code,
        message: err.message,
        // Only include details in development — don't leak internals in production!
        ...(config.NODE_ENV === "development" && err.details ? { details: err.details } : {}),
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
    return;
  }

  // ── Zod Validation Error (if thrown directly) ─────────
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

  // ── Unknown/Unexpected Error ───────────────────────────
  // Log the full error for debugging, but don't expose it to clients
  console.error("[Unhandled Error]", err);

  res.status(500).json({
    status: "error",
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      // Never expose stack traces in production!
      ...(config.NODE_ENV === "development" && err instanceof Error
        ? { stack: err.stack }
        : {}),
    },
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
}

// ─────────────────────────────────────────────
// 4. 404 HANDLER - Register BEFORE errorHandler
// Catches requests to routes that don't exist
// ─────────────────────────────────────────────

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
}

// ─────────────────────────────────────────────
// 5. RATE LIMITER
// Protects against abuse / brute force attacks.
// For production, use Redis store for distributed systems.
// ─────────────────────────────────────────────

export const rateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,   // Disable the `X-RateLimit-*` headers (old standard)
  message: {
    status: "error",
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: `Too many requests. Limit: ${config.RATE_LIMIT_MAX_REQUESTS} per ${config.RATE_LIMIT_WINDOW_MS / 60000} minutes`,
    },
  },
  // Optional: skip rate limiting for certain IPs (e.g., health checks)
  skip: (req) => req.path === "/health",
});

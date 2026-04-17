// src/middleware/errorHandler.ts
// Centralized error handling middleware.
// In Express, error middleware MUST have 4 parameters (err, req, res, next).
// Express identifies it as error middleware by the arity (number of params).

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean; // Operational errors are expected (bad input, not found)
                            // Non-operational errors are programmer mistakes (should crash)
}

/**
 * Global error handler - catches all errors passed to next(error).
 *
 * LOGGING NOTE: In production, log errors to a service like Sentry or Datadog.
 * Never log sensitive data (passwords, tokens, PII).
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const isDev = process.env.NODE_ENV === 'development';

  // Log error for debugging (redact sensitive info in production)
  console.error({
    message: err.message,
    stack: isDev ? err.stack : undefined,
    path: req.path,
    method: req.method,
    statusCode,
  });

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
    message: statusCode >= 500 && !isDev
      ? 'An unexpected error occurred'  // Don't leak internal details in production
      : err.message,
    // Only include stack trace in development
    ...(isDev && { stack: err.stack }),
  });
}

/**
 * 404 handler - for routes that don't match.
 * Must be registered AFTER all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
}

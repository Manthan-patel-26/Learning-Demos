// src/middleware/index.ts
// Core API middleware: request IDs, versioning, deprecation notices.

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { DeprecationInfo } from '../types/index.js';

// ── Request ID ────────────────────────────────────────────────────────────
// Every request gets a unique ID for distributed tracing.
// The same ID appears in response headers AND the error body, so
// clients can reference it when reporting issues to your support team.
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  // Attach to request so route handlers can use it
  (req as Request & { requestId: string }).requestId = id;
  // Send back in header so clients can include it in bug reports
  res.setHeader('X-Request-Id', id);
  next();
}

// ── API Versioning ────────────────────────────────────────────────────────
// We use URL versioning: /api/v1/products, /api/v2/products
//
// VERSIONING STRATEGIES comparison:
//
// 1. URL versioning (/v1/products) ← WE USE THIS
//    + Explicit, cacheable, easy to test in browser
//    - "Impure" REST (version isn't a resource property)
//
// 2. Header versioning (API-Version: 2)
//    + Clean URLs
//    - Harder to test, not cached by default, surprises developers
//
// 3. Accept header (Accept: application/vnd.api+json;version=2)
//    + Truly RESTful content negotiation
//    - Very verbose, rarely seen outside large enterprises
//
// URL versioning wins for developer experience.

export function apiVersion(req: Request, res: Response, next: NextFunction): void {
  // Extract version from URL: /api/v1/... → "v1"
  const match = req.path.match(/^\/v(\d+)\//);
  const version = match ? `v${match[1]}` : 'v1';

  (req as Request & { apiVersion: string }).apiVersion = version;
  // Tell clients which version served their request
  res.setHeader('X-API-Version', version);
  next();
}

// ── Deprecation Middleware ────────────────────────────────────────────────
// Wraps a route to add deprecation headers and body warnings.
//
// RFC 8594 defines the Sunset header — the exact date an API will be removed.
// Good clients (SDKs, internal services) can watch for this header and
// alert developers to upgrade before the deadline.
//
// Headers we set:
//   Deprecation: true
//   Sunset: Sat, 01 Jan 2026 00:00:00 GMT   (RFC 7231 date format)
//   Link: <https://api.example.com/v2/products>; rel="successor-version"
export function deprecated(info: DeprecationInfo) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set standard deprecation headers
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(info.sunsetAt).toUTCString());

    if (info.successor) {
      // RFC 8288 Link header pointing to the replacement
      res.setHeader('Link', `<${info.successor}>; rel="successor-version"`);
    }

    // Also inject a warning into the response body via a hook
    // We intercept res.json to add the deprecation notice
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
        (body as Record<string, unknown>)._deprecation = {
          warning: info.message,
          deprecatedAt: info.deprecatedAt,
          sunsetAt: info.sunsetAt,
          successor: info.successor,
        };
      }
      return originalJson(body);
    };

    next();
  };
}

// ── Rate limit headers ────────────────────────────────────────────────────
// Communicates rate limit status to clients so they can self-throttle.
// Standard headers: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
// (express-rate-limit handles these with standardHeaders: true)

// ── Request logger ────────────────────────────────────────────────────────
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    // In production: send to structured logging service (DataDog, CloudWatch)
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      requestId: (req as Request & { requestId?: string }).requestId,
    });
  });
  next();
}

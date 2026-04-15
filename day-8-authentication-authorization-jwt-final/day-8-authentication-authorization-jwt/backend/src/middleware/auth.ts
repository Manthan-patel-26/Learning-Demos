/**
 * ============================================================
 * AUTHENTICATION & AUTHORIZATION MIDDLEWARE
 * ============================================================
 * authenticate: Verify JWT access token, attach user to req
 * authorize:    Check if authenticated user has required role
 */

import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, JwtPayload, UserRole } from "../services/auth";

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload; // Set by authenticate() middleware
    }
  }
}

/**
 * authenticate middleware
 * Reads the Bearer token from Authorization header, verifies it,
 * and attaches the decoded payload to req.user.
 *
 * Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers["authorization"];

  // Check header exists and follows "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      status: "error",
      error: {
        code: "MISSING_TOKEN",
        message: "Authorization header required (Bearer <token>)",
      },
    });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix (7 chars)

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // Attach to request — available in all subsequent handlers
    next();
  } catch (err) {
    // jwt.verify throws different errors — give helpful messages
    const isExpired = err instanceof Error && err.name === "TokenExpiredError";
    res.status(401).json({
      status: "error",
      error: {
        code: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
        message: isExpired
          ? "Access token expired. Use /api/auth/refresh to get a new one."
          : "Invalid access token",
      },
    });
  }
}

/**
 * authorize(...roles) — Role-Based Access Control (RBAC)
 * Use AFTER authenticate. Checks req.user.role.
 *
 * Usage:
 *   router.delete("/users/:id", authenticate, authorize("admin"), deleteUser);
 *   router.get("/dashboard", authenticate, authorize("admin", "user"), getDashboard);
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Should not happen if authenticate ran first, but defensive check
      res
        .status(401)
        .json({
          status: "error",
          error: { code: "UNAUTHENTICATED", message: "Not authenticated" },
        });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: "error",
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Optional auth — doesn't fail if no token, but attaches user if present.
 * Use for routes that work for both logged-in and anonymous users.
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = verifyAccessToken(authHeader.slice(7));
    } catch {
      // Ignore invalid/expired token — treat as unauthenticated
    }
  }
  next();
}

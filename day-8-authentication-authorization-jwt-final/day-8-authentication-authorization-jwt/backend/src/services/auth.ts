/**
 * ============================================================
 * AUTHENTICATION SERVICE
 * ============================================================
 * Handles: password hashing, JWT creation, token rotation
 *
 * SECURITY CONCEPTS COVERED:
 *  1. Password hashing with bcrypt (never store plain text!)
 *  2. Access tokens (short-lived) + Refresh tokens (long-lived)
 *  3. Refresh token rotation (old token invalidated on each use)
 *  4. Storing refresh tokens in httpOnly cookies (XSS prevention)
 *  5. Role-based access control (RBAC) via JWT claims
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// ─── CONFIG ───────────────────────────────────────────────
// Crash at startup if secrets are missing — better than silent failure
const JWT_ACCESS_SECRET = process.env["JWT_ACCESS_SECRET"];
const JWT_REFRESH_SECRET = process.env["JWT_REFRESH_SECRET"];

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  console.error(
    "❌ JWT secrets not set in .env! Run: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
  );
  process.exit(1);
}

const ACCESS_TOKEN_EXPIRES = process.env["JWT_ACCESS_EXPIRES_IN"] ?? "15m";
const REFRESH_TOKEN_EXPIRES = process.env["JWT_REFRESH_EXPIRES_IN"] ?? "7d";

// ─── TYPES ────────────────────────────────────────────────

export type UserRole = "admin" | "user" | "guest";

// What we store in the JWT payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  // iat (issued at) and exp (expiry) are added automatically by jwt.sign()
}

// In-memory user store (replace with DB in production)
export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string; // NEVER store plain text passwords
  name: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
}

// ─── IN-MEMORY STORES (use DB + Redis in production) ──────
// In production: refresh tokens go in the DB or Redis
// They need to be invalidated on logout / rotation

export const users: StoredUser[] = [];
// Map of refreshToken → userId (for rotation/invalidation)
export const refreshTokenStore = new Map<string, string>();

// ─────────────────────────────────────────────
// 1. PASSWORD HASHING
//    bcrypt is the gold standard for password hashing.
//    It's intentionally slow (10-12 rounds = ~100ms) to
//    resist brute-force attacks.
//
//    NEVER use: MD5, SHA1, SHA256 for passwords — too fast!
//    ALWAYS use: bcrypt, argon2, or scrypt
// ─────────────────────────────────────────────

/**
 * Hash a plain text password with bcrypt.
 * saltRounds: 12 is recommended for production in 2024
 * (higher = slower = more brute-force resistant)
 */
export async function hashPassword(plain: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(plain, saltRounds);
}

/**
 * Compare a plain text password against a bcrypt hash.
 * Uses constant-time comparison internally to prevent timing attacks.
 *
 * TIMING ATTACK: Without constant-time comparison, an attacker can
 * measure how long the comparison takes to deduce parts of the hash.
 * bcrypt.compare() always takes the same time — safe.
 */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─────────────────────────────────────────────
// 2. JWT TOKEN GENERATION
//    Access tokens: short-lived (15min), sent in Authorization header
//    Refresh tokens: long-lived (7d), stored in httpOnly cookie
// ─────────────────────────────────────────────

/**
 * Generate a short-lived access token (15 minutes).
 * Used to authenticate API requests.
 * Stored in memory (variable), NOT in localStorage (XSS risk).
 */
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
    issuer: "myapp", // Optional: identify your app
    audience: "myapp-users",
  } as jwt.SignOptions);
}

/**
 * Generate a long-lived refresh token (7 days).
 * Used ONLY to get new access tokens.
 * Stored in httpOnly cookie — JS cannot access it (XSS protection!).
 */
export function generateRefreshToken(userId: string): string {
  const token = jwt.sign({ userId }, JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
  } as jwt.SignOptions);

  // Store in our "database" so we can invalidate it on logout
  refreshTokenStore.set(token, userId);
  return token;
}

/**
 * Verify and decode an access token.
 * Returns the payload if valid, throws if expired/invalid.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_ACCESS_SECRET!, {
    issuer: "myapp",
    audience: "myapp-users",
  }) as JwtPayload;
}

/**
 * Rotate refresh token — invalidate the old one, issue a new one.
 * ROTATION: Each refresh token can only be used ONCE.
 * If a stolen token is used, the legitimate user's next refresh will fail,
 * alerting you to the breach.
 */
export function rotateRefreshToken(oldToken: string): {
  userId: string;
  newRefreshToken: string;
} | null {
  // Check if this token is in our store (hasn't been used/invalidated)
  const userId = refreshTokenStore.get(oldToken);
  if (!userId) return null; // Token was already used or doesn't exist

  // INVALIDATE the old token immediately (rotation)
  refreshTokenStore.delete(oldToken);

  // Verify the JWT signature (checks expiry, signature)
  try {
    jwt.verify(oldToken, JWT_REFRESH_SECRET!);
  } catch {
    return null; // Expired or tampered
  }

  // Issue a fresh refresh token
  const newRefreshToken = generateRefreshToken(userId);
  return { userId, newRefreshToken };
}

/**
 * Invalidate ALL refresh tokens for a user (logout from all devices).
 */
export function invalidateAllUserTokens(userId: string): void {
  for (const [token, uid] of refreshTokenStore.entries()) {
    if (uid === userId) {
      refreshTokenStore.delete(token);
    }
  }
}

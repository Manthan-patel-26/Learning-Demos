/**
 * ============================================================
 * ENVIRONMENT VARIABLE VALIDATION
 * ============================================================
 * Problem: process.env gives you `string | undefined` for everything.
 * If a required var is missing, your app crashes in production
 * with a cryptic error deep in your code.
 *
 * Solution: Validate ALL env vars at startup using Zod.
 * If validation fails, crash EARLY with a clear error message.
 * 
 * This file is your "env contract" — it documents exactly what
 * environment variables your app needs.
 */

import { z } from "zod";
import dotenv from "dotenv";

// Load .env file into process.env FIRST
dotenv.config();

// ─── DEFINE THE SCHEMA ────────────────────────────────────
// z.coerce.number() converts "3001" (string) to 3001 (number)
// .default() provides a fallback if the var is not set
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().min(1).max(65535).default(3001),

  // For ALLOWED_ORIGINS, we accept a comma-separated string
  // and transform it into an array
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((val) => val.split(",").map((s) => s.trim())),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("debug"),
});

// ─── VALIDATE ON STARTUP ──────────────────────────────────
// safeParse returns { success: true, data } or { success: false, error }
const result = envSchema.safeParse(process.env);

if (!result.success) {
  // Crash EARLY with a clear message showing WHICH vars are wrong
  console.error("❌ Invalid environment variables:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1); // Exit with error code
}

// ─── EXPORT TYPED CONFIG ──────────────────────────────────
// Now `config` is fully typed — TypeScript knows PORT is a number,
// ALLOWED_ORIGINS is string[], NODE_ENV is one of 3 values, etc.
export const config = result.data;

// Convenience exports
export const isDev = config.NODE_ENV === "development";
export const isProd = config.NODE_ENV === "production";

// TypeScript infers the type automatically from the schema
export type Config = typeof config;

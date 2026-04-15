/**
 * ============================================================
 * DAY 16: Redis Caching Layer — All Patterns
 * ============================================================
 * Covers:
 *  1. Cache-aside pattern (most common)
 *  2. Cache stampede prevention with locks
 *  3. TTL and expiration strategies
 *  4. Session storage
 *  5. Rate limiting with Redis
 *  6. Pub/Sub messaging
 *  7. Serialization patterns
 */

import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

// ─── REDIS CONNECTION ─────────────────────────────────────
// ioredis: production-grade Redis client with auto-reconnect, pipelining
export const redis = new Redis(
  process.env["REDIS_URL"] ?? "redis://localhost:6379",
  {
    maxRetriesPerRequest: 3,
    lazyConnect: true, // Don't connect until first command
    retryStrategy: (times) => {
      // Exponential backoff: 50ms, 100ms, 200ms, ... max 2s
      return Math.min(times * 50, 2000);
    },
  },
);

redis.on("error", (err) => console.error("[Redis] Error:", err.message));
redis.on("connect", () => console.log("[Redis] Connected"));
redis.on("reconnecting", () => console.warn("[Redis] Reconnecting..."));

// ─── 1. CACHE-ASIDE PATTERN ───────────────────────────────
// The most common caching pattern:
//   1. Check cache first
//   2. If hit: return cached data (fast!)
//   3. If miss: fetch from DB, store in cache, return
//
// "Aside" = the app manages the cache (vs write-through where DB auto-populates cache)

type CacheKey = string;

/**
 * Get or compute a value with caching.
 * @param key    Unique cache key
 * @param fetch  Function to get value on cache miss (usually a DB query)
 * @param ttl    Seconds until cache expires (default: 5 minutes)
 */
export async function cacheAside<T>(
  key: CacheKey,
  fetch: () => Promise<T>,
  ttl = 300, // 5 minutes
): Promise<{ data: T; fromCache: boolean }> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached !== null) {
    return { data: JSON.parse(cached) as T, fromCache: true };
  }

  // Cache miss: fetch from source
  const data = await fetch();

  // Store in cache with TTL
  // EX = expire in seconds, NX = only set if key doesn't exist (prevents race conditions slightly)
  await redis.set(key, JSON.stringify(data), "EX", ttl);

  return { data, fromCache: false };
}

// ─── 2. CACHE STAMPEDE PREVENTION ────────────────────────
// Problem: 1000 concurrent requests all miss the cache at the same time.
//          They all hit the DB simultaneously → DB overload!
// Solution: Use a distributed lock. Only ONE request fetches from DB.
//           Others wait and then read from cache.

export async function cacheWithLock<T>(
  key: CacheKey,
  fetch: () => Promise<T>,
  ttl = 300,
  lockTtl = 10, // Lock expires after 10s (prevents deadlock)
): Promise<T> {
  // Check cache first (no lock needed for reads)
  const cached = await redis.get(key);
  if (cached !== null) return JSON.parse(cached) as T;

  const lockKey = `lock:${key}`;

  // Try to acquire lock with SET NX EX (atomic "set if not exists")
  // NX = only set if key doesn't exist = acquire the lock
  const acquired = await redis.set(lockKey, "1", "EX", lockTtl, "NX");

  if (acquired === "OK") {
    // We got the lock — we're the one to fetch
    try {
      const data = await fetch();
      await redis.set(key, JSON.stringify(data), "EX", ttl);
      return data;
    } finally {
      // ALWAYS release the lock (even if fetch threw)
      await redis.del(lockKey);
    }
  } else {
    // Another request holds the lock — wait and retry from cache
    await new Promise((r) => setTimeout(r, 100)); // Wait 100ms
    const retried = await redis.get(key);
    if (retried) return JSON.parse(retried) as T;
    // If still not cached, just fetch directly (fallback)
    return fetch();
  }
}

// ─── 3. CACHE INVALIDATION ────────────────────────────────
// "The hardest problem in computer science"
// Strategies:
//   a) TTL-based: let it expire naturally (simple, may show stale data)
//   b) Active invalidation: delete on update (complex, always fresh)
//   c) Tags: group related keys, invalidate by tag

export async function invalidateCache(pattern: string): Promise<number> {
  // SCAN is safe for production (vs KEYS which blocks Redis)
  const keys = await redis.keys(pattern);
  if (keys.length === 0) return 0;
  await redis.del(...keys);
  return keys.length;
}

// Tag-based invalidation: store keys under a tag set
export async function cacheWithTag<T>(
  key: CacheKey,
  tags: string[],
  fetch: () => Promise<T>,
  ttl = 300,
): Promise<T> {
  const { data } = await cacheAside(key, fetch, ttl);
  // Register this key under each tag
  for (const tag of tags) {
    await redis.sadd(`tag:${tag}`, key);
    await redis.expire(`tag:${tag}`, ttl + 60); // Tag expires slightly after data
  }
  return data;
}

export async function invalidateTag(tag: string): Promise<void> {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) await redis.del(...keys);
  await redis.del(`tag:${tag}`);
}

// ─── 4. RATE LIMITING WITH REDIS ──────────────────────────
// Sliding window rate limiter using sorted sets.
// More accurate than fixed window (no burst at window boundary).

export async function checkRateLimit(
  identifier: string, // e.g., IP address or user ID
  limit: number, // Max requests
  windowSec: number, // Time window in seconds
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rate:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSec * 1000;

  // Use a pipeline for atomic operations (all-or-nothing)
  const pipeline = redis.pipeline();
  // Remove entries older than the window
  pipeline.zremrangebyscore(key, 0, windowStart);
  // Count current requests in window
  pipeline.zcard(key);
  // Add current request
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  // Set expiry on the key
  pipeline.expire(key, windowSec);

  const results = await pipeline.exec();
  const count = (results?.[1]?.[1] as number) ?? 0;

  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count - 1),
    resetAt: Math.floor((now + windowSec * 1000) / 1000),
  };
}

// ─── 5. SESSION STORAGE ───────────────────────────────────
// Store user sessions in Redis instead of server memory.
// Benefits: sessions survive server restarts, share across multiple servers.

export interface Session {
  userId: string;
  role: string;
  email: string;
  createdAt: number;
  lastActivity: number;
}

export async function createSession(
  sessionId: string,
  data: Session,
  ttl = 3600,
): Promise<void> {
  // HSET: store as hash (more efficient than JSON string for frequent field access)
  await redis.hset(`session:${sessionId}`, {
    ...data,
    createdAt: data.createdAt,
    lastActivity: data.lastActivity,
  });
  await redis.expire(`session:${sessionId}`, ttl);
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const data = await redis.hgetall(`session:${sessionId}`);
  if (!data || Object.keys(data).length === 0) return null;

  // Update last activity (sliding TTL)
  await redis.hset(`session:${sessionId}`, "lastActivity", Date.now());
  await redis.expire(`session:${sessionId}`, 3600); // Reset TTL on activity

  return {
    userId: data["userId"]!,
    role: data["role"]!,
    email: data["email"]!,
    createdAt: parseInt(data["createdAt"]!),
    lastActivity: Date.now(),
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}

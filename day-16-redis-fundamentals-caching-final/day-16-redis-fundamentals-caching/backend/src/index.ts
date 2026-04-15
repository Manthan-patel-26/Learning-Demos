/**
 * DAY 16: Redis Caching Layer - Express Server
 * Each route demonstrates a different Redis pattern.
 */
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { redis, cacheAside, cacheWithLock, invalidateCache,
         invalidateTag, cacheWithTag, checkRateLimit,
         createSession, getSession, deleteSession } from "./cache";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Simulate "database" (slow, expensive)
const products = Array.from({ length: 100 }, (_, i) => ({
  id: String(i + 1), name: `Product ${i + 1}`, price: parseFloat((10 + i * 2.5).toFixed(2)),
  category: ["books","electronics","clothing"][i % 3], stock: 10 + i,
}));

async function slowDbQuery(id?: string) {
  // Simulate 500ms DB query
  await new Promise(r => setTimeout(r, 500));
  return id ? products.find(p => p.id === id) ?? null : products;
}

// ─── HEALTH ───────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await redis.ping();
    res.json({ status: "ok", redis: "connected" });
  } catch {
    res.status(503).json({ status: "error", redis: "disconnected — run: docker run -d -p 6379:6379 redis:alpine" });
  }
});

// ─── 1. CACHE-ASIDE: Product List ─────────────────────────
app.get("/api/products", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const start = Date.now();
    const { data, fromCache } = await cacheAside(
      "products:all",
      () => slowDbQuery() as Promise<typeof products>,
      60 // Cache for 60 seconds
    );
    res.json({
      status: "success", data, fromCache,
      durationMs: Date.now() - start,
      hint: fromCache ? "Served from Redis (fast!)" : "Fetched from DB (slow), now cached"
    });
  } catch (err) { next(err); }
});

// ─── 2. CACHE WITH TAG: Single Product ────────────────────
app.get("/api/products/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const start = Date.now();
    const data = await cacheWithTag(
      `product:${id}`,
      ["products", `category:${products.find(p => p.id === id)?.category}`],
      () => slowDbQuery(id!),
      300
    );
    res.json({ status: "success", data, durationMs: Date.now() - start });
  } catch (err) { next(err); }
});

// ─── 3. CACHE INVALIDATION ────────────────────────────────
app.patch("/api/products/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = products.find(p => p.id === id);
    if (!product) { res.status(404).json({ status: "error", error: { message: "Not found" } }); return; }
    Object.assign(product, req.body);

    // Invalidate specific product cache AND the list cache
    const deleted1 = await invalidateCache(`product:${id}`);
    const deleted2 = await invalidateCache("products:all");
    await invalidateTag("products");

    res.json({ status: "success", data: product,
      cacheInvalidated: { keys: deleted1 + deleted2, tags: ["products"] } });
  } catch (err) { next(err); }
});

// ─── 4. RATE LIMITING ─────────────────────────────────────
app.post("/api/auth/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = req.ip ?? "unknown";
    const { allowed, remaining, resetAt } = await checkRateLimit(`login:${ip}`, 5, 60);

    // Set rate limit headers (standard practice)
    res.setHeader("X-RateLimit-Limit", 5);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetAt);

    if (!allowed) {
      res.status(429).json({ status: "error", error: { code: "RATE_LIMITED",
        message: "Too many login attempts. Try again in 60 seconds." } });
      return;
    }

    res.json({ status: "success", message: "Login successful (demo)", remaining });
  } catch (err) { next(err); }
});

// ─── 5. SESSION MANAGEMENT ────────────────────────────────
app.post("/api/sessions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = crypto.randomUUID();
    await createSession(sessionId, {
      userId: req.body.userId ?? "u1",
      role: req.body.role ?? "user",
      email: req.body.email ?? "test@example.com",
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });
    res.status(201).json({ status: "success", data: { sessionId }, hint: "Session stored in Redis" });
  } catch (err) { next(err); }
});

app.get("/api/sessions/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await getSession(req.params["id"]!);
    if (!session) { res.status(404).json({ status: "error", error: { message: "Session not found or expired" } }); return; }
    res.json({ status: "success", data: session });
  } catch (err) { next(err); }
});

app.delete("/api/sessions/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteSession(req.params["id"]!);
    res.json({ status: "success", message: "Session deleted" });
  } catch (err) { next(err); }
});

// ─── 6. REDIS PLAYGROUND ──────────────────────────────────
// Direct Redis commands for learning
app.get("/api/redis/demo", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // String
    await redis.set("demo:string", "Hello Redis!", "EX", 30);
    // List
    await redis.rpush("demo:list", "item1", "item2", "item3");
    await redis.expire("demo:list", 30);
    // Hash
    await redis.hset("demo:hash", { name: "Alice", role: "admin" });
    await redis.expire("demo:hash", 30);
    // Set
    await redis.sadd("demo:set", "tag1", "tag2", "tag3");
    await redis.expire("demo:set", 30);
    // Sorted set
    await redis.zadd("demo:zset", 100, "user1", 250, "user2", 75, "user3");
    await redis.expire("demo:zset", 30);

    const [str, list, hash, set, zset] = await Promise.all([
      redis.get("demo:string"),
      redis.lrange("demo:list", 0, -1),
      redis.hgetall("demo:hash"),
      redis.smembers("demo:set"),
      redis.zrangebyscore("demo:zset", 0, "+inf", "WITHSCORES"),
    ]);

    res.json({ status: "success", data: {
      "String (simple key-value)": str,
      "List (ordered, duplicates)": list,
      "Hash (object fields)": hash,
      "Set (unique values)": set,
      "Sorted Set (ranked leaderboard)": zset,
    }});
  } catch (err) { next(err); }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.message);
  res.status(500).json({ status: "error", error: { message: err.message } });
});

app.listen(3001, () => {
  console.log("\n🔴 Day 16 Redis Server on http://localhost:3001");
  console.log("\nPrerequisite: Run Redis locally:");
  console.log("  docker run -d -p 6379:6379 redis:alpine");
  console.log("  OR: brew install redis && brew services start redis");
  console.log("\nEndpoints:");
  console.log("  GET  /api/products        (cache-aside — first call slow, subsequent fast)");
  console.log("  GET  /api/products/:id    (tag-based cache)");
  console.log("  PATCH /api/products/:id  (cache invalidation demo)");
  console.log("  POST /api/auth/login      (rate limiting — max 5/60s per IP)");
  console.log("  POST /api/sessions        (session creation)");
  console.log("  GET  /api/redis/demo      (all Redis data structures)");
});

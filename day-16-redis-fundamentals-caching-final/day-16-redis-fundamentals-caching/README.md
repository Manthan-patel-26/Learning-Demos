# Day 16: Redis Fundamentals & Caching

**Date:** March 04, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build

Redis caching layer for the e-commerce API: cache-aside pattern, tag-based invalidation, cache stampede prevention, session storage, and sliding window rate limiting.

## 🚀 Prerequisites

```bash
# Run Redis locally (Docker is easiest)
docker run -d -p 6379:6379 --name redis redis:alpine

# Or Mac: brew install redis && brew services start redis
# Or WSL: sudo apt install redis-server && sudo service redis start

# Test connection
redis-cli ping  # Should return: PONG
```

## 🚀 How to Run

```bash
cd backend && npm install && npm run dev   # port 3001
cd frontend && npm install && npm start   # port 3000
```

## 📁 Key Files

```
backend/src/
├── cache.ts   ← All caching patterns (cacheAside, cacheWithLock, tags, sessions, rate limiting)
└── index.ts   ← Express routes demonstrating each pattern
```

## 📖 Key Concepts

### Redis Data Structures

| Structure  | Commands            | Best For                                     |
| ---------- | ------------------- | -------------------------------------------- |
| String     | GET, SET, INCR      | Simple values, counters, session tokens      |
| Hash       | HSET, HGET, HGETALL | User sessions, config objects                |
| List       | RPUSH, LRANGE       | Message queues, activity feeds               |
| Set        | SADD, SMEMBERS      | Tags, unique visitors, follower lists        |
| Sorted Set | ZADD, ZRANGE        | Leaderboards, rate limiting (sliding window) |

### Cache-Aside Pattern

```typescript
const cached = await redis.get(key);
if (cached) return JSON.parse(cached); // Cache hit ⚡

const data = await slowDbQuery(); // Cache miss 🐢
await redis.set(key, JSON.stringify(data), "EX", 300); // Store 5min
return data;
```

### Cache Stampede Prevention

```
Problem: 1000 requests miss cache simultaneously → 1000 DB queries → DB crash

Solution: Distributed lock with SET NX EX
 - First request: acquires lock, fetches DB, populates cache, releases lock
 - Other requests: see lock exists, wait 100ms, read from cache
```

### Cache Invalidation Strategies

```typescript
// 1. TTL (simple — may show stale data for up to TTL seconds)
await redis.set(key, data, "EX", 300);

// 2. Active invalidation (complex — always fresh)
await redis.del(`product:${id}`); // On update
await redis.del("products:all"); // List cache too

// 3. Tag-based (most flexible)
await redis.sadd("tag:products", key); // Register key under tag
await redis.del(...(await redis.smembers("tag:products"))); // Invalidate all
```

## ⚠️ Gotchas

| Problem                | Detail                                                                            |
| ---------------------- | --------------------------------------------------------------------------------- |
| `KEYS *` in production | Blocks Redis while scanning! Use `SCAN` instead                                   |
| Serialization          | `JSON.stringify(undefined)` = error; `JSON.stringify(Date)` = string (loses type) |
| Connection pool        | Create ONE Redis instance and reuse it — don't create per-request                 |
| Memory limits          | Set `maxmemory` and `maxmemory-policy` or Redis fills all RAM                     |

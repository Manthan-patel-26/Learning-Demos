/**
 * DAY 16: Redis Caching — Interactive API Playground
 * Demonstrates cache hits/misses, TTL, rate limiting, sessions.
 */
import React, { useState } from "react";

const BASE = "http://localhost:3001";

interface ApiResult {
  status: number;
  data: unknown;
}

async function call(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult> {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  return { status: res.status, data };
}

export default function App() {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  async function run(fn: () => Promise<ApiResult>) {
    setLoading(true);
    try {
      setResult(await fn());
    } catch (e) {
      setResult({
        status: 0,
        data: {
          error:
            "Backend not running or Redis not connected. Start: docker run -d -p 6379:6379 redis:alpine && cd backend && npm run dev",
        },
      });
    } finally {
      setLoading(false);
    }
  }

  function btn(color = "#4299e1"): React.CSSProperties {
    return {
      padding: "6px 14px",
      borderRadius: 6,
      border: "none",
      background: color,
      color: "#fff",
      cursor: "pointer",
      fontSize: 13,
      margin: "0 4px 4px 0",
    };
  }

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 10,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: 12,
  };

  const statusColor = !result
    ? "#718096"
    : result.status >= 500
      ? "#e53e3e"
      : result.status >= 400
        ? "#dd6b20"
        : "#38a169";

  return (
    <div
      style={{
        fontFamily: "system-ui",
        background: "#f7fafc",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>🔴 Day 16: Redis Caching Layer</h1>
        <div
          style={{
            background: "#fff5f5",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            fontSize: 13,
            color: "#c53030",
          }}
        >
          <strong>Prerequisite:</strong> Redis must be running:{" "}
          <code>docker run -d -p 6379:6379 redis:alpine</code>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>1. Cache-Aside Pattern</h3>
          <p style={{ fontSize: 13, color: "#718096" }}>
            First call: slow (~500ms DB query). Subsequent calls: fast (from
            Redis cache).
          </p>
          <button
            style={btn()}
            onClick={() => run(() => call("GET", "/api/products"))}
          >
            GET /api/products (cache-aside)
          </button>
          <button
            style={btn("#718096")}
            onClick={() => run(() => call("GET", "/api/products/1"))}
          >
            GET /api/products/1 (tag-cached)
          </button>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>2. Cache Invalidation</h3>
          <p style={{ fontSize: 13, color: "#718096" }}>
            Update a product → invalidates its cache + list cache → next GET is
            slow again.
          </p>
          <button
            style={btn("#ed8936")}
            onClick={() =>
              run(() =>
                call("PATCH", "/api/products/1", {
                  name: `Product Updated ${Date.now()}`,
                }),
              )
            }
          >
            PATCH /api/products/1 (invalidates cache)
          </button>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>
            3. Rate Limiting (max 5 per 60s per IP)
          </h3>
          <p style={{ fontSize: 13, color: "#718096" }}>
            Click 6 times quickly to trigger the rate limit.
          </p>
          <button
            style={btn("#e53e3e")}
            onClick={() =>
              run(() =>
                call("POST", "/api/auth/login", {
                  email: "test@test.com",
                  password: "pass",
                }),
              )
            }
          >
            POST /api/auth/login (rate limited)
          </button>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>4. Session Management</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              style={btn("#48bb78")}
              onClick={() =>
                run(async () => {
                  const r = await call("POST", "/api/sessions", {
                    userId: "u1",
                    role: "admin",
                    email: "alice@example.com",
                  });
                  if (
                    (r.data as { data?: { sessionId?: string } })?.data
                      ?.sessionId
                  ) {
                    setSessionId(
                      (r.data as { data: { sessionId: string } }).data
                        .sessionId,
                    );
                  }
                  return r;
                })
              }
            >
              Create Session
            </button>
            <button
              style={btn()}
              disabled={!sessionId}
              onClick={() =>
                run(() => call("GET", `/api/sessions/${sessionId}`))
              }
            >
              Get Session{" "}
              {sessionId ? `(${sessionId.slice(0, 8)}...)` : "(create first)"}
            </button>
            <button
              style={btn("#e53e3e")}
              disabled={!sessionId}
              onClick={() =>
                run(() => call("DELETE", `/api/sessions/${sessionId}`))
              }
            >
              Delete Session
            </button>
          </div>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>5. Redis Data Structures Demo</h3>
          <button
            style={btn("#9f7aea")}
            onClick={() => run(() => call("GET", "/api/redis/demo"))}
          >
            See all 5 Redis data types (String, List, Hash, Set, Sorted Set)
          </button>
        </div>

        <div style={{ ...card, background: "#1a202c" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ color: "#a0aec0", fontSize: 13 }}>Response</span>
            {result && (
              <span style={{ color: statusColor, fontWeight: 700 }}>
                HTTP {result.status}
              </span>
            )}
          </div>
          <pre
            style={{
              color: "#a8ff78",
              fontSize: 12,
              margin: 0,
              overflow: "auto",
              maxHeight: 300,
            }}
          >
            {loading
              ? "Loading..."
              : result
                ? JSON.stringify(result.data, null, 2)
                : "Click a button above..."}
          </pre>
        </div>

        <div style={{ ...card, background: "#fffbeb", fontSize: 12 }}>
          <strong>Key Patterns in cache.ts:</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
            <li>
              <strong>cacheAside:</strong> Check Redis → miss → fetch DB → store
              in Redis → return
            </li>
            <li>
              <strong>cacheWithLock:</strong> SET NX EX prevents cache stampede
              (1 fetches, others wait)
            </li>
            <li>
              <strong>invalidateCache:</strong> SCAN + DEL removes keys matching
              a pattern
            </li>
            <li>
              <strong>cacheWithTag:</strong> SADD groups keys by tag →
              invalidateTag removes all at once
            </li>
            <li>
              <strong>checkRateLimit:</strong> Sliding window with ZSET (sorted
              set by timestamp)
            </li>
            <li>
              <strong>createSession:</strong> HSET stores session fields, EXPIRE
              sets TTL
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

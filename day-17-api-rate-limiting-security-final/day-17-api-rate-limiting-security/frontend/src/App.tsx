import React, { useState } from "react";

const BASE = "http://localhost:3001";
interface ApiResult { status: number; data: unknown; headers?: Record<string,string> }

async function call(method: string, path: string, body?: unknown): Promise<ApiResult> {
  const res = await fetch(BASE + path, {
    method, headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  return { status: res.status, data };
}

export default function App() {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [xssInput, setXssInput] = useState("<script>alert('xss')</script>");
  const [sqlInput, setSqlInput] = useState("'; DROP TABLE users; --");

  async function run(fn: () => Promise<ApiResult>) {
    setLoading(true);
    try { setResult(await fn()); }
    catch { setResult({ status: 0, data: { error: "Backend not running. Run: cd backend && npm run dev" } }); }
    finally { setLoading(false); }
  }

  function btn(color = "#4299e1"): React.CSSProperties {
    return { padding: "6px 14px", borderRadius: 6, border: "none", background: color,
      color: "#fff", cursor: "pointer", fontSize: 13, margin: "0 4px 4px 0" };
  }
  const card: React.CSSProperties = { background: "#fff", borderRadius: 10, padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 12 };

  return (
    <div style={{ fontFamily: "system-ui", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>🛡️ Day 17: API Security Suite</h1>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Security Headers (via Helmet)</h3>
          <p style={{ fontSize: 13, color: "#718096" }}>Click and check DevTools → Network → Response Headers</p>
          <button style={btn()} onClick={() => run(() => call("GET", "/health"))}>GET /health (check response headers!)</button>
          <button style={btn()} onClick={() => run(() => call("GET", "/api/security-headers"))}>View header list</button>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Rate Limiting — Auth Endpoint (max 10/15min)</h3>
          <p style={{ fontSize: 13, color: "#718096" }}>Click rapidly 11+ times to trigger the 429 rate limit</p>
          {[1,2,3,4,5].map(i => (
            <button key={i} style={btn("#dd6b20")} onClick={() => run(() => call("POST", "/api/auth/login", { email: "a@b.com", password: "x" }))}>
              Login attempt {i}
            </button>
          ))}
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>XSS Input Sanitization</h3>
          <input value={xssInput} onChange={e => setXssInput(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e0",
              fontSize: 13, boxSizing: "border-box", marginBottom: 8, fontFamily: "monospace" }} />
          <button style={btn("#e53e3e")} onClick={() => run(() => call("POST", "/api/comments", { text: xssInput }))}>
            POST comment (watch it get sanitized)
          </button>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>SQL Injection Demo</h3>
          <input value={sqlInput} onChange={e => setSqlInput(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e0",
              fontSize: 13, boxSizing: "border-box", marginBottom: 8, fontFamily: "monospace" }} />
          <button style={btn("#9f7aea")} onClick={() => run(() => call("GET", `/api/sql-injection-demo?search=${encodeURIComponent(sqlInput)}`))}>
            See vulnerable vs safe query
          </button>
        </div>

        <div style={{ background: "#1a202c", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#a0aec0", fontSize: 13 }}>Response</span>
            {result && <span style={{ fontWeight: 700, color: result.status >= 400 ? "#fc8181" : "#68d391" }}>HTTP {result.status}</span>}
          </div>
          <pre style={{ color: "#a8ff78", fontSize: 12, margin: 0, overflow: "auto", maxHeight: 300 }}>
            {loading ? "Loading..." : result ? JSON.stringify(result.data, null, 2) : "Click a button above..."}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * DAY 9: API Validation & Error Handling - Interactive Playground
 */
import React, { useState } from "react";

const BASE = "http://localhost:3001";

interface ApiResult { status: number; data: unknown }

async function makeRequest(method: string, path: string, body?: unknown): Promise<ApiResult> {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json();
  return { status: res.status, data };
}

export default function App() {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [productName, setProductName] = useState("Node.js Guide");
  const [productPrice, setProductPrice] = useState("24.99");
  const [productCategory, setProductCategory] = useState("books");

  async function run(fn: () => Promise<ApiResult>) {
    setLoading(true);
    try { setResult(await fn()); }
    catch (e) { setResult({ status: 0, data: { error: e instanceof Error ? e.message : "Network error — is backend running?" } }); }
    finally { setLoading(false); }
  }

  const card: React.CSSProperties = { background: "#fff", borderRadius: 10, padding: 16, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" };

  function btnStyle(color = "#4299e1"): React.CSSProperties {
    return { padding: "6px 14px", borderRadius: 6, border: "none", background: color, color: "#fff", cursor: "pointer", fontSize: 13, margin: "0 4px 4px 0" };
  }

  const statusColor = !result ? "#718096" : result.status >= 500 ? "#e53e3e" : result.status >= 400 ? "#dd6b20" : "#38a169";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>🛡️ Day 9: API Validation & Error Handling</h1>
        <p style={{ color: "#718096" }}>Interactive playground — click buttons to test validation and error handling.</p>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>✅ Valid Requests</h3>
          <button style={btnStyle()} onClick={() => run(() => makeRequest("GET", "/health"))}>GET /health</button>
          <button style={btnStyle()} onClick={() => run(() => makeRequest("GET", "/api/products"))}>GET /api/products</button>
          <button style={btnStyle()} onClick={() => run(() => makeRequest("GET", "/api/products?page=1&limit=2&category=books"))}>GET with valid query params</button>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>📝 Create Product</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <input value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="Name" style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e0" }} />
            <input value={productPrice} onChange={e => setProductPrice(e.target.value)}
              placeholder="Price" style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e0", width: 80 }} />
            <select value={productCategory} onChange={e => setProductCategory(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e0" }}>
              <option value="books">Books</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
            </select>
            <button style={btnStyle("#48bb78")} onClick={() => run(() => makeRequest("POST", "/api/products",
              { name: productName, price: parseFloat(productPrice), category: productCategory }))}>
              POST valid product
            </button>
          </div>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>❌ Validation Errors (400)</h3>
          <button style={btnStyle("#dd6b20")} onClick={() => run(() => makeRequest("POST", "/api/products", {}))}>Empty body</button>
          <button style={btnStyle("#dd6b20")} onClick={() => run(() => makeRequest("POST", "/api/products", { name: "A", price: -5, category: "food" }))}>Short name + negative price + bad category</button>
          <button style={btnStyle("#dd6b20")} onClick={() => run(() => makeRequest("GET", "/api/products?page=abc&limit=999"))}>Invalid query params</button>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>🔴 Error Types</h3>
          <button style={btnStyle("#e53e3e")} onClick={() => run(() => makeRequest("GET", "/api/demo/errors/not-found"))}>404 NotFound</button>
          <button style={btnStyle("#e53e3e")} onClick={() => run(() => makeRequest("GET", "/api/demo/errors/conflict"))}>409 Conflict</button>
          <button style={btnStyle("#e53e3e")} onClick={() => run(() => makeRequest("GET", "/api/demo/errors/unexpected"))}>500 Unexpected Error</button>
          <button style={btnStyle("#e53e3e")} onClick={() => run(() => makeRequest("GET", "/this/route/does/not/exist"))}>404 Route Not Found</button>
        </div>

        <div style={{ ...card, background: "#1a202c" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#a0aec0", fontSize: 13 }}>Response</span>
            {result && <span style={{ color: statusColor, fontWeight: 700 }}>HTTP {result.status}</span>}
          </div>
          <pre style={{ color: "#a8ff78", fontSize: 12, margin: 0, overflow: "auto", maxHeight: 300 }}>
            {loading ? "Loading..." : result ? JSON.stringify(result.data, null, 2) : "Click a button above..."}
          </pre>
        </div>

        <div style={{ ...card, background: "#fffbeb", fontSize: 13 }}>
          <strong>Concepts in middleware/index.ts:</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
            <li><strong>Custom Error Hierarchy:</strong> AppError → ValidationError, NotFoundError, ConflictError…</li>
            <li><strong>requestLogger:</strong> logs method, path, status, duration, requestId</li>
            <li><strong>validateBody/validateQuery:</strong> Zod schema validation with field-level errors</li>
            <li><strong>rateLimiter:</strong> 100 req/15min global, 10 req/15min for auth routes</li>
            <li><strong>errorHandler:</strong> formats all errors consistently, hides internal details in prod</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

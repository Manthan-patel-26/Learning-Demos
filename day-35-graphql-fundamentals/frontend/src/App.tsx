/**
 * DAY 35: GraphQL vs REST Comparison Dashboard
 * FIXED VERSION
 */
import React, { useState } from "react";

const BASE = "http://localhost:3001";

async function gql(query: string) {
  const r = await fetch(`${BASE}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return r.json();
}

const EXAMPLE_QUERIES = [
  {
    label: "Products with category + author",
    hint: "Shows DataLoader batching — only 3 DB queries for 5 products!",
    query: `{
  products {
    id name price rating inStock
    category { name slug }
    author { name email }
  }
  _queryCount
}`,
  },
  {
    label: "Books only (filtered)",
    hint: "Client specifies exactly what fields it needs",
    query: `{
  products(categorySlug: "books") {
    name price
    author { name }
  }
}`,
  },
  {
    label: "Users with their orders",
    hint: "Nested relationships in one request — no REST endpoints needed",
    query: `{
  users {
    id name email
    orders {
      id total status
      products { name price }
    }
  }
}`,
  },
  {
    label: "Just product names (no over-fetching!)",
    hint: "GraphQL: only fetch the fields you need",
    query: `{
  products { name }
}`,
  },
  {
    label: "Single product by ID",
    hint: "Precise data fetching",
    query: `{
  product(id: "p1") {
    name price rating
    category { name }
    author { name email }
  }
}`,
  },
  {
    label: "Create product (Mutation)",
    hint: "Mutations modify data — equivalent to POST/PUT/DELETE in REST",
    query: `mutation {
  createProduct(name: "GraphQL Book", price: 44.99, categoryId: "c1") {
    id name price
    category { name }
  }
}`,
  },
];

export default function App() {
  // CHANGED: Using 'any' here bypasses the "unknown is not a ReactNode" error
  const [gqlResult, setGqlResult] = useState<any>(null);
  const [restResult, setRestResult] = useState<any>(null);
  const [customQuery, setCustomQuery] = useState(EXAMPLE_QUERIES[0]!.query);
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState(0);

  async function runGql() {
    setLoading(true);
    try { setGqlResult(await gql(customQuery)); }
    catch { setGqlResult({ error: "Failed — is backend running?" }); }
    setLoading(false);
  }

  async function runRest() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/rest/products-with-details`);
      setRestResult(await r.json());
    } catch { setRestResult({ error: "Failed — is backend running?" }); }
    setLoading(false);
  }

  const card: React.CSSProperties = { background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 12 };

  // Safely extract query count
  const queryCount = gqlResult?.data?._queryCount;

  return (
    <div style={{ fontFamily: "system-ui", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>⚡ Day 35: GraphQL vs REST</h1>

        <div style={{ background: "#fffbeb", borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 13 }}>
          <strong>Setup:</strong> <code>cd backend && npm install && npm run dev</code> — GraphQL at <code>POST /graphql</code>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* REST Panel */}
          <div style={card}>
            <h3 style={{ marginTop: 0, color: "#e53e3e" }}>REST API</h3>
            <div style={{ fontSize: 13, color: "#718096", marginBottom: 10 }}>
              <code>GET /api/rest/products-with-details</code>
            </div>
            <div style={{ background: "#f7fafc", borderRadius: 6, padding: 10, fontSize: 12, marginBottom: 10 }}>
              ⚠️ <strong>N+1 Problem:</strong> 1 query for products + N queries per product for category + author = <strong>11+ DB queries</strong> for 5 products!
            </div>
            <button onClick={runRest} disabled={loading}
              style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#e53e3e", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              {loading ? "Loading..." : "▶ Run REST Query"}
            </button>
            {restResult && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 13, color: "#c53030", fontWeight: 700 }}>
                  DB Queries: {restResult._meta?.queryCount ?? "?"}
                </div>
                <pre style={{ background: "#1a202c", color: "#fc8181", padding: 8, borderRadius: 6, fontSize: 10, overflow: "auto", maxHeight: 200, marginTop: 6 }}>
                  {JSON.stringify(restResult, null, 2).slice(0, 1000)}
                </pre>
              </div>
            )}
          </div>

          {/* GraphQL Panel */}
          <div style={card}>
            <h3 style={{ marginTop: 0, color: "#38a169" }}>GraphQL</h3>
            <div style={{ fontSize: 13, color: "#718096", marginBottom: 10 }}>
              <code>POST /graphql</code> — client specifies exactly what it needs
            </div>
            <div style={{ background: "#f0fff4", borderRadius: 6, padding: 10, fontSize: 12, marginBottom: 10 }}>
              ✅ <strong>DataLoader Batching:</strong> All authors fetched in 1 query, all categories in 1 query = <strong>only 3 total DB queries</strong>!
            </div>
            <button onClick={() => { setCustomQuery(EXAMPLE_QUERIES[0]!.query); runGql(); }} disabled={loading}
              style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#38a169", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              {loading ? "Loading..." : "▶ Run Same Query via GraphQL"}
            </button>
            {gqlResult && (
              <div style={{ marginTop: 10 }}>
                {queryCount !== undefined && (
                  <div style={{ fontSize: 13, color: "#38a169", fontWeight: 700 }}>DB Queries: {queryCount}</div>
                )}
                <pre style={{ background: "#1a202c", color: "#a8ff78", padding: 8, borderRadius: 6, fontSize: 10, overflow: "auto", maxHeight: 200, marginTop: 6 }}>
                  {JSON.stringify(gqlResult, null, 2).slice(0, 1000)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* GraphQL Playground */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>GraphQL Query Playground</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {EXAMPLE_QUERIES.map((q, i) => (
              <button key={i} onClick={() => { setActivePreset(i); setCustomQuery(q.query); }}
                style={{
                  padding: "4px 10px", borderRadius: 20, border: "none", fontSize: 12, cursor: "pointer",
                  background: activePreset === i ? "#4299e1" : "#e2e8f0",
                  color: activePreset === i ? "#fff" : "#4a5568"
                }}>
                {q.label}
              </button>
            ))}
          </div>
          {EXAMPLE_QUERIES[activePreset] && (
            <div style={{ fontSize: 12, color: "#718096", marginBottom: 8 }}>
              💡 {EXAMPLE_QUERIES[activePreset]!.hint}
            </div>
          )}
          <textarea value={customQuery} onChange={e => setCustomQuery(e.target.value)} rows={8}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e0",
              fontFamily: "monospace", fontSize: 13, boxSizing: "border-box", resize: "vertical"
            }} />
          <button onClick={runGql} disabled={loading}
            style={{
              marginTop: 8, padding: "8px 20px", borderRadius: 6, border: "none",
              background: "#9f7aea", color: "#fff", cursor: "pointer", fontWeight: 600
            }}>
            {loading ? "Loading..." : "▶ Run GraphQL Query"}
          </button>
          {gqlResult && (
            <pre style={{ marginTop: 10, background: "#1a202c", color: "#a8ff78", padding: 12, borderRadius: 6, fontSize: 11, overflow: "auto", maxHeight: 300 }}>
              {JSON.stringify(gqlResult, null, 2)}
            </pre>
          )}
        </div>

        {/* Comparison table */}
        <div style={{ ...card, background: "#fffbeb", fontSize: 13 }}>
          <h3 style={{ marginTop: 0 }}>📊 GraphQL vs REST — When to Choose Each</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f7fafc" }}>
                <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Concern</th>
                <th style={{ padding: 8, textAlign: "center", borderBottom: "2px solid #e2e8f0", color: "#e53e3e" }}>REST</th>
                <th style={{ padding: 8, textAlign: "center", borderBottom: "2px solid #e2e8f0", color: "#38a169" }}>GraphQL</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Over-fetching", "❌ Returns all fields", "✅ Client picks fields"],
                ["Under-fetching", "❌ Multiple round trips", "✅ One request for nested data"],
                ["N+1 queries", "❌ Manual JOIN management", "✅ DataLoader auto-batches"],
                ["Caching", "✅ HTTP cache headers work", "⚠️ POST = no HTTP caching"],
                ["File uploads", "✅ multipart/form-data", "⚠️ Complex workarounds needed"],
                ["Learning curve", "✅ Simple, well-understood", "⚠️ Schema, resolvers, DataLoader"],
                ["Type safety", "⚠️ Manual typing needed", "✅ Schema = auto-generated types"],
                ["Versioning", "⚠️ /api/v1, /api/v2", "✅ Evolve schema without versions"],
                ["Best for", "Simple CRUD, public APIs", "Complex UIs, mobile apps, dashboards"],
              ].map(([concern, rest, graph], i) => (
                <tr key={concern} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                  <td style={{ padding: 8, fontWeight: 600 }}>{concern}</td>
                  <td style={{ padding: 8, textAlign: "center", fontSize: 12 }}>{rest}</td>
                  <td style={{ padding: 8, textAlign: "center", fontSize: 12 }}>{graph}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * DAY 25: Database Performance Benchmark Dashboard
 * Visualizes query timing before/after indexes in real time.
 */
import React, { useState, useEffect } from "react";

const BASE = "http://localhost:3001";

interface BenchmarkResult {
  query: string;
  durationMs: number;
  usesIndex: boolean;
  plan: string;
  rows: unknown[];
  optimization?: string;
}

interface IndexInfo { indexname: string; tablename: string; index_size: string; index_type: string; }
interface TableStat { table_name: string; row_count: number; total_size: string; }

async function run<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json() as Promise<T>;
}

// Color scale: green (fast) → yellow → red (slow)
function speedColor(ms: number): string {
  if (ms < 10) return "#38a169";
  if (ms < 50) return "#68d391";
  if (ms < 200) return "#ed8936";
  return "#e53e3e";
}

function QueryCard({ title, endpoint, params = "" }: { title: string; endpoint: string; params?: string }) {
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function benchmark() {
    setLoading(true);
    try {
      const data = await run<BenchmarkResult>(`/api/benchmark/${endpoint}${params}`);
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{title}</div>
          {result && (
            <div style={{ fontSize: 12, color: "#718096" }}>
              {result.rows.length} rows returned
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {result && (
            <>
              <div style={{
                fontSize: 20, fontWeight: 700,
                color: speedColor(result.durationMs),
              }}>
                {result.durationMs}ms
              </div>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 10,
                background: result.usesIndex ? "#c6f6d5" : "#fff5f5",
                color: result.usesIndex ? "#276749" : "#c53030",
              }}>
                {result.usesIndex ? "✅ Index" : "❌ Seq Scan"}
              </span>
            </>
          )}
          <button
            onClick={benchmark}
            disabled={loading}
            style={{
              padding: "6px 14px", borderRadius: 6, border: "none",
              background: loading ? "#a0aec0" : "#4299e1",
              color: "#fff", cursor: loading ? "wait" : "pointer", fontSize: 13,
            }}
          >
            {loading ? "Running..." : "▶ Run"}
          </button>
        </div>
      </div>

      {result?.optimization && (
        <div style={{
          marginTop: 10, padding: 8, borderRadius: 6, fontSize: 12,
          background: result.usesIndex ? "#f0fff4" : "#fff5f5",
          color: result.usesIndex ? "#276749" : "#c53030",
        }}>
          {result.optimization}
        </div>
      )}

      {result?.plan && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: "#718096" }}>
            EXPLAIN ANALYZE plan
          </summary>
          <pre style={{
            marginTop: 4, padding: 8, background: "#1a202c", color: "#a8ff78",
            borderRadius: 6, fontSize: 10, overflow: "auto", maxHeight: 200,
            whiteSpace: "pre-wrap",
          }}>
            {result.plan.substring(0, 1000)}{result.plan.length > 1000 ? "\n..." : ""}
          </pre>
        </details>
      )}
    </div>
  );
}

export default function App() {
  const [indexes, setIndexes] = useState<IndexInfo[]>([]);
  const [tableStats, setTableStats] = useState<TableStat[]>([]);
  const [dbStatus, setDbStatus] = useState<{ status: string; orders?: string; hint?: string } | null>(null);
  const [indexActionMsg, setIndexActionMsg] = useState<string | null>(null);
  const [customSql, setCustomSql] = useState(
    "SELECT COUNT(*) FROM orders WHERE status = 'pending'"
  );
  const [customResult, setCustomResult] = useState<BenchmarkResult | null>(null);

  useEffect(() => {
    loadMeta();
  }, []);

  async function loadMeta() {
    try {
      const [health, idxRes, statsRes] = await Promise.all([
        run<{ status: string; orders?: string; hint?: string }>("/health"),
        run<{ data: IndexInfo[] }>("/api/indexes/list"),
        run<{ data: TableStat[] }>("/api/stats"),
      ]);
      setDbStatus(health);
      setIndexes(idxRes.data ?? []);
      setTableStats(statsRes.data ?? []);
    } catch {
      setDbStatus({ status: "error", hint: "Backend not running or DB not set up" });
    }
  }

  async function addIndexes() {
    setIndexActionMsg("Creating indexes...");
    const res = await run<{ message: string; durationMs: number }>("/api/indexes/add", "POST");
    setIndexActionMsg(`✅ ${res.message} (took ${res.durationMs}ms)`);
    await loadMeta();
  }

  async function dropIndexes() {
    setIndexActionMsg("Dropping indexes...");
    const res = await run<{ message: string }>("/api/indexes/drop", "POST");
    setIndexActionMsg(`❌ ${res.message}`);
    await loadMeta();
  }

  async function runCustom() {
    try {
      const data = await run<BenchmarkResult>("/api/explain", "POST", { sql: customSql });
      setCustomResult(data);
    } catch (e) {
      setCustomResult(null);
    }
  }

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 10, padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 16,
  };

  return (
    <div style={{ fontFamily: "system-ui", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>📊 Day 25: Database Optimization & Indexing</h1>

        {/* DB Status */}
        <div style={{ ...card, background: dbStatus?.status === "ok" ? "#f0fff4" : "#fff5f5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{dbStatus?.status === "ok" ? "✅ Database Connected" : "❌ Database Not Ready"}</strong>
              <div style={{ fontSize: 13, color: "#718096", marginTop: 4 }}>{dbStatus?.hint}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {tableStats.map(t => (
                <div key={t.table_name} style={{ fontSize: 12, color: "#718096" }}>
                  {t.table_name}: {Number(t.row_count).toLocaleString()} rows ({t.total_size})
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Index Controls */}
        <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Indexes: {indexes.length} custom index(es) active</strong>
            <div style={{ fontSize: 12, color: "#718096" }}>
              {indexes.length === 0
                ? "No custom indexes — queries use full table scans (slow)"
                : indexes.map(i => `${i.tablename}.${i.indexname} (${i.index_type}, ${i.index_size})`).join(" | ")}
            </div>
            {indexActionMsg && (
              <div style={{ fontSize: 12, marginTop: 6, color: "#4a5568" }}>{indexActionMsg}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addIndexes} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#48bb78", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              + Add All Indexes
            </button>
            <button onClick={dropIndexes} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#fc8181", color: "#fff", cursor: "pointer" }}>
              Drop Indexes
            </button>
          </div>
        </div>

        {/* Benchmark Cards */}
        <div style={{ marginBottom: 8, color: "#718096", fontSize: 13 }}>
          🔬 Click "▶ Run" to benchmark each query. Add/drop indexes and compare the timing!
        </div>
        <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          <QueryCard title="Q1: Find Pending Orders (filter by status)" endpoint="pending-orders" />
          <QueryCard title="Q2: Orders With User Data (JOIN — solves N+1)" endpoint="orders-with-users" />
          <QueryCard title="Q3: Active Products by Category (composite index)" endpoint="products/1" />
          <QueryCard title="Q4a: Top Customers — SLOW (join then aggregate)" endpoint="top-customers/slow" />
          <QueryCard title="Q4b: Top Customers — FAST (CTE: aggregate then join)" endpoint="top-customers/fast" />
        </div>

        {/* Custom SQL Playground */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>🔬 EXPLAIN ANALYZE Playground</h3>
          <textarea
            value={customSql}
            onChange={e => setCustomSql(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e0",
              fontSize: 13, fontFamily: "monospace", boxSizing: "border-box", resize: "vertical" }}
          />
          <button onClick={runCustom} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 6, border: "none",
            background: "#9f7aea", color: "#fff", cursor: "pointer" }}>
            ▶ Run EXPLAIN ANALYZE
          </button>
          {customResult && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 14 }}>
                <span>Duration: <strong style={{ color: speedColor(customResult.durationMs) }}>{customResult.durationMs}ms</strong></span>
                <span>Plan: <strong>{customResult.usesIndex ? "✅ Index Scan" : "❌ Seq Scan"}</strong></span>
              </div>
              <pre style={{ background: "#1a202c", color: "#a8ff78", padding: 12, borderRadius: 6,
                fontSize: 11, overflow: "auto", maxHeight: 200, whiteSpace: "pre-wrap" }}>
                {customResult.plan?.substring(0, 1500)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

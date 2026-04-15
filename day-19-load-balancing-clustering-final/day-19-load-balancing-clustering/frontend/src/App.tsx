import React, { useState, useEffect } from "react";
interface WorkerInfo { workerId: number; pid: number; requests: number; memoryMB: number; }
export default function App() {
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => { poll(); const t = setInterval(poll, 2000); return () => clearInterval(t); }, []);
  async function poll() {
    try {
      const r = await fetch("http://localhost:3001/health");
      const d = await r.json();
      setWorkers(prev => {
        const existing = prev.find(w => w.pid === d.pid);
        if (existing) { existing.requests = d.requests; existing.memoryMB = d.memoryMB; return [...prev]; }
        return [...prev, { workerId: prev.length + 1, pid: d.pid, requests: d.requests, memoryMB: d.memoryMB }].slice(-8);
      });
    } catch { /* backend not running */ }
  }
  async function sendRequests(n: number) {
    setLoading(true);
    await Promise.all(Array.from({ length: n }, () => fetch("http://localhost:3001/api/work")));
    setLoading(false);
    poll();
  }
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>🔀 Day 19: Load Balancing & Clustering</h1>
      <p style={{ color: "#718096" }}>Run <code>npm run cluster</code> in backend. Each request may be handled by a different worker.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[1, 10, 50].map(n => (
          <button key={n} onClick={() => sendRequests(n)} disabled={loading}
            style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#4299e1", color: "#fff", cursor: "pointer" }}>
            Send {n} request{n > 1 ? "s" : ""}
          </button>
        ))}
      </div>
      {workers.length === 0 ? (
        <p style={{ color: "#a0aec0" }}>No workers seen yet. Start the backend with <code>npm run cluster</code> and click a button.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {workers.map(w => (
            <div key={w.pid} style={{ background: "#fff", borderRadius: 8, padding: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", justifyContent: "space-between" }}>
              <div><strong>Worker #{w.workerId}</strong> (PID: {w.pid})</div>
              <div style={{ fontSize: 13, color: "#718096" }}>{w.requests} requests · {w.memoryMB}MB</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 20, background: "#fffbeb", borderRadius: 8, padding: 16, fontSize: 13 }}>
        <strong>Key observation:</strong> Each request is handled by a different PID. The OS distributes connections across workers.
        Workers do NOT share memory — each has its own <code>requestCount</code>.
      </div>
    </div>
  );
}

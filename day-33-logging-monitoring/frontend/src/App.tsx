import React, { useState } from "react";
const BASE = "http://localhost:3001";
async function callApi(method: string, path: string, body?: object) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const r = await fetch(BASE + path, {
    method, headers: { "Content-Type": "application/json", "X-Correlation-ID": correlationId },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { data: await r.json(), status: r.status, correlationId };
}

export default function App() {
  const [log, setLog] = useState<{ msg: string; ok: boolean }[]>([]);
  const addLog = (msg: string, ok = true) => setLog(p => [{ msg: `[${new Date().toLocaleTimeString()}] ${msg}`, ok }, ...p.slice(0, 24)]);
  const btn = (c = "#4299e1"): React.CSSProperties => ({ padding: "7px 14px", borderRadius: 6, border: "none", background: c, color: "#fff", cursor: "pointer", fontSize: 13, margin: "0 4px 4px 0" });
  const card: React.CSSProperties = { background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 12 };

  return (
    <div style={{ fontFamily: "system-ui", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>📋 Day 33: Production Logging</h1>

        <div style={{ background: "#fffbeb", borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 13 }}>
          <strong>Tip:</strong> Watch the backend terminal — logs appear there in real time!
          Each request includes a <code>correlationId</code> that links all related log lines.
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Log Level Demos</h3>
          {["error","warn","info","debug","http"].map(level => (
            <button key={level} style={btn(level==="error"?"#e53e3e":level==="warn"?"#ed8936":level==="info"?"#48bb78":level==="debug"?"#9f7aea":"#4299e1")}
              onClick={async () => { const r = await callApi("GET", `/api/log-demo/${level}`); addLog(`${level.toUpperCase()}: correlationId=${r.correlationId}`); }}>
              Log {level}
            </button>
          ))}
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>PII Redaction Demo</h3>
          <button style={btn()} onClick={async () => {
            const r = await callApi("POST", "/api/auth/login", { email: "alice@example.com", password: "mySecretPassword123", token: "Bearer secret_jwt" });
            addLog(`Login: ${r.data.success ? "success" : "fail"} | Check backend logs — password is [REDACTED]!`);
          }}>POST login (password + token in body)</button>
          <p style={{ fontSize: 12, color: "#718096", margin: "8px 0 0" }}>Check the backend terminal — "password" and "token" fields are automatically redacted.</p>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Alert Triggers</h3>
          <button style={btn("#ed8936")} onClick={async () => {
            addLog("Calling slow endpoint (1.2s)...");
            const r = await callApi("GET", "/api/slow");
            addLog(`Slow query done: ${r.correlationId} — see "SLOW QUERY DETECTED" in backend logs`);
          }}>Slow Query (&gt;1s → warn)</button>
          <button style={btn("#e53e3e")} onClick={async () => {
            const r = await callApi("GET", "/api/break");
            addLog(`500 error: ${r.correlationId} (call 3x to trigger ALERT rule)`, false);
          }}>Trigger 500 (×3 → alert fires)</button>
          <button style={btn("#48bb78")} onClick={async () => {
            const r = await callApi("POST", "/api/orders", { userId: "u1", amount: 99.99 });
            addLog(`Order placed: ${r.data.orderId} — see "Event: ORDER_PLACED" in backend`);
          }}>Business Event (order placed)</button>
        </div>

        <div style={{ ...card, background: "#1a202c" }}>
          <div style={{ color: "#a0aec0", fontSize: 12, marginBottom: 6 }}>Activity (correlationId links browser ↔ server logs)</div>
          {log.length === 0 ? <div style={{ color: "#4a5568", fontSize: 12 }}>Click buttons to generate logs...</div>
            : log.map((l, i) => <div key={i} style={{ color: l.ok ? "#a8ff78" : "#fc8181", fontSize: 12, marginBottom: 2 }}>{l.msg}</div>)}
        </div>
      </div>
    </div>
  );
}

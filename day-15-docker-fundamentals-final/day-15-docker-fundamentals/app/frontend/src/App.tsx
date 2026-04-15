import React, { useState } from "react";
export default function App() {
  const [msg, setMsg] = useState("");
  return (
    <div style={{ fontFamily: "system-ui", padding: 40, maxWidth: 600, margin: "0 auto" }}>
      <h1>🐳 Day 15: Docker App</h1>
      <p>This app gets containerized using the Dockerfiles in the parent directory.</p>
      <button onClick={async () => {
        const r = await fetch("http://localhost:3001/api/greet?name=Docker");
        const d = await r.json();
        setMsg(d.message);
      }} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#4299e1", color: "#fff", cursor: "pointer" }}>
        Call Backend API
      </button>
      {msg && <p style={{ marginTop: 16, padding: 12, background: "#c6f6d5", borderRadius: 8 }}>✅ {msg}</p>}
      <hr style={{ margin: "24px 0" }} />
      <h3>Study the configuration files:</h3>
      <ul>
        <li><code>Dockerfile.backend</code> — Multi-stage build for Node.js</li>
        <li><code>Dockerfile.frontend</code> — Build React, serve with Nginx</li>
        <li><code>docker-compose.yml</code> — Production setup (Postgres + Redis + Backend + Frontend)</li>
        <li><code>docker-compose.dev.yml</code> — Dev with hot reload</li>
        <li><code>.dockerignore</code> — Exclude node_modules, .env from build context</li>
        <li><code>nginx.conf</code> — SPA routing, gzip, cache headers</li>
      </ul>
    </div>
  );
}

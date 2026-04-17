import React from "react";
export default function App() {
  return (
    <div style={{ fontFamily: "system-ui", padding: 40, maxWidth: 700, margin: "0 auto" }}>
      <h1>🔗 Day 22: Integration & E2E Testing</h1>
      <div style={{ background: "#c6f6d5", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <strong>The tests are in the backend folder.</strong>
        <pre style={{ margin: "8px 0 0", fontSize: 13 }}>cd backend && npm test</pre>
      </div>
      <h3>What the tests cover:</h3>
      <ul style={{ lineHeight: 2 }}>
        <li>GET /api/users — list all users</li>
        <li>GET /api/users/:id — find user / 404 handling</li>
        <li>POST /api/users — create with validation errors (400, 409)</li>
        <li>PATCH /api/users/:id — partial update</li>
        <li>DELETE /api/users/:id — delete + idempotency check</li>
        <li>Full CRUD lifecycle test (multi-step scenario)</li>
      </ul>
    </div>
  );
}

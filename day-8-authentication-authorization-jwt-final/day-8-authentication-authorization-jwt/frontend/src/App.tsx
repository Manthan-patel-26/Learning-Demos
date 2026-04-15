/**
 * ============================================================
 * DAY 8: Authentication UI Demo
 * ============================================================
 * Demonstrates JWT auth flow:
 *   1. Register / Login → get accessToken
 *   2. Store accessToken in memory (not localStorage)
 *   3. Use token in Authorization header for API calls
 *   4. Refresh token flow (cookie-based, handled automatically)
 */
import React, { useState } from "react";

type AuthView = "login" | "register" | "dashboard";

interface User { id: string; name: string; email: string; role: string; }

export default function App() {
  const [view, setView] = useState<AuthView>("login");
  // ⚠️ Access token stored in MEMORY (not localStorage!)
  // It's lost on page refresh — that's intentional. Use refresh token to get new one.
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "alice@test.com", password: "Password1", name: "Alice", role: "admin" as const
  });

  const BASE = "http://localhost:3001/api/auth";

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Required to receive httpOnly cookies
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.status === "success") {
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
        setView("dashboard");
      } else {
        setError(data.error?.message ?? "Registration failed");
      }
    } catch {
      setError("Cannot connect to backend. Run: cd backend && npm run dev");
    } finally { setLoading(false); }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await res.json();
      if (data.status === "success") {
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
        setView("dashboard");
      } else {
        setError(data.error?.message ?? "Login failed");
      }
    } catch {
      setError("Cannot connect to backend. Run: cd backend && npm run dev");
    } finally { setLoading(false); }
  }

  async function callProtectedRoute(path: string): Promise<string> {
    if (!accessToken) return "No access token!";
    const res = await fetch(`${BASE}/${path}`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const data = await res.json();
    return JSON.stringify(data, null, 2);
  }

  async function handleLogout() {
    if (accessToken) {
      await fetch(`${BASE}/logout`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` },
        credentials: "include"
      });
    }
    setAccessToken(null);
    setUser(null);
    setView("login");
  }

  const [apiResult, setApiResult] = useState<string>("");

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 10, padding: 24,
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)", maxWidth: 480, margin: "0 auto"
  };

  const input: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: "1px solid #cbd5e0",
    borderRadius: 6, fontSize: 15, boxSizing: "border-box", marginBottom: 12
  };

  const btn: React.CSSProperties = {
    width: "100%", padding: "10px", borderRadius: 6, border: "none",
    background: "#4299e1", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 15
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <h1 style={{ textAlign: "center", color: "#2d3748" }}>🔐 Day 8: JWT Authentication</h1>

      {view !== "dashboard" ? (
        <div style={card}>
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 20 }}>
            {(["login", "register"] as AuthView[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ flex: 1, padding: "10px", border: "none", background: "none",
                  borderBottom: view === v ? "2px solid #4299e1" : "2px solid transparent",
                  color: view === v ? "#4299e1" : "#718096", fontWeight: 600, cursor: "pointer",
                  textTransform: "capitalize" }}>
                {v}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: "#fff5f5", color: "#c53030", padding: 10,
              borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={view === "login" ? handleLogin : handleRegister}>
            {view === "register" && (
              <>
                <input style={input} placeholder="Full Name" value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
                <select style={{ ...input, color: "#4a5568" }}
                  value={formData.role}
                  onChange={e => setFormData(p => ({ ...p, role: e.target.value as "admin" }))}>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="guest">Guest</option>
                </select>
              </>
            )}
            <input style={input} type="email" placeholder="Email" value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required />
            <input style={input} type="password" placeholder="Password (min 8, uppercase, number)"
              value={formData.password}
              onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} required />
            <button type="submit" style={btn} disabled={loading}>
              {loading ? "Loading..." : view === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div style={{ marginTop: 16, padding: 12, background: "#fffbeb", borderRadius: 6, fontSize: 12 }}>
            <strong>Demo credentials:</strong> alice@test.com / Password1<br/>
            (Register first if first time)
          </div>
        </div>
      ) : (
        <div style={{ ...card, maxWidth: 600 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700 }}>👋 Welcome, {user?.name}</div>
              <div style={{ fontSize: 13, color: "#718096" }}>{user?.email} · Role: {user?.role}</div>
            </div>
            <button onClick={handleLogout}
              style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#fed7d7", cursor: "pointer" }}>
              Logout
            </button>
          </div>

          <div style={{ background: "#f7fafc", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
            <strong>Access Token (in memory, not localStorage!):</strong><br/>
            <code style={{ wordBreak: "break-all", color: "#4299e1" }}>
              {accessToken?.slice(0, 50)}...
            </code>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              { label: "GET /me", path: "me" },
              { label: "GET /admin-only", path: "admin-only" },
              { label: "GET /users-and-admins", path: "users-and-admins" },
            ].map(({ label, path }) => (
              <button key={path}
                onClick={async () => setApiResult(await callProtectedRoute(path))}
                style={{ padding: "6px 14px", borderRadius: 6, border: "none",
                  background: "#ebf8ff", cursor: "pointer", fontSize: 13, color: "#2b6cb0" }}>
                {label}
              </button>
            ))}
          </div>

          {apiResult && (
            <pre style={{ background: "#1a202c", color: "#a8ff78", padding: 12,
              borderRadius: 8, fontSize: 12, overflow: "auto" }}>
              {apiResult}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

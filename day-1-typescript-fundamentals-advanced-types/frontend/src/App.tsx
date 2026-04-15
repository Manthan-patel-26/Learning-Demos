/**
 * ============================================================
 * DAY 1 FRONTEND - TypeScript Advanced Types Demo
 * ============================================================
 * This React app demonstrates how to use TypeScript types
 * with React components, props, and state.
 *
 * Run the backend first (port 3001), then this app.
 */

import React, { useState, useEffect } from "react";
import { ApiResponse, User, CreateUserInput } from "./types";

// ─── TYPE GUARD (same concept as backend!) ─────────────────
function isApiSuccess<T>(
  res: ApiResponse<T>,
): res is { status: "success"; data: T; message: string; timestamp: string } {
  return res.status === "success";
}

// ─── GENERIC LIST COMPONENT ────────────────────────────────
// This component works with ANY type T that has an id
// The generic makes it fully reusable
function GenericList<T extends { id: string }>({
  items,
  renderItem,
}: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  if (items.length === 0)
    return <p style={{ color: "#888" }}>No items found.</p>;
  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {items.map((item) => (
        // We use item.id as key - guaranteed by the `extends { id: string }` constraint
        <li
          key={item.id}
          style={{ padding: "8px", borderBottom: "1px solid #eee" }}
        >
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

// ─── DISCRIMINATED UNION STATUS BADGE ─────────────────────
// Using a union type for status prop - only these 3 values allowed
type Status = "idle" | "loading" | "error" | "success";

function StatusBadge({ status }: { status: Status }) {
  // Each branch is type-safe - TypeScript narrows to the exact string
  const styles: Record<Status, React.CSSProperties> = {
    idle: { background: "#e2e8f0", color: "#4a5568" },
    loading: { background: "#bee3f8", color: "#2b6cb0" },
    error: { background: "#fed7d7", color: "#c53030" },
    success: { background: "#c6f6d5", color: "#276749" },
  };
  // Record<Status, ...> ensures we handle ALL possible statuses!
  return (
    <span
      style={{
        ...styles[status],
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status.toUpperCase()}
    </span>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────
export default function App() {
  // useState with explicit type annotation
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null); // union type: string or null

  // CreateUserInput uses Omit utility type
  const [newUser, setNewUser] = useState<CreateUserInput>({
    name: "",
    email: "",
    role: "user",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setStatus("loading");
    try {
      const res = await fetch("http://localhost:3001/api/users/all");
      // We type the response as ApiResponse<User[]>
      console.log("Raw API response:", res);
      const data: ApiResponse<User[]> = await res.json();

      // Discriminated union narrowing - safe access!
      if (isApiSuccess(data)) {
        setUsers(data.data); // TypeScript knows data.data is User[]
        setStatus("success");
      } else {
        setError(data.error.message); // TypeScript knows data.error exists
        setStatus("error");
      }
    } catch (error) {
      console.log("Fetch error:", error);
      setError(
        "Cannot connect to backend. Make sure it's running on port 3001.",
      );
      setStatus("error");
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("http://localhost:3001/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data: ApiResponse<User> = await res.json();
      if (isApiSuccess(data)) {
        setUsers((prev) => [...prev, data.data]);
        setNewUser({ name: "", email: "", role: "user" }); // reset form
        setStatus("success");
      } else {
        setError(data.error.message);
        setStatus("error");
      }
    } catch {
      setError("Failed to create user");
      setStatus("error");
    }
  }

  const s: React.CSSProperties = {
    fontFamily: "system-ui, sans-serif",
    maxWidth: 700,
    margin: "0 auto",
    padding: 24,
  };

  return (
    <div style={s}>
      <h1 style={{ borderBottom: "3px solid #4299e1", paddingBottom: 8 }}>
        📘 Day 1: TypeScript Advanced Types
      </h1>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <StatusBadge status={status} />
        {error && (
          <span style={{ color: "#c53030", fontSize: 14 }}>{error}</span>
        )}
        <button
          onClick={fetchUsers}
          style={{ marginLeft: "auto", padding: "6px 14px", cursor: "pointer" }}
        >
          🔄 Refresh
        </button>
      </div>

      <section
        style={{
          background: "#f7fafc",
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          Create User{" "}
          <small style={{ fontSize: 12, fontWeight: 400 }}>
            — Omit utility type (no id/timestamps needed)
          </small>
        </h2>
        <form
          onSubmit={handleCreateUser}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <input
            placeholder="Name"
            value={newUser.name}
            onChange={(e) =>
              setNewUser((p) => ({ ...p, name: e.target.value }))
            }
            required
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #cbd5e0",
            }}
          />
          <input
            placeholder="Email"
            type="email"
            value={newUser.email}
            onChange={(e) =>
              setNewUser((p) => ({ ...p, email: e.target.value }))
            }
            required
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #cbd5e0",
            }}
          />
          {/* role is typed as "admin" | "user" | "guest" - union type! */}
          <select
            value={newUser.role}
            onChange={(e) =>
              setNewUser((p) => ({
                ...p,
                role: e.target.value as "admin" | "user" | "guest",
              }))
            }
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #cbd5e0",
            }}
          >
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="guest">Guest</option>
          </select>
          <button
            type="submit"
            style={{
              padding: "6px 16px",
              background: "#4299e1",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Add User
          </button>
        </form>
      </section>

      <section>
        <h2>
          Users{" "}
          <small style={{ fontSize: 12, fontWeight: 400 }}>
            — Generic List Component &lt;User&gt;
          </small>
        </h2>
        {/* GenericList<User> - the generic is inferred from the items prop */}
        <GenericList
          items={users}
          renderItem={(user) => (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{user.name}</strong>
                <span style={{ color: "#718096", marginLeft: 8 }}>
                  {user.email}
                </span>
              </div>
              <span
                style={{
                  background:
                    user.role === "admin"
                      ? "#9f7aea"
                      : user.role === "user"
                        ? "#4299e1"
                        : "#a0aec0",
                  color: "#fff",
                  padding: "2px 10px",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              >
                {user.role}
              </span>
            </div>
          )}
        />
      </section>

      <section
        style={{
          marginTop: 24,
          background: "#fffbeb",
          padding: 16,
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        <h3 style={{ marginTop: 0 }}>🎓 Key Concepts Used in This File</h3>
        <ul>
          <li>
            <strong>Union Types:</strong>{" "}
            <code>Status = "idle" | "loading" | "error" | "success"</code>
          </li>
          <li>
            <strong>Generics:</strong>{" "}
            <code>GenericList&lt;T extends &#123; id: string &#125;&gt;</code>
          </li>
          <li>
            <strong>Discriminated Unions:</strong> <code>isApiSuccess()</code>{" "}
            type guard narrows <code>ApiResponse&lt;T&gt;</code>
          </li>
          <li>
            <strong>Utility Types:</strong>{" "}
            <code>Omit&lt;User, "id" | ...&gt;</code> for CreateUserInput
          </li>
          <li>
            <strong>Record Type:</strong>{" "}
            <code>Record&lt;Status, CSSProperties&gt;</code> in StatusBadge
          </li>
        </ul>
        <p>
          Backend should be running on <code>http://localhost:3001</code>
        </p>
      </section>
    </div>
  );
}

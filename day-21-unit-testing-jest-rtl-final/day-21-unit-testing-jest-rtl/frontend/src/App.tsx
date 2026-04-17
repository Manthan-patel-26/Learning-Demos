/**
 * DAY 21: Unit Testing — Component Showcase
 * All 5 testable components in one view.
 * Run tests: npm test
 * Run with coverage: npm test -- --coverage
 */
import React, { useState, useCallback } from "react";
import {
  LoginForm,
  UserCard,
  AsyncDataList,
  Counter,
  SearchBar,
  User,
} from "./components";

const DEMO_USER: User = {
  id: "u1",
  name: "Alice Smith",
  email: "alice@example.com",
  role: "admin",
  isActive: true,
};

const DEMO_USER_INACTIVE: User = {
  ...DEMO_USER,
  id: "u2",
  name: "Bob Jones",
  isActive: false,
  role: "user",
};

export default function App() {
  const [loginLog, setLoginLog] = useState<string[]>([]);
  const [searchLog, setSearchLog] = useState<string[]>([]);
  const [counterValue, setCounterValue] = useState(0);

  const mockLogin = async (creds: { email: string; password: string }) => {
    await new Promise((r) => setTimeout(r, 800));
    if (creds.password === "wrong") throw new Error("Invalid credentials");
    setLoginLog((prev) => [`Logged in as ${creds.email}`, ...prev.slice(0, 4)]);
  };

  const mockFetch = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 600));
    return [
      "React 18",
      "TypeScript 5",
      "Node.js 22",
      "PostgreSQL 16",
      "Redis 7",
    ];
  }, []);

  const mockFetchFail = useCallback(async (): Promise<string[]> => {
    await new Promise((r) => setTimeout(r, 600));
    throw new Error("Network error — simulated failure");
  }, []);

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 10,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: 16,
  };

  return (
    <div
      style={{
        fontFamily: "system-ui",
        background: "#f7fafc",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>
          🧪 Day 21: Unit Testing — Jest & React Testing Library
        </h1>
        <div
          style={{
            background: "#c6f6d5",
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          <strong>Run tests:</strong> <code>cd frontend && npm test</code>
          <br />
          <strong>With coverage:</strong> <code>npm test -- --coverage</code>
          <br />
          Tests are in <code>src/__tests__/components.test.tsx</code>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          {/* 1. LOGIN FORM */}
          <div style={card}>
            <h3 style={{ marginTop: 0, color: "#4299e1" }}>
              1. LoginForm — Form Validation
            </h3>
            <p style={{ fontSize: 12, color: "#718096" }}>
              Try password "wrong" to test error state
            </p>
            <LoginForm onSubmit={mockLogin} />
            {loginLog.map((l, i) => (
              <div
                key={i}
                style={{ fontSize: 12, color: "#38a169", marginTop: 4 }}
              >
                ✅ {l}
              </div>
            ))}
          </div>

          {/* 2. COUNTER */}
          <div style={card}>
            <h3 style={{ marginTop: 0, color: "#48bb78" }}>
              4. Counter — State & Bounds
            </h3>
            <Counter
              initialValue={0}
              min={-5}
              max={10}
              step={1}
              onChange={setCounterValue}
            />
            <div style={{ fontSize: 13, color: "#718096", marginTop: 8 }}>
              Current value: <strong>{counterValue}</strong>
            </div>
          </div>

          {/* 3. USER CARDS */}
          <div style={card}>
            <h3 style={{ marginTop: 0, color: "#9f7aea" }}>
              2. UserCard — Conditional Rendering
            </h3>
            <UserCard
              user={DEMO_USER}
              onEdit={(u) => alert(`Edit: ${u.name}`)}
              onDeactivate={(id) => alert(`Deactivate: ${id}`)}
            />
            <div style={{ marginTop: 12 }}>
              <UserCard user={DEMO_USER_INACTIVE} />
            </div>
          </div>

          {/* 4. SEARCH BAR */}
          <div style={card}>
            <h3 style={{ marginTop: 0, color: "#ed8936" }}>
              5. SearchBar — Debounce
            </h3>
            <p style={{ fontSize: 12, color: "#718096" }}>
              onSearch fires 300ms after you stop typing
            </p>
            <SearchBar
              onSearch={(q) =>
                setSearchLog((prev) => [
                  q ? `Searched: "${q}"` : "Cleared",
                  ...prev.slice(0, 4),
                ])
              }
              debounceMs={300}
            />
            {searchLog.map((l, i) => (
              <div
                key={i}
                style={{ fontSize: 12, color: "#ed8936", marginTop: 4 }}
              >
                🔍 {l}
              </div>
            ))}
          </div>

          {/* 5. ASYNC DATA LIST */}
          <div style={{ ...card, gridColumn: "1/-1" }}>
            <h3 style={{ marginTop: 0, color: "#e53e3e" }}>
              3. AsyncDataList — Loading/Error States
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{ fontSize: 12, color: "#718096", marginBottom: 8 }}
                >
                  Success state:
                </div>
                <AsyncDataList fetchData={mockFetch} title="Technologies" />
              </div>
              <div>
                <div
                  style={{ fontSize: 12, color: "#718096", marginBottom: 8 }}
                >
                  Error state:
                </div>
                <AsyncDataList fetchData={mockFetchFail} title="Failed List" />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{ ...card, background: "#fffbeb", fontSize: 12, marginTop: 8 }}
        >
          <strong>🎓 Key Testing Concepts in the test file:</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
            <li>
              <code>getByRole</code> / <code>getByLabelText</code> — accessible
              queries (preferred over getByTestId)
            </li>
            <li>
              <code>findBy*</code> — waits for async elements to appear
            </li>
            <li>
              <code>queryBy*</code> — returns null if not found (for asserting
              absence)
            </li>
            <li>
              <code>userEvent</code> — realistic user simulation (focus, hover,
              keyboard)
            </li>
            <li>
              <code>jest.useFakeTimers()</code> — control debounce without
              waiting
            </li>
            <li>
              <code>jest.fn().mockResolvedValue()</code> — mock async functions
            </li>
            <li>
              <code>jest.fn().mockRejectedValue()</code> — mock async errors
            </li>
            <li>
              <code>waitFor()</code> — keep retrying assertion until state
              updates
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

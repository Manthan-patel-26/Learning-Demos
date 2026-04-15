/**
 * ============================================================
 * DAY 4: React Hooks Deep Dive - Demo App
 * ============================================================
 * Each section demonstrates a different custom hook.
 */
import React, { useState, useCallback, useMemo, useReducer } from "react";
import {
  useDebounce, useThrottle, usePrevious,
  usePerformanceMonitor, useLocalStorage, useAsync
} from "./hooks";

// ─── USEMEMO / USECALLBACK DEMO COMPONENT ─────────────────
// This shows WHEN to use memoization and when NOT to.

// An "expensive" calculation — only re-run if numbers array changes
function useExpensiveCalculation(numbers: number[]): number {
  // useMemo caches the result. Only recalculates when `numbers` changes.
  // WITHOUT useMemo: recalculates on EVERY render (even unrelated state changes)
  // WITH useMemo: only recalculates when `numbers` array reference changes
  //
  // ⚠️ GOTCHA: Don't memoize EVERYTHING. Only use when:
  //   1. The calculation is genuinely slow (>1ms)
  //   2. The component re-renders frequently
  //   3. The inputs rarely change
  return useMemo(() => {
    console.log("Running expensive calculation...");
    return numbers.reduce((sum, n) => sum + n * n, 0); // Sum of squares
  }, [numbers]);
}

// ─── USEREDUCER DEMO ──────────────────────────────────────
// useReducer is better than useState when:000000
//   - Next state depends on previous state
//   - Multiple sub-values (like a form or a counter with min/max)
//   - State transitions are complex

type CounterState = { count: number; min: number; max: number; history: number[] };
type CounterAction =
  | { type: "INCREMENT" }
  | { type: "DECREMENT" }
  | { type: "RESET" }
  | { type: "SET"; payload: number };

function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case "INCREMENT":
      if (state.count >= state.max) return state; // Guard: don't exceed max
      return { ...state, count: state.count + 1, history: [...state.history, state.count + 1] };
    case "DECREMENT":
      if (state.count <= state.min) return state;
      return { ...state, count: state.count - 1, history: [...state.history, state.count - 1] };
    case "RESET":
      return { ...state, count: 0, history: [...state.history, 0] };
    case "SET":
      const clamped = Math.min(Math.max(action.payload, state.min), state.max);
      return { ...state, count: clamped, history: [...state.history, clamped] };
    default:
      return state;
  }
}

export default function App() {
  // ── Performance Monitor ─────────────────────────────────
  const metrics = usePerformanceMonitor("App", 16);

  // ── Search with Debounce ────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [searchResults, setSearchResults] = useState<string[]>([]);

  // useCallback prevents fetchResults from being recreated on every render
  // WRONG without useCallback: a new function reference every render
  //   → useAsync's dependency array sees a "new" function → infinite loop!
  const fetchResults = useCallback(async () => {
    if (!debouncedSearch) return { data: [] };
    const res = await fetch(`http://localhost:3001/api/search?q=${debouncedSearch}`);
    return res.json() as Promise<{ data: string[] }>;
  }, [debouncedSearch]);

  const searchState = useAsync(fetchResults, false);

  // Sync search results when async state updates
  React.useEffect(() => {
    if (searchState.status === "success" && searchState.data) {
      setSearchResults(searchState.data.data ?? []);
    }
  }, [searchState.status, searchState.data]);

  React.useEffect(() => {
    if (debouncedSearch) searchState.execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // ── Throttle ────────────────────────────────────────────
  const [mouseX, setMouseX] = useState(0);
  const throttledMouseX = useThrottle(mouseX, 200);

  // ── usePrevious ─────────────────────────────────────────
  const [counter, setCounter] = useState(0);
  const previousCounter = usePrevious(counter);

  // ── useMemo ─────────────────────────────────────────────
  const [numbers] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [unrelatedState, setUnrelatedState] = useState(0);
  const expensiveResult = useExpensiveCalculation(numbers);

  // ── useReducer ──────────────────────────────────────────
  const [counterState, dispatch] = useReducer(counterReducer, {
    count: 0, min: -5, max: 10, history: [0]
  });

  // ── useLocalStorage ─────────────────────────────────────
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");
  const [savedName, setSavedName] = useLocalStorage<string>("userName", "");

  const card: React.CSSProperties = {
    background: theme === "dark" ? "#2d3748" : "#fff",
    color: theme === "dark" ? "#e2e8f0" : "#2d3748",
    borderRadius: 10, padding: 20, marginBottom: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  };
  const bg = theme === "dark" ? "#1a202c" : "#f7fafc";

  return (
    <div
      style={{ fontFamily: "system-ui, sans-serif", background: bg, minHeight: "100vh", padding: 24 }}
      onMouseMove={(e) => setMouseX(e.clientX)}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ color: theme === "dark" ? "#e2e8f0" : "#2d3748", margin: 0 }}>
            ⚓ Day 4: React Hooks Deep Dive
          </h1>
          <button
            onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
            style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              background: theme === "dark" ? "#4a5568" : "#e2e8f0" }}
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
        <p style={{ color: "#718096", marginBottom: 20 }}>Theme saved to localStorage — refresh the page, it persists!</p>

        {/* PERFORMANCE MONITOR */}
        <div style={{ ...card, background: metrics.isSlow ? "#fff5f5" : card.background,
          border: `1px solid ${metrics.isSlow ? "#fc8181" : "#e2e8f0"}` }}>
          <h3 style={{ marginTop: 0 }}>📊 usePerformanceMonitor</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { label: "Render Count", value: metrics.renderCount },
              { label: "Last Render", value: `${metrics.lastRenderTime.toFixed(2)}ms` },
              { label: "Avg Render", value: `${metrics.averageRenderTime.toFixed(2)}ms` }
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: "center", background: "#f7fafc",
                borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#4299e1" }}>{value}</div>
                <div style={{ fontSize: 12, color: "#718096" }}>{label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setUnrelatedState(s => s + 1)}
            style={{ marginTop: 12, padding: "6px 14px", borderRadius: 6, border: "none",
              background: "#ebf8ff", cursor: "pointer" }}>
            Trigger re-render (unrelated state: {unrelatedState})
          </button>
        </div>

        {/* DEBOUNCE */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>🔍 useDebounce — Search (500ms delay)</h3>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Type to search... (watch the debounced value below)"
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6,
              border: "1px solid #cbd5e0", fontSize: 15, boxSizing: "border-box" }}
          />
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <div>Raw input: <strong>"{searchInput}"</strong></div>
            <div>Debounced (API fires here): <strong style={{ color: "#4299e1" }}>"{debouncedSearch}"</strong></div>
            <div style={{ marginTop: 4 }}>
              Status: <span style={{ color: searchState.status === "loading" ? "#ed8936" : "#48bb78" }}>
                {searchState.status}
              </span>
              {searchResults.length > 0 && (
                <span style={{ marginLeft: 8 }}>Results: {searchResults.join(", ")}</span>
              )}
            </div>
          </div>
        </div>

        {/* THROTTLE */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>🏎️ useThrottle — Mouse Position (200ms)</h3>
          <p style={{ fontSize: 13, color: "#718096", margin: "0 0 8px" }}>
            Move your mouse over the page. Throttled value updates max once per 200ms.
          </p>
          <div style={{ display: "flex", gap: 20, fontSize: 14 }}>
            <div>Raw X: <strong>{mouseX}px</strong></div>
            <div>Throttled X: <strong style={{ color: "#9f7aea" }}>{throttledMouseX}px</strong></div>
          </div>
        </div>

        {/* USEPREVIOUS */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>⏮️ usePrevious</h3>
          <p style={{ fontSize: 13, color: "#718096", margin: "0 0 12px" }}>
            Track the previous value — useful for comparing old vs new data.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={() => setCounter(c => c - 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e0", cursor: "pointer" }}>−</button>
            <div style={{ textAlign: "center", minWidth: 100 }}>
              <div style={{ fontSize: 12, color: "#718096" }}>Previous: {previousCounter ?? "—"}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#4299e1" }}>{counter}</div>
              <div style={{ fontSize: 12, color: "#718096" }}>Current</div>
            </div>
            <button onClick={() => setCounter(c => c + 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e0", cursor: "pointer" }}>+</button>
          </div>
        </div>

        {/* USEREDUCER */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>🔄 useReducer — Bounded Counter (min: {counterState.min}, max: {counterState.max})</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <button onClick={() => dispatch({ type: "DECREMENT" })}
              disabled={counterState.count <= counterState.min}
              style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#fed7d7", cursor: "pointer" }}>−</button>
            <span style={{ fontSize: 28, fontWeight: 700, minWidth: 60, textAlign: "center", color: "#4299e1" }}>
              {counterState.count}
            </span>
            <button onClick={() => dispatch({ type: "INCREMENT" })}
              disabled={counterState.count >= counterState.max}
              style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#c6f6d5", cursor: "pointer" }}>+</button>
            <button onClick={() => dispatch({ type: "RESET" })}
              style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#bee3f8", cursor: "pointer" }}>Reset</button>
          </div>
          <div style={{ fontSize: 12, color: "#718096" }}>
            History: {counterState.history.slice(-10).join(" → ")}
          </div>
        </div>

        {/* USELOCALSTORAGE */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>💾 useLocalStorage — Persisted Name</h3>
          <input
            value={savedName}
            onChange={(e) => setSavedName(e.target.value)}
            placeholder="Type your name — refresh the page, it's still here!"
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6,
              border: "1px solid #cbd5e0", fontSize: 15, boxSizing: "border-box" }}
          />
          {savedName && (
            <p style={{ marginTop: 8, fontSize: 14 }}>
              👋 Hello, <strong>{savedName}</strong>! (Stored in localStorage key: "userName")
            </p>
          )}
          <p style={{ fontSize: 12, color: "#718096", margin: "8px 0 0" }}>
            expensiveCalculation result (useMemo): {expensiveResult}
          </p>
        </div>
      </div>
    </div>
  );
}

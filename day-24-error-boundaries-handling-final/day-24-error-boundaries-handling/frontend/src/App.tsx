/**
 * DAY 24: Error Boundaries — Interactive Demo
 * Shows where error boundaries work and where they don't.
 */
import React, { useState } from "react";
import {
  ErrorBoundary, NetworkErrorBoundary,
  BuggyCounter, AsyncErrorComponent, EventHandlerErrorComponent, GoodAsyncComponent,
} from "./components/ErrorBoundary";

export default function App() {
  const [resetKey, setResetKey] = useState(0);
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);

  function logError(error: Error) {
    setGlobalErrors(prev => [`[${new Date().toLocaleTimeString()}] ${error.message}`, ...prev.slice(0, 4)]);
  }

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 10, padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 16,
  };

  const badge = (color: string, text: string) => (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: color, color: "#fff", marginLeft: 8 }}>
      {text}
    </span>
  );

  return (
    <div style={{ fontFamily: "system-ui", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>🛡️ Day 24: Error Boundaries & Error Handling</h1>

        {/* DEMO 1: Basic Error Boundary */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>
            1. Render Error {badge("#38a169", "Caught by Boundary ✅")}
          </h3>
          <p style={{ fontSize: 13, color: "#718096" }}>
            Click increment until it crashes at 5. The error boundary catches the render error
            and shows a fallback. Other parts of the page still work!
          </p>
          {/* Each section has its OWN error boundary — isolated failures */}
          <ErrorBoundary
            key={resetKey}  // Changing key resets the boundary
            onError={logError}
          >
            <BuggyCounter />
          </ErrorBoundary>
          <button onClick={() => setResetKey(k => k + 1)}
            style={{ marginTop: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid #cbd5e0",
              background: "#fff", cursor: "pointer", fontSize: 13 }}>
            Reset Counter
          </button>
        </div>

        {/* DEMO 2: Custom Fallback */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>
            2. Custom Fallback UI {badge("#38a169", "Caught by Boundary ✅")}
          </h3>
          <NetworkErrorBoundary>
            <GoodAsyncComponent />
          </NetworkErrorBoundary>
        </div>

        {/* DEMO 3: Async Error — NOT caught */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>
            3. Async Error in useEffect {badge("#e53e3e", "NOT caught by Boundary ❌")}
          </h3>
          <p style={{ fontSize: 13, color: "#718096" }}>
            Errors thrown inside <code>useEffect</code>, <code>setTimeout</code>, or
            <code>fetch</code> callbacks are NOT caught by Error Boundaries.
            Use try/catch and local state instead.
          </p>
          <ErrorBoundary onError={logError}>
            <AsyncErrorComponent />
          </ErrorBoundary>
        </div>

        {/* DEMO 4: Event Handler Error — NOT caught */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>
            4. Event Handler Error {badge("#e53e3e", "NOT caught by Boundary ❌")}
          </h3>
          <p style={{ fontSize: 13, color: "#718096" }}>
            Errors thrown in <code>onClick</code>, <code>onChange</code>, and other
            event handlers are NOT caught. Use try/catch in the handler.
          </p>
          <ErrorBoundary onError={logError}>
            <EventHandlerErrorComponent />
          </ErrorBoundary>
        </div>

        {/* Error Log */}
        {globalErrors.length > 0 && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>📋 Error Log (onError callback)</h3>
            {globalErrors.map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: "#c53030", padding: "4px 0",
                borderBottom: "1px solid #e2e8f0" }}>{e}</div>
            ))}
          </div>
        )}

        <div style={{ ...card, background: "#fffbeb", fontSize: 12 }}>
          <strong>🎓 Error Boundary Coverage Summary:</strong>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr style={{ background: "#f7fafc" }}>
                <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #e2e8f0" }}>Error Source</th>
                <th style={{ textAlign: "center", padding: 6, borderBottom: "1px solid #e2e8f0" }}>Boundary Catches?</th>
                <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #e2e8f0" }}>Solution</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Render error (throw in component body)", "✅ Yes", "Error boundary"],
                ["useEffect async error", "❌ No", "try/catch + useState"],
                ["Event handler error (onClick)", "❌ No", "try/catch in handler"],
                ["setTimeout/setInterval", "❌ No", "try/catch in callback"],
                ["fetch / API calls", "❌ No", "try/catch + error state"],
              ].map(([src, caught, fix], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                  <td style={{ padding: 6 }}><code>{src}</code></td>
                  <td style={{ padding: 6, textAlign: "center" }}>{caught}</td>
                  <td style={{ padding: 6, color: "#718096" }}>{fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

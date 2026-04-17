/**
 * ============================================================
 * DAY 24: ERROR BOUNDARIES — React Class-Based
 * ============================================================
 * Error Boundaries MUST be class components (as of React 18).
 * You cannot write an error boundary as a function component.
 * (React 19 will introduce use() hook, but class is still standard)
 *
 * WHAT ERROR BOUNDARIES CATCH:
 *  ✅ Errors during rendering
 *  ✅ Errors in lifecycle methods
 *  ✅ Errors in constructors of child tree
 *
 * WHAT ERROR BOUNDARIES DO NOT CATCH:
 *  ❌ Event handler errors (use try/catch in the handler)
 *  ❌ Async errors (useEffect, setTimeout, fetch)
 *  ❌ Errors in the error boundary itself
 *  ❌ Server-side rendering errors
 */

import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from "react";

// ─── 1. BASIC ERROR BOUNDARY ──────────────────────────────
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;                        // Custom fallback UI
  onError?: (error: Error, info: ErrorInfo) => void; // Error logging callback
  resetKey?: unknown;                          // Change this to reset the boundary
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // getDerivedStateFromError: update state SYNCHRONOUSLY when error occurs
  // This is what triggers the fallback UI to render
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  // componentDidCatch: use for side effects (logging, analytics)
  // Receives the error AND the component stack (which component threw)
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log to error monitoring service (Sentry, Datadog, etc.)
    this.props.onError?.(error, errorInfo);
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  // Reset when resetKey changes (e.g., route change, user action)
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

// ─── DEFAULT FALLBACK UI ──────────────────────────────────
interface FallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

function DefaultErrorFallback({ error, errorInfo, onReset }: FallbackProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div
      role="alert"
      style={{
        padding: 24, margin: 16, borderRadius: 10,
        background: "#fff5f5", border: "1px solid #fc8181",
        fontFamily: "system-ui",
      }}
    >
      <h2 style={{ color: "#c53030", marginTop: 0 }}>⚠️ Something went wrong</h2>
      <p style={{ color: "#742a2a" }}>
        We're sorry — something unexpected happened. You can try:
      </p>
      <ul style={{ color: "#742a2a" }}>
        <li>Clicking "Try Again" to reset this section</li>
        <li>Refreshing the page</li>
        <li>Contacting support if the problem persists</li>
      </ul>
      <button
        onClick={onReset}
        style={{
          padding: "8px 20px", borderRadius: 6, border: "none",
          background: "#e53e3e", color: "#fff", cursor: "pointer", fontWeight: 600,
        }}
      >
        Try Again
      </button>

      {/* Only show technical details in development */}
      {isDev && error && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer", color: "#742a2a", fontSize: 13 }}>
            Developer Details (dev mode only)
          </summary>
          <pre style={{
            marginTop: 8, padding: 12, background: "#1a202c", color: "#fc8181",
            borderRadius: 6, fontSize: 12, overflow: "auto", whiteSpace: "pre-wrap",
          }}>
            {error.toString()}
            {errorInfo?.componentStack}
          </pre>
        </details>
      )}
    </div>
  );
}

// ─── 2. SPECIALIZED ERROR BOUNDARIES ─────────────────────

// NetworkErrorBoundary: shows a specific UI for network failures
export class NetworkErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: "center", color: "#718096" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌐</div>
          <p>Network error. Check your connection.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e0", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── 3. withErrorBoundary HOC ─────────────────────────────
// Wrap any component with an error boundary using this HOC
export function withErrorBoundary<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  fallback?: ReactNode
) {
  const WithBoundary: React.FC<T> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  WithBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName ?? WrappedComponent.name})`;
  return WithBoundary;
}

// ─── BUGGY COMPONENTS (for demo/testing) ──────────────────

export function BuggyCounter() {
  const [count, setCount] = useState(0);

  if (count === 5) {
    // Simulate a rendering error
    throw new Error("Counter reached 5! This simulates a render error.");
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{count}</div>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#4299e1", color: "#fff", cursor: "pointer" }}
      >
        Increment (crashes at 5)
      </button>
    </div>
  );
}

export function AsyncErrorComponent() {
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Async errors from useEffect are NOT caught by error boundaries!
    // Must use try/catch and local state
    const fetchData = async () => {
      try {
        await new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Async network error")), 1500)
        );
      } catch (err) {
        // ✅ Correct: handle async errors in try/catch, show via state
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };
    fetchData();
  }, []);

  if (error) {
    return (
      <div role="alert" style={{ padding: 12, background: "#fff5f5", borderRadius: 8, color: "#c53030", fontSize: 14 }}>
        ⚠ Async error (caught in useEffect, NOT by ErrorBoundary): {error}
      </div>
    );
  }

  return <div>{data ?? "Loading async data... (will fail in 1.5s)"}</div>;
}

export function EventHandlerErrorComponent() {
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    try {
      // Event handler errors are NOT caught by error boundaries either!
      throw new Error("Click handler error");
    } catch (err) {
      // ✅ Correct: handle event errors in try/catch
      setError(err instanceof Error ? err.message : "Click failed");
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#ed8936", color: "#fff", cursor: "pointer" }}
      >
        Click to trigger handler error
      </button>
      {error && (
        <p style={{ color: "#c53030", fontSize: 13, marginTop: 8 }}>
          ⚠ Handler error (caught in try/catch, NOT boundary): {error}
        </p>
      )}
    </div>
  );
}

export function GoodAsyncComponent() {
  const [items, setItems] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const load = async () => {
    setStatus("loading");
    try {
      await new Promise(r => setTimeout(r, 800));
      setItems(["React", "TypeScript", "Node.js"]);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div>
      {status === "idle" && (
        <button onClick={load} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#48bb78", color: "#fff", cursor: "pointer" }}>
          Load Data
        </button>
      )}
      {status === "loading" && <div>Loading...</div>}
      {status === "success" && <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>}
      {status === "error" && <div style={{ color: "#e53e3e" }}>Failed to load</div>}
    </div>
  );
}

/**
 * ============================================================
 * DAY 13: Higher-Order Components (HOCs) & Render Props
 * ============================================================
 * HOC: a function that takes a component and returns an enhanced component.
 * Render Props: pass a render function as a prop (more flexible than HOC).
 * Custom Hook: the modern alternative to both — use this first.
 */

import React, { useState, useEffect, ComponentType, ReactNode } from "react";

// ─── 1. HIGHER-ORDER COMPONENT ────────────────────────────
// HOC: withLoadingState
// Wraps any component to add loading/error handling.
//
// HOC Type signature: (Component: ComponentType<T>) => ComponentType<T & InjectedProps>
// T = original component props
// InjectedProps = what the HOC adds

interface WithLoadingProps {
  isLoading?: boolean;
  error?: string | null;
}

// The generic T extends object and WithLoadingProps is removed from outer props
// so the HOC consumer doesn't have to pass loading/error manually.
export function withLoadingState<T extends object>(
  WrappedComponent: ComponentType<T>,
) {
  // The enhanced component — has a displayName for DevTools
  const WithLoading: React.FC<T & WithLoadingProps> = ({
    isLoading,
    error,
    ...props
  }) => {
    if (isLoading)
      return (
        <div style={{ padding: 40, textAlign: "center", color: "#718096" }}>
          ⏳ Loading...
        </div>
      );
    if (error)
      return (
        <div
          style={{
            padding: 20,
            background: "#fff5f5",
            borderRadius: 8,
            color: "#c53030",
          }}
        >
          ⚠ {error}
        </div>
      );
    return <WrappedComponent {...(props as T)} />;
  };

  // displayName: shows in React DevTools as "withLoadingState(MyComponent)"
  WithLoading.displayName = `withLoadingState(${WrappedComponent.displayName ?? WrappedComponent.name})`;
  return WithLoading;
}

// ─── 2. RENDER PROPS ──────────────────────────────────────
// Render Props: passes a function as `children` or `render` prop.
// More flexible than HOC — the consumer controls the UI.
// Modern alternative: custom hooks (usually cleaner)

interface MousePosition {
  x: number;
  y: number;
}

interface MouseTrackerProps {
  // "children as function" pattern — also called "function as child"
  children: (position: MousePosition) => ReactNode;
}

export function MouseTracker({ children }: MouseTrackerProps) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) =>
      setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // Delegate rendering to the consumer — full control!
  return <>{children(position)}</>;
}

// ─── 3. CUSTOM HOOK (the modern replacement for above) ────
// The same logic as MouseTracker but as a hook.
// This is simpler, more flexible, and avoids "wrapper hell".
export function useMousePosition(): MousePosition {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) =>
      setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return position;
}

// ─── 4. CONTEXT OPTIMIZATION: Split Context ───────────────
// PROBLEM: One big context → any state change re-renders ALL consumers.
// SOLUTION: Split into separate contexts based on change frequency.

interface ThemeContextValue {
  theme: "light" | "dark";
  colors: Record<string, string>;
}
interface ThemeActionsValue {
  toggleTheme: () => void;
}

export const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "light",
  colors: { background: "#f7fafc", text: "#2d3748", primary: "#4299e1" },
});
export const ThemeActionsContext = React.createContext<ThemeActionsValue>({
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const colors =
    theme === "light"
      ? {
          background: "#f7fafc",
          text: "#2d3748",
          primary: "#4299e1",
          card: "#fff",
        }
      : {
          background: "#1a202c",
          text: "#e2e8f0",
          primary: "#63b3ed",
          card: "#2d3748",
        };

  // Memoize actions so ThemeActionsContext consumers don't re-render on theme change
  const actions = React.useMemo<ThemeActionsValue>(
    () => ({
      toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
    }),
    [],
  );

  return (
    <ThemeContext.Provider value={{ theme, colors }}>
      <ThemeActionsContext.Provider value={actions}>
        {children}
      </ThemeActionsContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
export function useThemeActions() {
  return React.useContext(ThemeActionsContext);
}

/**
 * DAY 13: Advanced React Patterns Demo
 * Shows: Compound Tabs, HOC, Render Props, Custom Hook, Context Split
 */
import React, { useState } from "react";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "./components/Tabs";
import {
  withLoadingState,
  MouseTracker,
  useMousePosition,
  ThemeProvider,
  useTheme,
  useThemeActions,
} from "./components/patterns";

// ─── HOC DEMO ─────────────────────────────────────────────
function DataTable({ data }: { data: string[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {data.map((item, i) => (
        <li
          key={i}
          style={{
            padding: "8px 0",
            borderBottom: "1px solid #e2e8f0",
            fontSize: 14,
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
// HOC wraps DataTable with loading/error handling
const DataTableWithLoading = withLoadingState(DataTable);

// ─── INNER APP (uses ThemeContext) ─────────────────────────
function AppContent() {
  const { theme, colors } = useTheme();
  const { toggleTheme } = useThemeActions();
  const mousePos = useMousePosition(); // Custom hook (modern render-prop alternative)

  // Tabs: controlled mode
  const [activeTab, setActiveTab] = useState("compound");

  // HOC demo state
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  const card: React.CSSProperties = {
    background: colors.card,
    borderRadius: 10,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
    marginBottom: 16,
  };

  return (
    <div
      style={{
        fontFamily: "system-ui",
        background: colors.background,
        minHeight: "100vh",
        padding: 24,
        color: colors.text,
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h1 style={{ margin: 0 }}>🧩 Day 13: Advanced React Patterns</h1>
          <button
            onClick={toggleTheme}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              border: "1px solid #cbd5e0",
              background: "none",
              cursor: "pointer",
              color: colors.text,
            }}
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>

        {/* COMPOUND TABS DEMO */}
        <div style={card}>
          <h3 style={{ marginTop: 0, color: colors.primary }}>
            1. Compound Components — Tab System
          </h3>
          <p style={{ fontSize: 13, color: "#718096", marginTop: 0 }}>
            Use keyboard arrows ←→, Home, End to navigate. Try controlled vs
            uncontrolled.
          </p>

          {/* CONTROLLED MODE */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#a0aec0", marginBottom: 8 }}>
              CONTROLLED (parent manages state, activeTab="{activeTab}")
            </div>
            <Tabs activeTab={activeTab} onChange={setActiveTab}>
              <TabList>
                <Tab id="compound">Compound</Tab>
                <Tab id="hoc">HOC</Tab>
                <Tab id="renderprops">Render Props</Tab>
                <Tab id="disabled" disabled>
                  Disabled
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel id="compound">
                  <div
                    style={{
                      padding: 16,
                      background: "#ebf8ff",
                      borderRadius: 8,
                    }}
                  >
                    <strong>Compound Components Pattern</strong>
                    <p style={{ fontSize: 14, margin: "8px 0 0" }}>
                      Multiple components share state through Context. The
                      consumer gets a declarative, flexible API — like HTML's
                      &lt;select&gt;/&lt;option&gt; or
                      &lt;table&gt;/&lt;tr&gt;/&lt;td&gt;.
                    </p>
                  </div>
                </TabPanel>
                <TabPanel id="hoc">
                  <div style={{ padding: 16 }}>
                    <strong>Higher-Order Components</strong>
                    <p style={{ fontSize: 14 }}>
                      A function that wraps a component to add behavior.
                      withLoadingState(DataTable) adds loading/error handling.
                    </p>
                  </div>
                </TabPanel>
                <TabPanel id="renderprops" lazy>
                  <div style={{ padding: 16 }}>
                    <strong>Render Props (+ lazy panel!)</strong>
                    <p style={{ fontSize: 14 }}>
                      This panel was NOT rendered until you clicked here
                      (lazy=true). Render props pass a function as children for
                      maximum flexibility.
                    </p>
                  </div>
                </TabPanel>
                <TabPanel id="disabled">
                  <div>
                    This panel can't be reached via the disabled tab button.
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </div>

          {/* UNCONTROLLED MODE */}
          <div style={{ fontSize: 12, color: "#a0aec0", marginBottom: 8 }}>
            UNCONTROLLED (manages its own state, defaultTab="b")
          </div>
          <Tabs defaultTab="b">
            <TabList>
              <Tab id="a">Tab A</Tab>
              <Tab id="b">Tab B (default)</Tab>
              <Tab id="c">Tab C</Tab>
            </TabList>
            <TabPanels>
              <TabPanel id="a">
                <div style={{ padding: 12 }}>Panel A content</div>
              </TabPanel>
              <TabPanel id="b">
                <div style={{ padding: 12 }}>
                  Panel B — this was the default! No parent state needed.
                </div>
              </TabPanel>
              <TabPanel id="c">
                <div style={{ padding: 12 }}>Panel C content</div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>

        {/* HOC DEMO */}
        <div style={card}>
          <h3 style={{ marginTop: 0, color: colors.primary }}>
            2. Higher-Order Component (HOC)
          </h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => {
                setIsLoading(true);
                setShowError(false);
                setTimeout(() => setIsLoading(false), 2000);
              }}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: "#bee3f8",
                cursor: "pointer",
              }}
            >
              Simulate Loading (2s)
            </button>
            <button
              onClick={() => {
                setShowError((s) => !s);
                setIsLoading(false);
              }}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: "#fed7d7",
                cursor: "pointer",
              }}
            >
              Toggle Error
            </button>
          </div>
          {/* DataTableWithLoading is DataTable + loading/error handling via HOC */}
          <DataTableWithLoading
            isLoading={isLoading}
            error={showError ? "Failed to fetch data from server" : null}
            data={["TypeScript", "React", "Node.js", "PostgreSQL", "Redis"]}
          />
        </div>

        {/* RENDER PROPS vs CUSTOM HOOK */}
        <div style={card}>
          <h3 style={{ marginTop: 0, color: colors.primary }}>
            3. Render Props vs Custom Hook
          </h3>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#718096",
                  marginBottom: 8,
                }}
              >
                RENDER PROPS (verbose but explicit)
              </div>
              <div
                style={{
                  background: "#f7fafc",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                }}
              >
                <MouseTracker>
                  {({ x, y }) => (
                    <div>
                      Mouse:{" "}
                      <strong>
                        {x}, {y}
                      </strong>
                    </div>
                  )}
                </MouseTracker>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#718096",
                  marginBottom: 8,
                }}
              >
                CUSTOM HOOK (clean, modern ✅)
              </div>
              <div
                style={{
                  background: "#f7fafc",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                }}
              >
                Mouse:{" "}
                <strong>
                  {mousePos.x}, {mousePos.y}
                </strong>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#718096", marginTop: 8 }}>
            Both do the same thing. Custom hooks are preferred in modern React —
            no extra wrapper components, no "wrapper hell".
          </div>
        </div>

        {/* CONTEXT SPLIT */}
        <div style={{ ...card, background: "#fffbeb" }}>
          <h3 style={{ marginTop: 0 }}>4. Context Splitting (Theme above)</h3>
          <p style={{ fontSize: 13, margin: 0 }}>
            ThemeContext (reads: theme + colors) and ThemeActionsContext
            (writes: toggleTheme) are separate. Components that only call{" "}
            <code>toggleTheme</code> don't re-render when the theme changes.
            Click the theme toggle — only components consuming ThemeContext
            re-render.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

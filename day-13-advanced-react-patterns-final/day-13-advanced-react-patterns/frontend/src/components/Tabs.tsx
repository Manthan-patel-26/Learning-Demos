/**
 * ============================================================
 * DAY 13: COMPOUND COMPONENT PATTERN — Tab System
 * ============================================================
 * Compound components: a group of components that work TOGETHER
 * via shared Context, giving consumers a flexible, declarative API.
 *
 * USAGE (controlled mode):
 *   <Tabs activeTab={activeTab} onChange={setActiveTab}>
 *     <TabList>
 *       <Tab id="tab1">Tab 1</Tab>
 *       <Tab id="tab2">Tab 2</Tab>
 *     </TabList>
 *     <TabPanels>
 *       <TabPanel id="tab1">Content 1</TabPanel>
 *       <TabPanel id="tab2" lazy>Content 2 (lazy loaded)</TabPanel>
 *     </TabPanels>
 *   </Tabs>
 *
 * USAGE (uncontrolled mode — manages its own state):
 *   <Tabs defaultTab="tab1">
 *     ...
 *   </Tabs>
 *
 * KEY PATTERNS:
 *  1. Context API       — shares state between compound parts
 *  2. Controlled vs Uncontrolled — flexible API like native <input>
 *  3. Keyboard navigation — ArrowLeft/Right/Home/End/Enter
 *  4. Lazy panels       — don't mount until first active
 *  5. Context splitting — prevents unnecessary re-renders
 */

import React, {
  createContext, useContext, useState, useRef, useEffect,
  useCallback, useMemo, ReactNode, KeyboardEvent,
} from "react";

// ─── CONTEXT SPLIT ────────────────────────────────────────
// GOTCHA: If you put ALL state in one context, EVERY consumer
// re-renders when ANY part changes. Split into read vs write!

interface TabsState {
  activeTab: string;
  registeredTabs: string[]; // Order matters for keyboard nav
}

interface TabsActions {
  setActiveTab: (id: string) => void;
  registerTab: (id: string) => void;
}

// Two separate contexts → components only subscribe to what they need
const TabsStateContext = createContext<TabsState | null>(null);
const TabsActionsContext = createContext<TabsActions | null>(null);

// Custom hooks with helpful error messages
function useTabsState(): TabsState {
  const ctx = useContext(TabsStateContext);
  if (!ctx) throw new Error("useTabsState must be used inside <Tabs>");
  return ctx;
}

function useTabsActions(): TabsActions {
  const ctx = useContext(TabsActionsContext);
  if (!ctx) throw new Error("useTabsActions must be used inside <Tabs>");
  return ctx;
}

// ─── TABS (root compound component) ───────────────────────
interface TabsProps {
  children: ReactNode;
  // CONTROLLED MODE: parent manages activeTab
  activeTab?: string;
  onChange?: (tabId: string) => void;
  // UNCONTROLLED MODE: Tabs manages its own state
  defaultTab?: string;
}

export function Tabs({ children, activeTab: controlledTab, onChange, defaultTab }: TabsProps) {
  const isControlled = controlledTab !== undefined;

  // Internal state for uncontrolled mode
  const [internalTab, setInternalTab] = useState(defaultTab ?? "");
  const [registeredTabs, setRegisteredTabs] = useState<string[]>([]);

  // Determine the active tab based on mode
  const activeTab = isControlled ? controlledTab : internalTab;

  const setActiveTab = useCallback((id: string) => {
    if (isControlled) {
      onChange?.(id); // Delegate to parent in controlled mode
    } else {
      setInternalTab(id);
      onChange?.(id);
    }
  }, [isControlled, onChange]);

  // registerTab: called by each <Tab> on mount to track order
  const registerTab = useCallback((id: string) => {
    setRegisteredTabs(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      // Auto-select first tab if nothing is selected
      if (!activeTab) setActiveTab(next[0]!);
      return next;
    });
  }, [activeTab, setActiveTab]);

  // Memoize context values to prevent unnecessary re-renders
  const stateValue = useMemo<TabsState>(
    () => ({ activeTab, registeredTabs }),
    [activeTab, registeredTabs]
  );
  const actionsValue = useMemo<TabsActions>(
    () => ({ setActiveTab, registerTab }),
    [setActiveTab, registerTab]
  );

  return (
    <TabsStateContext.Provider value={stateValue}>
      <TabsActionsContext.Provider value={actionsValue}>
        <div role="tabpanel" style={{ width: "100%" }}>
          {children}
        </div>
      </TabsActionsContext.Provider>
    </TabsStateContext.Provider>
  );
}

// ─── TABLIST ──────────────────────────────────────────────
// Contains all Tab triggers. Handles keyboard navigation.
export function TabList({ children }: { children: ReactNode }) {
  const { activeTab, registeredTabs } = useTabsState();
  const { setActiveTab } = useTabsActions();
  const listRef = useRef<HTMLDivElement>(null);

  // KEYBOARD NAVIGATION ──────────────────────────────────
  // ArrowRight/ArrowLeft navigate between tabs.
  // Home/End jump to first/last tab.
  // This is required for WCAG accessibility compliance.
  const handleKeyDown = (e: KeyboardEvent) => {
    const currentIdx = registeredTabs.indexOf(activeTab);
    let nextIdx = currentIdx;

    switch (e.key) {
      case "ArrowRight": nextIdx = (currentIdx + 1) % registeredTabs.length; break;
      case "ArrowLeft": nextIdx = (currentIdx - 1 + registeredTabs.length) % registeredTabs.length; break;
      case "Home": nextIdx = 0; break;
      case "End":  nextIdx = registeredTabs.length - 1; break;
      default: return;
    }

    e.preventDefault();
    const nextTab = registeredTabs[nextIdx]!;
    setActiveTab(nextTab);

    // Move focus to the newly active tab button
    const tabEl = listRef.current?.querySelector<HTMLButtonElement>(`[data-tabid="${nextTab}"]`);
    tabEl?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      style={{
        display: "flex", borderBottom: "2px solid #e2e8f0",
        marginBottom: 0, overflowX: "auto",
      }}
    >
      {children}
    </div>
  );
}

// ─── TAB ──────────────────────────────────────────────────
interface TabProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

export function Tab({ id, children, disabled = false }: TabProps) {
  const { activeTab } = useTabsState();
  const { setActiveTab, registerTab } = useTabsActions();
  const isActive = activeTab === id;

  // Register this tab with the parent on mount
  useEffect(() => { registerTab(id); }, [id, registerTab]);

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      id={`tab-${id}`}
      data-tabid={id}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(id)}
      tabIndex={isActive ? 0 : -1} // Only active tab in natural tab order
      style={{
        padding: "10px 20px",
        border: "none",
        background: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        borderBottom: isActive ? "2px solid #4299e1" : "2px solid transparent",
        marginBottom: -2,
        color: disabled ? "#a0aec0" : isActive ? "#4299e1" : "#718096",
        fontWeight: isActive ? 700 : 400,
        fontSize: 14,
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ─── TABPANELS ────────────────────────────────────────────
export function TabPanels({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: "16px 0" }}>
      {children}
    </div>
  );
}

// ─── TABPANEL ─────────────────────────────────────────────
interface TabPanelProps {
  id: string;
  children: ReactNode;
  lazy?: boolean; // Don't mount until first activated (saves render cost)
}

export function TabPanel({ id, children, lazy = false }: TabPanelProps) {
  const { activeTab } = useTabsState();
  const isActive = activeTab === id;
  const hasBeenActive = useRef(false);

  if (isActive) hasBeenActive.current = true;

  // Lazy: don't render until this panel has been visited at least once
  if (lazy && !hasBeenActive.current) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={!isActive}
      // hidden attribute hides from screen readers too — accessible!
    >
      {children}
    </div>
  );
}

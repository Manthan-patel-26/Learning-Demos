# Day 13: Advanced React Patterns

**Date:** February 27, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build

A compound component Tab system with keyboard navigation, lazy panels, HOC for loading states, render props vs custom hooks, and split Context for performance.

## 🚀 How to Run

```bash
cd frontend && npm install && npm start
cd backend && npm install && npm run dev
```

## 📁 Key Files

```
frontend/src/components/
├── Tabs.tsx      ← Compound component: Tabs, TabList, Tab, TabPanels, TabPanel
└── patterns.tsx  ← withLoadingState HOC, MouseTracker render prop, useMousePosition hook, ThemeProvider
```

## 📖 Pattern Comparison

### When to use each pattern:

| Pattern                 | Use When                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Compound Components** | Building a family of components that share implicit state (like Select/Option)    |
| **HOC**                 | Need to wrap many components with the same cross-cutting behavior (auth, logging) |
| **Render Props**        | Need to share stateful logic but give consumer full control of the UI             |
| **Custom Hook**         | Sharing stateful logic (replaces render props in modern React)                    |
| **Context**             | Sharing state that many components at different nesting levels need               |

## ⚠️ Gotchas

### Context reference equality

```typescript
// ❌ New object every render → all consumers re-render!
<ThemeContext.Provider value={{ theme, toggleTheme }}>

// ✅ Memoize the value
const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
<ThemeContext.Provider value={value}>
```

### HOC displayName (critical for debugging)

```typescript
function withAuth<T>(Component: ComponentType<T>) {
  const WithAuth = (props: T) => { ... };
  // Without this, React DevTools shows "Component" for all HOC-wrapped components!
  WithAuth.displayName = `withAuth(${Component.displayName ?? Component.name})`;
  return WithAuth;
}
```

### Compound components and React.Children

```typescript
// ❌ Avoid React.cloneElement for passing context — brittle, breaks with fragments
React.Children.map(
  children,
  (child) => React.cloneElement(child, { activeTab }), // Breaks if child is not a React element
);

// ✅ Use Context instead — works regardless of nesting depth
const { activeTab } = useTabsState(); // Any depth, no prop drilling
```

# Day 24: Error Boundaries & Error Handling

**Date:** March 16, 2026 | **Learning Time:** 2.5 hours

## 🎯 What You'll Build
Multi-level error boundary system with custom fallback UIs, error logging callback, retry mechanism, and a clear demo of what boundaries DO and DON'T catch.

## 🚀 How to Run
```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm start
```

## 📖 Error Boundary Rules

### Must be a Class Component
```typescript
// ✅ CORRECT — class component
class ErrorBoundary extends Component {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    logToSentry(error, info.componentStack);
  }
  render() {
    if (this.state.hasError) return <FallbackUI />;
    return this.props.children;
  }
}

// ❌ CANNOT do this in a function component (as of React 18)
function ErrorBoundary({ children }) {
  // No way to catch render errors in function components
}
```

### Placement Strategy
```
App
├── GlobalErrorBoundary          ← Catches everything (last resort)
│   ├── Router
│   │   ├── RouteErrorBoundary   ← Per-route isolation
│   │   │   ├── Sidebar
│   │   │   │   └── SidebarErrorBoundary  ← Widget isolation
│   │   │   └── Main
│   │   │       └── DataTable
```

### Granularity: The More Specific, the Better
```typescript
// ❌ One boundary for everything — entire app goes down on one error
<ErrorBoundary>
  <Header />
  <Sidebar />
  <Main />        ← If this crashes, Header and Sidebar disappear too
  <Footer />
</ErrorBoundary>

// ✅ Per-section boundaries — isolate failures
<Header />        ← Always visible
<ErrorBoundary>   ← Only Sidebar fails
  <Sidebar />
</ErrorBoundary>
<ErrorBoundary>   ← Only Main fails
  <Main />
</ErrorBoundary>
<Footer />        ← Always visible
```

## ⚠️ What Boundaries DO and DON'T Catch

| Error Source | Caught? | Fix |
|-------------|---------|-----|
| `throw` in render | ✅ Yes | Error boundary |
| `throw` in lifecycle | ✅ Yes | Error boundary |
| `throw` in constructor | ✅ Yes | Error boundary |
| `useEffect` async error | ❌ No | `try/catch` + `useState` |
| Event handler error | ❌ No | `try/catch` in handler |
| `setTimeout` callback | ❌ No | `try/catch` in callback |
| Errors IN the boundary | ❌ No | Parent boundary |

# Day 4: React Hooks Deep Dive

**Date:** February 16, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build

A custom hooks library: `useDebounce`, `useThrottle`, `usePrevious`, `usePerformanceMonitor`, `useLocalStorage`, `useAsync`.

## 🚀 How to Run

```bash
# Terminal 1 - Backend (search API)
cd backend && npm install && npm run dev

# Terminal 2 - Frontend
cd frontend && npm install && npm start
```

## 📁 Key Files

```
frontend/src/
├── hooks/index.ts  ← All 6 custom hooks with detailed comments
└── App.tsx         ← Interactive demo for each hook
```

## 📖 Key Concepts

### useDebounce vs useThrottle

```
useDebounce:  _____|     |_____  (waits for SILENCE, then fires once)
              input input input → fires after last input + delay

useThrottle:  _|___|___|_____|  (fires at REGULAR INTERVALS)
              fires immediately, then max once per interval
```

### usePrevious — The useRef Pattern

```typescript
// ❌ WRONG - causes extra render loop
function usePreviousWrong<T>(value: T) {
  const [prev, setPrev] = useState<T | undefined>(undefined);
  const [current, setCurrent] = useState(value);
  if (value !== current) {
    setPrev(current);
    setCurrent(value);
  }
  return prev;
}

// ✅ CORRECT - useRef doesn't trigger re-renders
function usePrevious<T>(value: T) {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }); // After render!
  return ref.current; // Returns PREVIOUS render's value
}
```

### useReducer vs useState

Use `useReducer` when:

- State has multiple sub-values that update together
- Next state depends on the current state in complex ways
- You want to enforce valid state transitions (like a state machine)

```typescript
// useState gets messy with 5+ related values:
const [count, setCount] = useState(0);
const [min, setMin] = useState(-5);
const [max, setMax] = useState(10);
// Every update needs to check all the others...

// useReducer: all logic in one place, easier to test
const [state, dispatch] = useReducer(counterReducer, initialState);
dispatch({ type: "INCREMENT" }); // Reducer handles all the checks
```

### useMemo / useCallback — When to Actually Use Them

```typescript
// ✅ Use useMemo: expensive calculation, called on every render
const result = useMemo(() => heavyCalc(data), [data]);

// ✅ Use useCallback: function passed to child component or dependency array
const handleClick = useCallback(() => doSomething(id), [id]);

// ❌ Don't memoize everything — it adds overhead!
// Adding useMemo/useCallback has a cost. Only use if you can measure the benefit.
```

## ⚠️ Common Gotchas

### 1. Rules of Hooks (NEVER violate these)

```typescript
// ❌ NEVER call hooks conditionally
if (condition) {
  const [x] = useState(0);
}

// ❌ NEVER call hooks in loops
for (let i = 0; i < 3; i++) {
  useEffect(() => {}, []);
}

// ❌ NEVER call hooks in nested functions
function inner() {
  const [x] = useState(0);
}

// ✅ ALWAYS call hooks at the top level of your component/hook
```

### 2. Missing useEffect Dependencies

```typescript
// ❌ BAD - fetchData is in the effect but not in deps
useEffect(() => {
  fetchData(userId);
}, []); // ESLint will warn!

// ✅ GOOD
useEffect(() => {
  fetchData(userId);
}, [userId, fetchData]);
```

### 3. Memory Leak Prevention

```typescript
// ❌ Can cause "setState on unmounted component"
useEffect(() => {
  fetchData().then((data) => setState(data)); // No cleanup!
}, []);

// ✅ Track mounted status
useEffect(() => {
  let isMounted = true;
  fetchData().then((data) => {
    if (isMounted) setState(data);
  });
  return () => {
    isMounted = false;
  }; // Cleanup!
}, []);
```

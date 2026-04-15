/**
 * ============================================================
 * DAY 4: CUSTOM HOOKS LIBRARY
 * ============================================================
 * All hooks are typed, production-ready, and heavily commented.
 *
 * Hooks included:
 *  1. useDebounce       - Delay a value update
 *  2. useThrottle       - Limit how often a value updates
 *  3. usePrevious       - Track the previous value of any state
 *  4. usePerformanceMonitor - Track render count & timing
 *  5. useLocalStorage   - Persist state to localStorage
 *  6. useAsync          - Handle async operations with status
 */

import { useState, useEffect, useRef, useCallback, useReducer } from "react";

// ─────────────────────────────────────────────
// 1. useDebounce
//    Delays updating the returned value until
//    the input hasn't changed for `delay` ms.
//    Use case: search inputs — don't fire API on
//    every keystroke, only after user stops typing.
// ─────────────────────────────────────────────

/**
 * @param value  The value to debounce (any type T)
 * @param delay  Milliseconds to wait (default: 500ms)
 * @returns      The debounced value — only updates after delay
 *
 * Example:
 *   const [search, setSearch] = useState("");
 *   const debouncedSearch = useDebounce(search, 500);
 *   useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timer to update the debounced value after `delay` ms
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // CLEANUP FUNCTION: runs when `value` or `delay` changes (before next effect)
    // This cancels the previous timer, effectively restarting the countdown
    // This is the key mechanism of debouncing!
    return () => {
      clearTimeout(timer);
    };
    // Re-run this effect whenever value or delay changes
  }, [value, delay]);

  return debouncedValue;
}

// ─────────────────────────────────────────────
// 2. useThrottle
//    Limits how often the value can update.
//    Unlike debounce (waits for silence), throttle
//    guarantees updates at regular intervals.
//    Use case: scroll handlers, resize events,
//    mouse move tracking — fire max once per interval.
// ─────────────────────────────────────────────

/**
 * @param value    The value to throttle
 * @param interval Minimum ms between updates (default: 200ms)
 * @returns        The throttled value
 */
export function useThrottle<T>(value: T, interval = 200): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  // useRef stores mutable values WITHOUT causing re-renders
  // Perfect for tracking the last update time
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      // Enough time has passed — update immediately
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      // Too soon — schedule update for when the interval completes
      const remainingTime = interval - timeSinceLastUpdate;
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, remainingTime);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

// ─────────────────────────────────────────────
// 3. usePrevious
//    Returns the PREVIOUS render's value.
//    Use case: animate between values, compare
//    old vs new data, undo functionality.
//
//    GOTCHA: The common mistake is using useState
//    for this — it causes an extra render.
//    useRef is the correct pattern because it
//    stores a value without triggering re-renders.
// ─────────────────────────────────────────────

/**
 * @param value  Any value to track
 * @returns      The value from the PREVIOUS render (undefined on first render)
 *
 * HOW IT WORKS:
 *   Render 1: ref.current = undefined → hook returns undefined → effect sets ref = value1
 *   Render 2: ref.current = value1   → hook returns value1   → effect sets ref = value2
 *   Render 3: ref.current = value2   → hook returns value2   → etc.
 */
export function usePrevious<T>(value: T): T | undefined {
  // useRef<T | undefined> — starts undefined, never triggers re-render
  const ref = useRef<T | undefined>(undefined);

  // useEffect runs AFTER the render, so during this render,
  // ref.current still holds the PREVIOUS value
  useEffect(() => {
    ref.current = value; // Update AFTER render completes
  });

  return ref.current; // Return the value from BEFORE this render
}

// ─────────────────────────────────────────────
// 4. usePerformanceMonitor (The Challenge!)
//    Tracks render count, render duration, and
//    logs warnings for slow components.
// ─────────────────────────────────────────────

export interface PerformanceMetrics {
  renderCount: number; // How many times the component re-rendered
  lastRenderTime: number; // Duration of the most recent render (ms)
  averageRenderTime: number; // Average render duration across all renders
  isSlow: boolean; // true if lastRenderTime > threshold
}

/**
 * @param componentName  Label for console logs
 * @param slowThreshold  Log a warning if render takes longer than this (ms, default: 16ms = 60fps)
 * @returns PerformanceMetrics — live stats about this component
 */
export function usePerformanceMonitor(
  componentName: string,
  slowThreshold = 16,
): PerformanceMetrics {
  // useRef for render count — doesn't trigger re-render when incremented
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  // Record start time at the TOP of the function (before hooks)
  // This is as close to "start of render" as we can get
  const renderStart = useRef(performance.now());

  // Force re-render to show updated metrics in UI
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // This runs synchronously after every render — captures render end time
  useEffect(() => {
    const renderEnd = performance.now();
    const duration = renderEnd - renderStart.current;

    renderCount.current += 1;
    renderTimes.current.push(duration);

    // Keep only last 50 renders for rolling average
    if (renderTimes.current.length > 50) {
      renderTimes.current.shift();
    }

    // Warn about slow renders
    if (duration > slowThreshold) {
      console.warn(
        `[Performance] ${componentName} render #${renderCount.current} took ${duration.toFixed(2)}ms (threshold: ${slowThreshold}ms)`,
      );
    }

    // Reset for next render
    renderStart.current = performance.now();
    forceUpdate();
  });

  const times = renderTimes.current;
  const averageRenderTime =
    times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const lastRenderTime = times[times.length - 1] ?? 0;

  return {
    renderCount: renderCount.current,
    lastRenderTime,
    averageRenderTime,
    isSlow: lastRenderTime > slowThreshold,
  };
}

// ─────────────────────────────────────────────
// 5. useLocalStorage
//    useState that persists to localStorage.
//    Survives page refreshes!
//    Use case: user preferences, theme, last search
// ─────────────────────────────────────────────

/**
 * @param key           localStorage key
 * @param initialValue  Default value if nothing stored yet
 * @returns             [value, setValue] — same API as useState!
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize from localStorage (or use initialValue if not found/parse error)
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      // JSON.parse handles all types: strings, objects, arrays, numbers
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      // If localStorage is unavailable or JSON is corrupt, use initial value
      console.warn(`useLocalStorage: Could not read key "${key}"`);
      return initialValue;
    }
  });

  // Wrap setValue to also persist to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Support functional updates like useState: setValue(prev => prev + 1)
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch {
        console.warn(`useLocalStorage: Could not write key "${key}"`);
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue];
}

// ─────────────────────────────────────────────
// 6. useAsync
//    Wraps any async function and gives you
//    status, data, and error states automatically.
//    Use case: data fetching, form submission,
//    any async operation.
//
//    GOTCHA: useEffect cleanup prevents setState
//    on unmounted components (memory leak).
// ─────────────────────────────────────────────

type AsyncStatus = "idle" | "loading" | "success" | "error";

interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = false, // Run on mount if true
): AsyncState<T> & { execute: () => Promise<void> } {
  const [state, setState] = useState<AsyncState<T>>({
    status: "idle",
    data: null,
    error: null,
  });

  // useRef to track if component is still mounted
  // CRITICAL: Prevents "Can't perform a React state update on unmounted component"
  const isMounted = useRef(true);

  const execute = useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await asyncFunction();
      // Only update state if component is still mounted!
      if (isMounted.current) {
        setState({ status: "success", data, error: null });
      }
    } catch (error) {
      if (isMounted.current) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setState({ status: "error", data: null, error: message });
      }
    }
  }, [asyncFunction]);

  // Cleanup: mark as unmounted when component is removed
  useEffect(() => {
    isMounted.current = true;
    if (immediate) execute();
    return () => {
      isMounted.current = false; // Cleanup! Prevents memory leaks.
    };
  }, [execute, immediate]);

  return { ...state, execute };
}

// src/hooks/useDebounce.ts
// Custom debounce hook for React.
//
// ════════════════════════════════════════════════════════════════════
// DEBOUNCE vs THROTTLE - when to use each:
//
//  DEBOUNCE: "Wait until the user STOPS doing something, THEN act."
//    ✓ Search autocomplete (wait for typing pause)
//    ✓ Form validation (wait until user finishes field)
//    ✓ Window resize handler
//    ✗ NOT for scroll events (use throttle)
//
//  THROTTLE: "Act at most once every N milliseconds."
//    ✓ Scroll event handlers (60fps = every 16ms)
//    ✓ Mouse move tracking
//    ✓ Game loop updates
//    ✗ NOT for search (first keystroke fires immediately, looks wrong)
//
//  TRAILING vs LEADING edge:
//    Trailing (default): fires AFTER the pause → good for search
//    Leading: fires IMMEDIATELY, then ignores until pause → good for button clicks
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of a value.
 * The returned value only updates after `delay` ms of no changes to `value`.
 *
 * STALE CLOSURE GOTCHA (common React bug):
 * If you debounce a function inside useEffect without this pattern,
 * the function captures stale state from its closure.
 *
 * Solution: debounce the VALUE, not the function. The component
 * reads current state inside the effect that fires on the debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timer to update the debounced value after `delay` ms
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // CRITICAL: Clear the timer on cleanup.
    // If `value` changes before `delay` ms, this cleanup runs FIRST,
    // cancelling the previous timer. A new timer starts with the new value.
    // This is what creates the "wait until stopped typing" behavior.
    return () => clearTimeout(timer);

    // Note: `delay` is intentionally excluded from deps.
    // Changing delay mid-session would cause jitter. Treat it as stable config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return debouncedValue;
}

/**
 * Returns a debounced callback function (leading-edge version).
 * Fires immediately on first call, then ignores calls for `delay` ms.
 *
 * USE CASE: Button clicks where you want instant feedback but prevent
 * double-submissions. The function fires right away, not after a delay.
 */
export function useLeadingDebounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): T {
  const [isLocked, setIsLocked] = useState(false);

  return ((...args: Parameters<T>) => {
    if (isLocked) return; // Ignore calls during lock period

    fn(...args);           // Fire immediately
    setIsLocked(true);

    setTimeout(() => setIsLocked(false), delay);
  }) as T;
}

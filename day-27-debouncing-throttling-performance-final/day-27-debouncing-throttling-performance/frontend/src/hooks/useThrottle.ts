// src/hooks/useThrottle.ts
// Custom throttle hook — limits a value to update at most once per `interval` ms.
//
// THROTTLE with requestAnimationFrame:
// For scroll/animation handlers, prefer rAF over setTimeout.
// rAF syncs to the display refresh rate (usually 60fps = 16ms),
// ensuring smooth animations without wasted renders.

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Returns a throttled version of a value.
 * The returned value updates at most once every `interval` ms.
 *
 * Unlike debounce (waits for pause), throttle fires on a fixed schedule
 * even while the source value keeps changing.
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      // Enough time has passed — update immediately
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      // Too soon — schedule an update at the end of the interval
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * Returns a throttled callback using requestAnimationFrame.
 * Best for scroll handlers, mouse move, canvas drawing, etc.
 * Automatically syncs to the display refresh rate.
 */
export function useRafThrottle<T extends (...args: Parameters<T>) => void>(fn: T): T {
  const rafId = useRef<number | null>(null);
  const fnRef = useRef(fn);

  // Keep fnRef current so we always call the latest version of fn
  useEffect(() => { fnRef.current = fn; });

  return useCallback((...args: Parameters<T>) => {
    // If a frame is already queued, cancel it (we'll queue a new one with latest args)
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      fnRef.current(...args);
    });
  }, []) as T;
}

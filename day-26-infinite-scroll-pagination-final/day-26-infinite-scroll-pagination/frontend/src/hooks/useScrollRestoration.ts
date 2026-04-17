// src/hooks/useScrollRestoration.ts
// Saves and restores scroll position when the user navigates back.
//
// PROBLEM: When using infinite scroll, if a user:
//   1. Scrolls down to item 80
//   2. Clicks on a product to view details
//   3. Clicks "Back"
//
// The browser would normally reset to the top. This hook saves the
// scroll position and restores it after the component re-mounts.
//
// APPROACH: Store scroll position in sessionStorage (persists within tab session,
// cleared when tab closes - appropriate for scroll position).

import { useEffect, useRef } from 'react';

export function useScrollRestoration(key: string) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Save scroll position before unmounting
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Restore scroll position on mount
    const saved = sessionStorage.getItem(`scroll:${key}`);
    if (saved) {
      // Use requestAnimationFrame to ensure the DOM has rendered
      // before scrolling (otherwise the content may not be tall enough yet)
      requestAnimationFrame(() => {
        container.scrollTop = parseInt(saved, 10);
      });
    }

    // Save scroll position when user scrolls
    const handleScroll = () => {
      sessionStorage.setItem(`scroll:${key}`, String(container.scrollTop));
    };

    // Use passive listener for scroll - this is a performance hint to the browser
    // that we won't call preventDefault(), allowing scroll optimization
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [key]);

  return containerRef;
}

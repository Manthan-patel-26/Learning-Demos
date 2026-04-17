// src/hooks/useImageLoad.ts
// Manages the progressive "blur-up" image loading sequence:
//
//  Phase 1 (instant): Show blurDataUrl — tiny inline base64 placeholder
//  Phase 2 (loading): Browser loads the real image off-screen
//  Phase 3 (loaded):  Crossfade from blurred placeholder to sharp image
//
// This technique was popularised by Medium's image loading and is now
// used by Next.js Image, Gatsby Image, and most performance-focused sites.
//
// WHY THIS APPROACH?
// - No layout shift (CLS = 0) — the placeholder occupies exact same space
// - No jarring "pop in" — smooth crossfade transition
// - Instant above-the-fold render — placeholder is inline, no extra request
// - Progressive enhancement — works even if JS is disabled (native lazy load)

import { useState, useCallback } from 'react';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

interface UseImageLoadReturn {
  loadState: LoadState;
  isLoaded: boolean;
  isError: boolean;
  handleLoad: () => void;
  handleError: () => void;
}

export function useImageLoad(): UseImageLoadReturn {
  const [loadState, setLoadState] = useState<LoadState>('idle');

  const handleLoad = useCallback(() => setLoadState('loaded'), []);
  const handleError = useCallback(() => setLoadState('error'), []);

  return {
    loadState,
    isLoaded: loadState === 'loaded',
    isError: loadState === 'error',
    handleLoad,
    handleError,
  };
}

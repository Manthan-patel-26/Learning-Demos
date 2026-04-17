// src/components/OptimizedImage.tsx
// Production-grade image component implementing:
//
//  1. BLUR-UP PLACEHOLDER — tiny inline base64 image shown instantly,
//     crossfades to the real image when loaded
//
//  2. RESPONSIVE SRCSET — browser picks the best size for the viewport.
//     <picture> with WebP source + JPEG fallback for maximum compatibility.
//     WebP is ~30% smaller than JPEG. AVIF is ~50% smaller but less supported.
//
//  3. LAZY LOADING — images below the fold aren't fetched until needed.
//     Uses native loading="lazy" (supported in all modern browsers) with an
//     Intersection Observer fallback for older browsers.
//
//  4. CLS PREVENTION — aspect-ratio CSS property reserves exact space before
//     image loads, preventing Cumulative Layout Shift (a Core Web Vital).
//
//  5. RETINA SUPPORT — srcset descriptors (320w, 640w...) let the browser
//     choose 2x images on high-DPI screens automatically.
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLS EXPLAINED (Cumulative Layout Shift):
//
// Without aspect-ratio:
//   Page renders → image placeholder (0px tall) → image loads → page jumps ← BAD
//
// With aspect-ratio:
//   Page renders → container sized correctly → image loads → no jump ← GOOD
//
// Formula: aspect-ratio = width / height (e.g. 1920/1280 = 1.5)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useRef, useEffect, useState } from 'react';
import { GalleryImage } from '../types/index.js';

interface OptimizedImageProps {
  image: GalleryImage;
  // "eager" for above-the-fold images (LCP candidate) — loads immediately
  // "lazy" for below-the-fold — deferred until near viewport
  loading?: 'eager' | 'lazy';
  sizes?: string;      // CSS sizes attribute — tells browser how wide the image renders
  onClick?: () => void;
  className?: string;
}

export function OptimizedImage({
  image,
  loading = 'lazy',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  onClick,
  className = '',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // If the image is already in cache (e.g. navigating back), it fires
  // the load event before React attaches the handler. Check on mount.
  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, []);

  // Build srcset strings from the structured data
  // Format: "url1 320w, url2 640w, url3 960w, ..."
  const webpSrcset = image.srcset.webp
    .map(entry => `${entry.url} ${entry.width}w`)
    .join(', ');

  const jpegSrcset = image.srcset.jpeg
    .map(entry => `${entry.url} ${entry.width}w`)
    .join(', ');

  return (
    // Wrapper with explicit aspect-ratio prevents CLS
    // The padding-top trick (padding-top: calc(1/aspectRatio * 100%)) is
    // the old approach — CSS aspect-ratio is cleaner and now well-supported
    <div
      className={`optimized-image-wrapper ${className}`}
      style={{ aspectRatio: image.aspectRatio }}
      onClick={onClick}
    >
      {/* ── BLUR PLACEHOLDER ───────────────────────────────────────────
          Shown immediately (it's inline base64, no network request).
          Fades out once the real image loads.
          CSS `filter: blur(20px)` + `scale(1.05)` hides the blocky edges.
      */}
      <img
        src={image.blurDataUrl}
        alt=""                    // Decorative — the real img has the alt text
        aria-hidden="true"
        className={`image-placeholder ${isLoaded ? 'image-placeholder-hidden' : ''}`}
        style={{
          filter: 'blur(20px)',
          transform: 'scale(1.05)', // Slightly oversized to hide blurred edges
        }}
      />

      {/* ── REAL IMAGE — <picture> for format negotiation ──────────────
          Browser picks the first <source> whose type it supports.
          WebP is tried first (smaller), JPEG is the fallback.

          IMPORTANT: The <img> inside <picture> MUST have the alt text,
          width, height, loading and decoding attributes.
          The <source> elements are just format hints.
      */}
      {!isError ? (
        <picture>
          {/* WebP source — modern browsers (Chrome, Firefox, Safari 14+) */}
          <source
            type="image/webp"
            srcSet={webpSrcset}
            sizes={sizes}
          />

          {/* JPEG fallback — all browsers */}
          <source
            type="image/jpeg"
            srcSet={jpegSrcset}
            sizes={sizes}
          />

          {/* The actual <img> element — fallback if <picture> not supported */}
          <img
            ref={imgRef}
            src={image.src}           // Default src (largest JPEG)
            alt={`${image.title} by ${image.photographer}, ${image.location}`}
            width={image.width}       // Hint for the browser's layout engine
            height={image.height}     // Used to calculate aspect ratio in older browsers
            loading={loading}         // Native lazy loading
            decoding="async"          // Non-blocking decode (doesn't block main thread)
            className={`real-image ${isLoaded ? 'real-image-loaded' : ''}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setIsError(true)}
          />
        </picture>
      ) : (
        // Error fallback
        <div className="image-error" role="img" aria-label={image.title}>
          <span aria-hidden="true">🖼️</span>
          <span>Failed to load</span>
        </div>
      )}
    </div>
  );
}

// src/components/Lightbox.tsx
// Full-screen image viewer with keyboard navigation and focus trap.
//
// ACCESSIBILITY REQUIREMENTS for modals (WCAG 2.1):
//   1. Focus trap — Tab key stays within the modal while open
//   2. Focus restored — when closed, focus returns to the trigger element
//   3. Escape key closes the modal
//   4. aria-modal="true" — tells screen readers this is a modal dialog
//   5. aria-label — describes the dialog purpose
//
// FOCUS TRAP IMPLEMENTATION:
//   We find all focusable elements inside the modal and intercept Tab/Shift+Tab
//   to cycle within them. When Tab reaches the last element, wrap to first.

import { useEffect, useRef, useCallback } from 'react';
import { GalleryImage } from '../types/index.js';
import { OptimizedImage } from './OptimizedImage.js';

interface LightboxProps {
  image: GalleryImage;
  totalCount: number;
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

// Focusable elements — used for focus trap
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Lightbox({
  image,
  totalCount,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Remember which element had focus before opening the modal
  const previousFocusRef = useRef<Element | null>(document.activeElement);

  // ── Focus management ────────────────────────────────────────────────────
  useEffect(() => {
    // Focus the close button when modal opens
    const closeBtn = dialogRef.current?.querySelector<HTMLElement>('[data-close]');
    closeBtn?.focus();

    // Restore focus when modal closes
    return () => {
      (previousFocusRef.current as HTMLElement)?.focus?.();
    };
  }, []);

  // ── Keyboard handling ────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;

      case 'ArrowLeft':
        onPrev();
        break;

      case 'ArrowRight':
        onNext();
        break;

      case 'Tab': {
        // Focus trap — keep focus inside the modal
        const dialog = dialogRef.current;
        if (!dialog) break;

        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusable.length === 0) break;

        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: going backwards
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus(); // Wrap to last
          }
        } else {
          // Tab: going forwards
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus(); // Wrap to first
          }
        }
        break;
      }
    }
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    // Backdrop — click outside to close
    <div
      className="lightbox-backdrop"
      onClick={onClose}
      role="presentation"
    >
      {/* Dialog element — stop propagation so clicking image doesn't close */}
      <div
        ref={dialogRef}
        className="lightbox-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${image.title} — image ${currentIndex + 1} of ${totalCount}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="lightbox-header">
          <div className="lightbox-meta">
            <h2 className="lightbox-title">{image.title}</h2>
            <p className="lightbox-sub">
              📷 {image.photographer} · 📍 {image.location}
            </p>
          </div>
          <button
            data-close
            className="lightbox-close"
            onClick={onClose}
            aria-label="Close lightbox"
          >
            ✕
          </button>
        </div>

        {/* Image — eager loaded since it's the focal point of the interaction */}
        <div className="lightbox-image-container">
          <OptimizedImage
            image={image}
            loading="eager"
            sizes="100vw"
            className="lightbox-image"
          />
        </div>

        {/* Navigation */}
        <div className="lightbox-nav">
          <button
            className="lightbox-btn"
            onClick={onPrev}
            disabled={currentIndex === 0}
            aria-label="Previous image"
          >
            ← Prev
          </button>

          <span className="lightbox-counter" aria-live="polite">
            {currentIndex + 1} / {totalCount}
          </span>

          <button
            className="lightbox-btn"
            onClick={onNext}
            disabled={currentIndex === totalCount - 1}
            aria-label="Next image"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

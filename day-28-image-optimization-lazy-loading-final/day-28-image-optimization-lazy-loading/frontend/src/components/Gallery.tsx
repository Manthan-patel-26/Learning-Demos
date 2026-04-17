// src/components/Gallery.tsx
// The main gallery grid that ties everything together.
// Above-the-fold images use loading="eager" for LCP optimization.
// All others use loading="lazy".

import { useState, useEffect } from 'react';
import { GalleryImage } from '../types/index.js';
import { OptimizedImage } from './OptimizedImage.js';
import { Lightbox } from './Lightbox.js';

const API_BASE = '/api';

export function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await fetch(`${API_BASE}/images`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { data: GalleryImage[] };
        setImages(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load gallery');
      } finally {
        setIsLoading(false);
      }
    };
    fetchGallery();
  }, []);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex(i => (i !== null && i > 0 ? i - 1 : i));
  const nextImage = () => setLightboxIndex(i => (i !== null && i < images.length - 1 ? i + 1 : i));

  if (isLoading) return (
    <div className="gallery-loading" role="status" aria-live="polite">
      <div className="gallery-grid skeleton-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton-card skeleton-pulse" style={{ aspectRatio: i % 3 === 0 ? '4/3' : i % 3 === 1 ? '1' : '3/4' }} />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="gallery-error" role="alert">
      <p>⚠️ {error}</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  return (
    <>
      <div className="gallery-grid" role="list">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="gallery-item"
            role="listitem"
          >
            {/* First 4 images are likely above the fold — load eagerly for LCP */}
            <OptimizedImage
              image={image}
              loading={index < 4 ? 'eager' : 'lazy'}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onClick={() => openLightbox(index)}
              className="gallery-image"
            />

            {/* Caption overlay */}
            <div className="gallery-caption" aria-hidden="true">
              <p className="caption-title">{image.title}</p>
              <p className="caption-location">📍 {image.location}</p>
            </div>

            {/* Screen-reader accessible button for keyboard users */}
            <button
              className="gallery-item-btn"
              onClick={() => openLightbox(index)}
              aria-label={`View ${image.title} by ${image.photographer} in full screen`}
            >
              <span className="sr-only">Open {image.title}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Lightbox portal */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <Lightbox
          image={images[lightboxIndex]}
          totalCount={images.length}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </>
  );
}

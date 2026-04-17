// src/components/SkeletonCard.tsx
// Skeleton loading placeholder for product cards.
//
// WHY SKELETONS vs SPINNERS?
// - Skeletons show the shape of content before it loads (reduces perceived wait time)
// - Users understand the layout before data arrives (less jarring transition)
// - Studies show skeletons feel faster than spinners even at the same load time
//
// ACCESSIBILITY: aria-hidden="true" so screen readers don't announce empty content.
// The loading state is announced via aria-live on the parent container instead.

interface SkeletonCardProps {
  count?: number;
}

export function SkeletonCard({ count = 1 }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="product-card skeleton-card"
          aria-hidden="true"
          role="presentation"
        >
          {/* Image placeholder */}
          <div className="skeleton-image skeleton-pulse" />

          <div className="product-info">
            {/* Title placeholder - shorter width looks more realistic */}
            <div className="skeleton-line skeleton-pulse" style={{ width: '80%', height: '20px' }} />
            {/* Description placeholder - two lines */}
            <div className="skeleton-line skeleton-pulse" style={{ width: '100%', height: '14px', marginTop: '8px' }} />
            <div className="skeleton-line skeleton-pulse" style={{ width: '70%', height: '14px', marginTop: '4px' }} />
            {/* Rating placeholder */}
            <div className="skeleton-line skeleton-pulse" style={{ width: '40%', height: '16px', marginTop: '12px' }} />
            {/* Price placeholder */}
            <div className="skeleton-line skeleton-pulse" style={{ width: '30%', height: '24px', marginTop: '12px' }} />
          </div>
        </div>
      ))}
    </>
  );
}

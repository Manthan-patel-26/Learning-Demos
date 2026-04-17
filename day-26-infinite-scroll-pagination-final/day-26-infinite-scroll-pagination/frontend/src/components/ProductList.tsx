// src/components/ProductList.tsx
// The main product listing page with infinite scroll.
// Wires together the filters, product grid, skeleton loading, and sentinel.

import { useState } from 'react';
import { ProductCard } from './ProductCard.js';
import { SkeletonCard } from './SkeletonCard.js';
import { ProductFiltersBar } from './ProductFilters.js';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';
import { useScrollRestoration } from '../hooks/useScrollRestoration.js';
import { ProductFilters } from '../types/index.js';

export function ProductList() {
  const [filters, setFilters] = useState<ProductFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const {
    products,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    sentinelRef,
    refetch,
  } = useInfiniteScroll(filters);

  // Restore scroll position when navigating back
  const containerRef = useScrollRestoration('product-list');

  return (
    <div className="product-list-container" ref={containerRef}>
      <header className="page-header">
        <h1>Product Catalog</h1>
        <p className="product-count">
          {/* Showing count only when loaded to avoid layout shift */}
          {!isLoading && `Showing ${products.length} products`}
          {hasNextPage && ' (scroll for more)'}
        </p>
      </header>

      <ProductFiltersBar filters={filters} onChange={setFilters} />

      {/* 
        aria-live="polite" announces changes to screen readers
        "polite" = waits for user to be idle (vs "assertive" = interrupts immediately)
        Use "assertive" only for critical errors/alerts
      */}
      <div
        className="product-grid"
        role="feed"
        aria-busy={isLoading || isFetchingNextPage}
        aria-label="Product list"
      >
        {/* Initial loading state */}
        {isLoading && <SkeletonCard count={12} />}

        {/* Product cards */}
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}

        {/* Loading more skeletons shown at the bottom during pagination */}
        {isFetchingNextPage && <SkeletonCard count={4} />}
      </div>

      {/* 
        Error state with retry button
        aria-live="assertive" for errors so screen readers announce immediately
      */}
      {isError && (
        <div
          className="error-container"
          role="alert"
          aria-live="assertive"
        >
          <p className="error-message">
            ⚠️ Failed to load products: {error?.message}
          </p>
          <button onClick={() => refetch()} className="retry-btn">
            Try Again
          </button>
        </div>
      )}

      {/* 
        End of list message
        Important for accessibility - screen reader users need to know
        there's no more content to load
      */}
      {!hasNextPage && !isLoading && products.length > 0 && (
        <p className="end-of-list" role="status" aria-live="polite">
          ✓ All {products.length} products loaded
        </p>
      )}

      {/* Empty state */}
      {!isLoading && products.length === 0 && !isError && (
        <div className="empty-state" role="status">
          <p>No products found matching your filters.</p>
          <button
            onClick={() => setFilters({ sortBy: 'createdAt', sortOrder: 'desc' })}
            className="retry-btn"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/*
        SENTINEL ELEMENT - the key to infinite scroll!
        This invisible div sits at the bottom of the list.
        The IntersectionObserver in useInfiniteScroll watches it.
        When it enters the viewport → fetch next page.
        
        aria-hidden: this element has no semantic meaning for screen readers
      */}
      <div
        ref={sentinelRef}
        className="scroll-sentinel"
        aria-hidden="true"
        data-testid="scroll-sentinel"
      />
    </div>
  );
}

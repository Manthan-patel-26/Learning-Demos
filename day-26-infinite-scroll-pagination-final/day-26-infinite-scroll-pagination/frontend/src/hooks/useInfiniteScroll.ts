// src/hooks/useInfiniteScroll.ts
// Custom hook that combines Intersection Observer with React Query's
// useInfiniteQuery to implement infinite scroll.
//
// KEY CONCEPTS:
// 1. Intersection Observer: Browser API to detect when an element enters the viewport
//    - Much better than scroll event listeners (no performance overhead)
//    - Fires asynchronously, doesn't block the main thread
//    - The "sentinel" element is placed at the bottom of the list
//
// 2. useInfiniteQuery: React Query hook for paginated data
//    - Manages all pages of data in a flat list
//    - Handles loading states, errors, and refetching
//    - Provides `fetchNextPage` and `hasNextPage`

import { useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchProducts } from '../api/products.js';
import { Product, ProductFilters } from '../types/index.js';

const PAGE_SIZE = 12;

interface UseInfiniteScrollReturn {
  products: Product[];
  isLoading: boolean;       // True only on the very first load
  isFetchingNextPage: boolean;  // True when loading subsequent pages
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;  // Attach to the bottom sentinel element
  refetch: () => void;
}

export function useInfiniteScroll(filters: ProductFilters): UseInfiniteScrollReturn {
  // React Query manages all the fetching, caching, and state
  const {
    data,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    // Query key includes filters so changing filters invalidates the cache
    // and starts fresh - critical for correct behavior!
    queryKey: ['products', filters],

    queryFn: ({ pageParam }) =>
      fetchProducts(filters, pageParam as string | undefined, PAGE_SIZE),

    // Extract the cursor for the next page from the current page's response
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,

    initialPageParam: undefined as string | undefined,

    // Keep previous data while fetching new filters (better UX than showing blank screen)
    staleTime: 30_000, // Data is fresh for 30 seconds
  });

  // ── Intersection Observer Setup ───────────────────────────────────────────
  // The sentinel is an invisible div at the bottom of the product list.
  // When it enters the viewport, we fetch the next page.
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Memoize the callback to avoid recreating the observer on every render
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      // Only fetch if:
      // 1. The sentinel is visible
      // 2. There are more pages to load
      // 3. We're not already fetching
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersection, {
      // rootMargin: '200px' means start loading 200px before the sentinel is visible.
      // This creates a "pre-loading" effect so content is ready before the user
      // reaches the bottom.
      rootMargin: '200px',
      threshold: 0, // Fire as soon as ANY part of the sentinel is visible
    });

    observer.observe(sentinel);

    // IMPORTANT: Always clean up observers to prevent memory leaks
    return () => observer.disconnect();
  }, [handleIntersection]);

  // ── Flatten paginated data ────────────────────────────────────────────────
  // React Query stores data as pages: { pages: [page1, page2, ...] }
  // We flatten this into a single array for easy rendering
  const products = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    products,
    isLoading,
    isFetchingNextPage,
    isError,
    error: error as Error | null,
    hasNextPage: hasNextPage ?? false,
    sentinelRef,
    refetch,
  };
}

// src/types/index.ts
// Shared TypeScript types for the backend API.
// These types are used across routes, middleware, and utilities.

/**
 * Query parameters for cursor-based pagination.
 *
 * CURSOR vs OFFSET pagination:
 * - Offset: skip N records. Simple but slow on large datasets (DB must scan all skipped rows)
 *           Also has "page drift" - if items are added/deleted, pages shift
 * - Cursor: start after a specific record. O(log n) with index. Stable under mutations.
 *
 * We use a composite cursor (createdAt + id) to handle ties in timestamps.
 */
export interface PaginationQuery {
  cursor?: string;       // Opaque cursor string (base64 encoded internally)
  limit?: number;        // Items per page (default: 20, max: 100)
  category?: string;     // Optional filter by category
  search?: string;       // Optional full-text search
  sortBy?: 'price' | 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * The cursor payload (internal - not exposed to clients).
 * Encoded as base64 JSON to keep the API opaque.
 */
export interface CursorPayload {
  id: string;
  createdAt: string; // ISO string
}

/**
 * Paginated response envelope.
 * hasNextPage tells the client whether to keep scrolling.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null; // null means no more pages
    hasNextPage: boolean;
    limit: number;
    // Note: We intentionally omit totalCount for performance.
    // COUNT(*) on large tables is expensive. Use approximate counts if needed.
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

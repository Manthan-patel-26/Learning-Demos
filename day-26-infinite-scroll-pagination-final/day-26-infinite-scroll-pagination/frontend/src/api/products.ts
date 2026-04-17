// src/api/products.ts
// API client functions for fetching products.
// Centralizing API calls here makes it easy to:
//   1. Add auth headers in one place
//   2. Handle global error cases (401 redirect, network errors)
//   3. Mock the API in tests

import { Product, PaginatedResponse, Category, ProductFilters } from '../types/index.js';

const API_BASE = '/api'; // Proxied to http://localhost:3001 in development

/**
 * Builds a URL with query parameters, omitting undefined/empty values.
 */
function buildUrl(path: string, params: Record<string, string | undefined>): string {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

/**
 * Fetches a page of products.
 * The `cursor` param is undefined for the first page, then
 * comes from the previous page's `pagination.nextCursor`.
 */
export async function fetchProducts(
  filters: ProductFilters,
  cursor?: string,
  limit = 12
): Promise<PaginatedResponse<Product>> {
  const url = buildUrl(`${API_BASE}/products`, {
    cursor,
    limit: String(limit),
    category: filters.category,
    search: filters.search,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches all available product categories.
 */
export async function fetchCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE}/products/categories`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  const data = await response.json() as { data: Category[] };
  return data.data;
}

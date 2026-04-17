// src/types/index.ts
// Shared types between frontend and backend.
// In a monorepo setup, these would be in a shared package.

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  stock: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasNextPage: boolean;
    limit: number;
  };
}

export interface Category {
  name: string;
  count: number;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  sortBy?: 'price' | 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// src/types/index.ts
// Types that implement REST API best practices.

// ── HATEOAS Links ─────────────────────────────────────────────────────────
// Hypermedia As The Engine Of Application State.
// Each response includes links to related actions, so clients discover
// the API dynamically rather than hard-coding URLs.
// This is Level 3 of the Richardson Maturity Model (fully RESTful).
export interface HateoasLink {
  href: string;        // The URL
  rel: string;         // Relationship name: "self", "next", "create", "delete"
  method: HttpMethod;  // HTTP method for this action
  title?: string;      // Human-readable description
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ── Standard API Response Envelopes ──────────────────────────────────────
// Every response follows the same structure — predictable for clients.

export interface ApiResponse<T> {
  data: T;
  meta?: ResponseMeta;
  links?: HateoasLink[];
}

export interface ApiListResponse<T> {
  data: T[];
  meta: ListMeta;
  links: HateoasLink[];
}

export interface ResponseMeta {
  version: string;       // API version that served this response
  requestId: string;     // Unique ID for tracing/debugging
  deprecatedAt?: string; // ISO date — when this endpoint will be removed
  sunset?: string;       // ISO date — the exact removal date (RFC 8594)
}

export interface ListMeta extends ResponseMeta {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ── Standard Error Response ───────────────────────────────────────────────
// Consistent error format across ALL endpoints and ALL versions.
// Never expose stack traces or internal details in production.
export interface ApiError {
  error: {
    code: string;          // Machine-readable error code: "VALIDATION_ERROR"
    message: string;       // Human-readable description
    details?: ErrorDetail[]; // Field-level errors for validation
    requestId: string;     // Same requestId from the successful response format
    documentation?: string; // URL to error documentation
  };
}

export interface ErrorDetail {
  field: string;
  message: string;
  code: string;
}

// ── Domain Models ─────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  sku: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  sku: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  stock?: number;
}

// ── Deprecation Notice ────────────────────────────────────────────────────
// Tracks deprecated endpoints for the deprecation middleware
export interface DeprecationInfo {
  message: string;
  deprecatedAt: string;   // When deprecated
  sunsetAt: string;       // When it will be REMOVED
  successor?: string;     // URL of the replacement endpoint
}

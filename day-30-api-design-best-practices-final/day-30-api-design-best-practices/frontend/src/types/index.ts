// src/types/index.ts
export interface HateoasLink { href: string; rel: string; method: string; title?: string; }
export interface ResponseMeta { version: string; requestId: string; deprecatedAt?: string; sunset?: string; pagination?: PaginationMeta; }
export interface PaginationMeta { page: number; pageSize: number; totalItems: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean; }
export interface ApiResponse<T> { data: T; meta?: ResponseMeta; links?: HateoasLink[]; }
export interface ApiListResponse<T> { data: T[]; meta: ResponseMeta; links: HateoasLink[]; }
export interface ApiError { error: { code: string; message: string; details?: { field: string; message: string; code: string }[]; requestId: string; documentation?: string; }; }

export interface Product {
  id: string; name: string; description: string; price: number;
  category: string; stock: number; sku: string; createdAt: string; updatedAt: string;
}

export interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  ms: number;
  requestId: string;
  responseBody: unknown;
  responseHeaders: Record<string, string>;
}

// src/utils/response.ts
// Standardised response builders used by every route handler.
// Centralising here ensures ALL responses share the same shape —
// clients can always rely on { data, meta, links } structure.

import { Response } from 'express';
import { randomUUID } from 'crypto';
import {
  ApiResponse, ApiListResponse, ApiError,
  HateoasLink, ResponseMeta, ListMeta, ErrorDetail,
} from '../types/index.js';

const API_VERSION = process.env.API_VERSION ?? 'v1';
const API_BASE    = process.env.API_BASE_URL ?? 'http://localhost:3001';

// ── Meta builder ─────────────────────────────────────────────────────────

export function buildMeta(overrides?: Partial<ResponseMeta>): ResponseMeta {
  return {
    version: API_VERSION,
    requestId: randomUUID(),
    ...overrides,
  };
}

// ── HATEOAS link builders ─────────────────────────────────────────────────

/**
 * Builds a HATEOAS link with a full absolute URL.
 * Absolute URLs are preferred — clients don't need to know the base URL.
 */
export function link(
  rel: string,
  path: string,
  method: HateoasLink['method'] = 'GET',
  title?: string
): HateoasLink {
  return { rel, href: `${API_BASE}${path}`, method, title };
}

/**
 * Standard self-link — every resource should have one.
 * Allows clients to re-fetch or bookmark a specific resource.
 */
export function selfLink(path: string): HateoasLink {
  return link('self', path, 'GET');
}

// ── Response senders ──────────────────────────────────────────────────────

/**
 * Send a single-resource response.
 *
 * Usage:
 *   sendResource(res, 200, product, [selfLink('/v1/products/123'), ...])
 */
export function sendResource<T>(
  res: Response,
  status: number,
  data: T,
  links: HateoasLink[] = [],
  metaOverrides?: Partial<ResponseMeta>
): void {
  const body: ApiResponse<T> = {
    data,
    meta: buildMeta(metaOverrides),
    links,
  };
  res.status(status).json(body);
}

/**
 * Send a paginated list response.
 *
 * The links array always includes:
 *   - self   (current page)
 *   - first  (page 1)
 *   - last   (last page)
 *   - next   (if hasNextPage)
 *   - prev   (if hasPrevPage)
 *   - create (POST to create new resource)
 */
export function sendList<T>(
  res: Response,
  data: T[],
  pagination: ListMeta['pagination'],
  basePath: string,
  extraLinks: HateoasLink[] = [],
  metaOverrides?: Partial<ResponseMeta>
): void {
  const { page, pageSize, totalPages, hasNextPage, hasPrevPage } = pagination;

  const paginationLinks: HateoasLink[] = [
    selfLink(`${basePath}?page=${page}&pageSize=${pageSize}`),
    link('first', `${basePath}?page=1&pageSize=${pageSize}`),
    link('last',  `${basePath}?page=${totalPages}&pageSize=${pageSize}`),
  ];

  if (hasNextPage) {
    paginationLinks.push(link('next', `${basePath}?page=${page + 1}&pageSize=${pageSize}`));
  }
  if (hasPrevPage) {
    paginationLinks.push(link('prev', `${basePath}?page=${page - 1}&pageSize=${pageSize}`));
  }

  const body: ApiListResponse<T> = {
    data,
    meta: {
      ...buildMeta(metaOverrides),
      pagination,
    },
    links: [...paginationLinks, ...extraLinks],
  };

  res.status(200).json(body);
}

// ── Error senders ─────────────────────────────────────────────────────────

/**
 * Send a standardised error response.
 *
 * NEVER include stack traces in production.
 * Error codes should be machine-readable ("VALIDATION_ERROR", not "Bad Request").
 */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: ErrorDetail[],
  requestId?: string
): void {
  const body: ApiError = {
    error: {
      code,
      message,
      requestId: requestId ?? randomUUID(),
      documentation: `${API_BASE}/docs/errors#${code.toLowerCase()}`,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };
  res.status(status).json(body);
}

// Common error shortcuts
export const Errors = {
  notFound:   (res: Response, resource: string, id: string) =>
    sendError(res, 404, 'NOT_FOUND', `${resource} with id '${id}' was not found`),

  badRequest: (res: Response, message: string, details?: ErrorDetail[]) =>
    sendError(res, 400, 'BAD_REQUEST', message, details),

  validation: (res: Response, details: ErrorDetail[]) =>
    sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details),

  conflict:   (res: Response, message: string) =>
    sendError(res, 409, 'CONFLICT', message),

  internal:   (res: Response) =>
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred'),
};

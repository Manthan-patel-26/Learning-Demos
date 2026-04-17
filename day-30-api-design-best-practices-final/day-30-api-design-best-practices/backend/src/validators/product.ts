// src/validators/product.ts
// Zod schemas for request validation.
// Zod gives us: runtime validation + TypeScript type inference in one step.
// The inferred types match our domain DTOs exactly.

import { z } from 'zod';

// ── Shared field schemas ──────────────────────────────────────────────────
const priceSchema = z
  .number({ invalid_type_error: 'price must be a number' })
  .positive('price must be positive')
  .multipleOf(0.01, 'price must have at most 2 decimal places');

const stockSchema = z
  .number()
  .int('stock must be an integer')
  .min(0, 'stock cannot be negative');

const categorySchema = z
  .enum(['Electronics', 'Books', 'Sports', 'Home', 'Clothing', 'Tools', 'Gaming', 'Office'], {
    errorMap: () => ({ message: 'Invalid category' }),
  });

const skuSchema = z
  .string()
  .regex(/^[A-Z0-9-]{4,20}$/, 'SKU must be 4-20 uppercase letters, numbers, or hyphens');

// ── Create product schema ─────────────────────────────────────────────────
export const createProductSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters').max(120),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  price:       priceSchema,
  category:    categorySchema,
  stock:       stockSchema,
  sku:         skuSchema,
});

// ── Update product schema (all fields optional — PATCH semantics) ─────────
// PATCH = partial update (only provided fields change)
// PUT   = full replacement (all fields required, missing = null/default)
export const updateProductSchema = z.object({
  name:        z.string().min(2).max(120).optional(),
  description: z.string().min(10).max(1000).optional(),
  price:       priceSchema.optional(),
  category:    categorySchema.optional(),
  stock:       stockSchema.optional(),
}).strict(); // .strict() rejects unknown fields

// ── Query params schema ───────────────────────────────────────────────────
export const listQuerySchema = z.object({
  page:     z.string().optional().transform(v => Math.max(1, parseInt(v ?? '1', 10))),
  pageSize: z.string().optional().transform(v => Math.min(100, Math.max(1, parseInt(v ?? '20', 10)))),
  category: categorySchema.optional(),
  search:   z.string().max(200).optional(),
  sort:     z.enum(['name', 'price', 'createdAt']).optional().default('createdAt'),
  order:    z.enum(['asc', 'desc']).optional().default('desc'),
  minPrice: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
  maxPrice: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
});

// Infer TypeScript types from schemas
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListQueryInput     = z.infer<typeof listQuerySchema>;

// ── Validation helper ─────────────────────────────────────────────────────
// Converts Zod errors into our standardised ErrorDetail format
import { ZodError } from 'zod';
import { ErrorDetail } from '../types/index.js';

export function zodToErrorDetails(error: ZodError): ErrorDetail[] {
  return error.errors.map(e => ({
    field: e.path.join('.') || 'body',
    message: e.message,
    code: e.code,
  }));
}

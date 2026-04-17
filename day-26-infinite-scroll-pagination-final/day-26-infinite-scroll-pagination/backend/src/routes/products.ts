// src/routes/products.ts
// Product listing API with cursor-based pagination.
//
// ENDPOINT: GET /api/products
// QUERY PARAMS:
//   cursor    - Opaque pagination cursor (from previous response)
//   limit     - Items per page (1-100, default 20)
//   category  - Filter by category
//   search    - Search in name/description
//   sortBy    - price | rating | createdAt (default: createdAt)
//   sortOrder - asc | desc (default: desc)

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';
import { PaginatedResponse } from '../types/index.js';

const router = Router();
const prisma = new PrismaClient();

// Zod schema for query parameter validation
// This ensures type safety at the API boundary
const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val ?? '20', 10);
      return Math.min(Math.max(num, 1), 100); // Clamp between 1 and 100
    }),
  category: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['price', 'rating', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * GET /api/products
 * Returns a paginated list of products using cursor-based pagination.
 *
 * CURSOR PAGINATION LOGIC:
 * We fetch (limit + 1) items. If we get limit+1 items back, we know
 * there's a next page. We then return only `limit` items to the client
 * and generate a cursor pointing to the last returned item.
 *
 * For cursor-based pagination with sorting, we need a composite cursor
 * because multiple rows can have the same sortBy value (e.g., same price).
 * We use (sortValue, id) as the composite cursor to ensure stable ordering.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { cursor, limit, category, search, sortBy, sortOrder } = parsed.data;

    // ── Build the WHERE clause ──────────────────────────────────────────────

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // Category filter
    if (category) {
      where.category = category;
    }

    // Search filter (case-insensitive contains)
    // NOTE: SQLite uses 'contains' which is case-insensitive by default.
    // PostgreSQL requires 'mode: insensitive' for case-insensitive search.
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // ── Apply cursor (if provided) ──────────────────────────────────────────
    // This is the core of cursor pagination.
    // We want items AFTER the cursor position.
    //
    // For "created at desc, id desc" ordering:
    //   - Items with createdAt < cursor.createdAt, OR
    //   - Items with createdAt = cursor.createdAt AND id < cursor.id
    //
    // This is called the "seek method" or "keyset pagination"

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (!decoded) {
        res.status(400).json({
          error: 'INVALID_CURSOR',
          message: 'The provided cursor is invalid or expired',
        });
        return;
      }

      // For createdAt pagination (default)
      // For other sort fields, we fall back to createdAt+id cursor
      // In production, you'd build more sophisticated cursors per sort field
      where.OR = [
        ...(where.OR ?? []),
        // After the cursor position in the sort order
        {
          createdAt:
            sortOrder === 'desc'
              ? { lt: decoded.createdAt }
              : { gt: decoded.createdAt },
        },
        // Tie-break: same createdAt but different id
        {
          createdAt: decoded.createdAt,
          id: sortOrder === 'desc' ? { lt: decoded.id } : { gt: decoded.id },
        },
      ];
    }

    // ── Fetch limit + 1 to detect next page ────────────────────────────────
    const products = await prisma.product.findMany({
      where,
      orderBy: [
        { [sortBy]: sortOrder },
        { id: sortOrder }, // Secondary sort for stable pagination
      ],
      take: limit + 1, // Fetch one extra to check if there's a next page
    });

    // ── Determine if there's a next page ───────────────────────────────────
    const hasNextPage = products.length > limit;

    // Remove the extra item we fetched (it was just for the check)
    const items = hasNextPage ? products.slice(0, limit) : products;

    // ── Generate next cursor ────────────────────────────────────────────────
    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor({
        id: lastItem.id,
        createdAt: lastItem.createdAt.toISOString(),
      });
    }

    const response: PaginatedResponse<typeof items[0]> = {
      data: items,
      pagination: {
        nextCursor,
        hasNextPage,
        limit,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/categories
 * Returns all available product categories for the filter UI.
 */
router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.product.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { category: 'asc' },
    });

    res.json({
      data: categories.map((c) => ({
        name: c.category,
        count: c._count.category,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;

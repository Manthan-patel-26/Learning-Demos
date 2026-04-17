// src/routes/search.ts
// Search and autocomplete endpoints.
//
// TWO ENDPOINTS:
//   GET /api/search/suggestions?q=sony  → fast autocomplete (≤6 results)
//   GET /api/search?q=headphones        → full search results (≤20 results)
//
// Both endpoints track server-side timing with `took` field so the
// frontend can monitor search performance.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSuggestions, searchProducts } from '../utils/search.js';

const router = Router();

// Shared query validation
const querySchema = z.object({
  q: z.string().min(1).max(200).trim(),
  limit: z.string().optional().transform(v => Math.min(parseInt(v ?? '6'), 20)),
});

/**
 * GET /api/search/suggestions
 * Returns autocomplete suggestions (lightweight, called on every keystroke after debounce).
 * Optimized to be fast — in-memory lookup only.
 */
router.get('/suggestions', async (req: Request, res: Response) => {
  const start = performance.now();

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten() });
    return;
  }

  const { q, limit } = parsed.data;

  // Simulate realistic network + DB latency for demo purposes.
  // Remove in production!
  const latency = parseInt(process.env.SIMULATE_LATENCY ?? '0');
  if (latency > 0) {
    await new Promise(resolve => setTimeout(resolve, latency));
  }

  const suggestions = getSuggestions(q, limit);

  // Cache suggestions briefly — they rarely change.
  // In production use Redis or a CDN edge cache.
  res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=60');

  res.json({
    query: q,
    suggestions,
    took: Math.round(performance.now() - start),
  });
});

/**
 * GET /api/search
 * Full search results (called on Enter key or suggestion click).
 */
router.get('/', async (req: Request, res: Response) => {
  const start = performance.now();

  const parsed = querySchema.safeParse({ ...req.query, limit: req.query.limit ?? '20' });
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query' });
    return;
  }

  const { q, limit } = parsed.data;

  const latency = parseInt(process.env.SIMULATE_LATENCY ?? '0');
  if (latency > 0) {
    await new Promise(resolve => setTimeout(resolve, latency + 40)); // Full search is a bit slower
  }

  const results = searchProducts(q, limit);

  res.json({
    query: q,
    results,
    took: Math.round(performance.now() - start),
  });
});

export default router;

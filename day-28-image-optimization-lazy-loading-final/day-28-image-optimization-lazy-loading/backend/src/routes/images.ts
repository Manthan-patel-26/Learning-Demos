// src/routes/images.ts
// Image API endpoints:
//   GET /api/images              → gallery metadata list
//   GET /api/images/:id/transform → on-the-fly image resize + format conversion
//
// CACHING STRATEGY:
// Transformed images are cached with long max-age because:
//   1. The URL encodes all transform params (?w=800&fmt=webp)
//   2. Same params = identical output = safe to cache forever at CDN
//   3. Cache-busting happens naturally via URL params when content changes
//
// In production: put Cloudflare / CloudFront in front of this endpoint.
// The first request per (id, params) is slow (Sharp processing).
// Every subsequent request is served from CDN edge cache (near-instant).

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { transformImage } from '../utils/imageTransform.js';
import { GALLERY_IMAGES } from '../utils/galleryData.js';

const router = Router();

// Whitelist of allowed widths — prevents DoS via arbitrary resize requests
// e.g. ?w=99999 would force Sharp to process a huge image
const ALLOWED_WIDTHS = new Set([320, 480, 640, 800, 960, 1280, 1440, 1920]);

const transformSchema = z.object({
  w: z.string().optional().transform(v => {
    if (!v) return undefined;
    const n = parseInt(v, 10);
    // Snap to nearest allowed width to improve cache hit rate
    // and prevent abuse
    if (ALLOWED_WIDTHS.has(n)) return n;
    // Find closest allowed width
    return [...ALLOWED_WIDTHS].reduce((prev, curr) =>
      Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev
    );
  }),
  fmt: z.enum(['webp', 'jpeg', 'avif']).optional().default('jpeg'),
  q: z.string().optional().transform(v => {
    if (!v) return undefined;
    const n = parseInt(v, 10);
    return Math.min(Math.max(n, 1), 100);
  }),
});

/**
 * GET /api/images
 * Returns gallery metadata including blur placeholders and srcset URLs.
 * Does NOT return image data — just the metadata the frontend needs
 * to build <picture> elements with proper srcset attributes.
 */
router.get('/', (_req: Request, res: Response) => {
  // Cache gallery list for 5 minutes
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json({ data: GALLERY_IMAGES });
});

/**
 * GET /api/images/:id/transform
 * Returns transformed image binary data.
 *
 * Query params:
 *   w   — target width (snapped to allowed widths)
 *   fmt — output format: webp | jpeg | avif (default: jpeg)
 *   q   — quality 1-100 (default: format-specific)
 *
 * Example: /api/images/img-1/transform?w=800&fmt=webp
 *
 * NOTE: Since we're using picsum.photos URLs in the demo (not local files),
 * this endpoint proxies and transforms the remote image.
 * In production, images would be stored locally or in S3.
 */
router.get('/:id/transform', async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = transformSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid transform parameters' });
    return;
  }

  const { w, fmt, q } = parsed.data;

  try {
    // For the demo, proxy from picsum.photos and transform on the fly
    // Map image IDs to picsum seeds
    const picsumId = parseInt(id.replace('img-', '')) * 10;
    const sourceUrl = `https://picsum.photos/seed/${picsumId}/1920/1280`;

    // Fetch the source image
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error('Failed to fetch source image');

    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Transform with Sharp
    const { default: sharp } = await import('sharp');
    let pipeline = sharp(inputBuffer);

    if (w) {
      pipeline = pipeline.resize({ width: w, withoutEnlargement: true });
    }

    const quality = q ?? (fmt === 'webp' ? 82 : fmt === 'avif' ? 65 : 85);

    switch (fmt) {
      case 'webp': pipeline = pipeline.webp({ quality }); break;
      case 'avif': pipeline = pipeline.avif({ quality }); break;
      default: pipeline = pipeline.jpeg({ quality, progressive: true });
    }

    const buffer = await pipeline.toBuffer();

    const contentTypeMap: Record<string, string> = {
      webp: 'image/webp', avif: 'image/avif', jpeg: 'image/jpeg',
    };

    // Long cache — URL is deterministic, content never changes for same params
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', contentTypeMap[fmt]);
    res.setHeader('Vary', 'Accept'); // CDN caches separate copies per Accept header
    res.send(buffer);
  } catch (err) {
    console.error('Transform error:', err);
    res.status(500).json({ error: 'Image transformation failed' });
  }
});

export default router;

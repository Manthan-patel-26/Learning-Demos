// src/utils/imageTransform.ts
// Image processing utilities using Sharp.
//
// Sharp is the go-to Node.js image processing library — it wraps libvips,
// which is significantly faster than ImageMagick or Jimp:
//   - 4-5x faster than ImageMagick
//   - Streaming pipeline (doesn't load full image into memory)
//   - Supports WebP, AVIF, JPEG, PNG, HEIF
//
// IN PRODUCTION:
// Don't process images on-the-fly in your API server.
// Instead use:
//   - Cloudinary / Imgix / Bunny.net — managed image CDN with URL-based transforms
//   - Next.js Image / Vercel Image Optimization — built-in for Next.js apps
//   - AWS Lambda@Edge + Sharp — serverless image processing at CDN edge
//   - Pre-generate all sizes at upload time and store in S3

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { TransformOptions } from '../types/index.js';

const IMAGES_DIR = process.env.IMAGES_DIR ?? './images';

// Breakpoints we generate for responsive images.
// These match common device widths (phone, tablet, desktop, retina desktop).
export const RESPONSIVE_WIDTHS = [320, 640, 960, 1280, 1920];

// Default quality settings per format.
// WebP is ~30% smaller than JPEG at equivalent visual quality.
// AVIF is ~50% smaller than JPEG but slower to encode.
const FORMAT_QUALITY: Record<string, number> = {
  webp: 82,
  jpeg: 85,
  avif: 65, // Lower quality number = similar visual result due to better compression
};

/**
 * Transforms an image from disk with resize + format conversion.
 * Returns the processed image buffer and content-type header.
 */
export async function transformImage(
  imageId: string,
  options: TransformOptions
): Promise<{ buffer: Buffer; contentType: string; width: number; height: number }> {
  const imagePath = findImagePath(imageId);
  if (!imagePath) throw new Error(`Image not found: ${imageId}`);

  const format = options.fmt ?? 'jpeg';
  const quality = options.q ?? FORMAT_QUALITY[format] ?? 85;

  let pipeline = sharp(imagePath);

  // Resize if width or height specified.
  // `fit: 'inside'` maintains aspect ratio and never upscales.
  if (options.w || options.h) {
    pipeline = pipeline.resize({
      width: options.w,
      height: options.h,
      fit: 'inside',
      withoutEnlargement: true, // Never upscale — serve original size if requested size > original
    });
  }

  // Convert to target format
  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality, effort: 4 });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality, effort: 4 });
      break;
    default:
      // Progressive JPEG — loads top-to-bottom progressively (better perceived performance)
      pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
  }

  const { data: buffer, info } = await pipeline.toBuffer({ resolveWithObject: true });

  const contentTypeMap: Record<string, string> = {
    webp: 'image/webp',
    avif: 'image/avif',
    jpeg: 'image/jpeg',
  };

  return { buffer, contentType: contentTypeMap[format] ?? 'image/jpeg', width: info.width, height: info.height };
}

/**
 * Generates a tiny blur placeholder (20px wide, heavily blurred).
 * Returns as base64 data URL for inline embedding.
 *
 * WHY BLUR-UP?
 * - The placeholder loads instantly (it's inline in the HTML, ~300 bytes)
 * - The full image fades in over it once loaded
 * - Feels much better than showing an empty grey box
 * - Used by Next.js Image, Gatsby Image, and most modern image components
 */
export async function generateBlurPlaceholder(imageId: string): Promise<string> {
  const imagePath = findImagePath(imageId);
  if (!imagePath) throw new Error(`Image not found: ${imageId}`);

  // 20px wide thumbnail, heavily blurred, JPEG for smallest size
  const buffer = await sharp(imagePath)
    .resize({ width: 20, fit: 'inside', withoutEnlargement: false })
    .blur(1)
    .jpeg({ quality: 40 })
    .toBuffer();

  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

/**
 * Reads image dimensions without decoding the full image.
 * Sharp reads just the header bytes for this — very fast.
 */
export async function getImageMetadata(imageId: string) {
  const imagePath = findImagePath(imageId);
  if (!imagePath) throw new Error(`Image not found: ${imageId}`);

  const metadata = await sharp(imagePath).metadata();
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format,
    size: metadata.size,
  };
}

/**
 * Finds an image file by ID across supported extensions.
 * Allows clean IDs like "sunset" to map to "sunset.jpg" or "sunset.png".
 */
function findImagePath(imageId: string): string | null {
  const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
  for (const ext of extensions) {
    const filePath = path.join(IMAGES_DIR, `${imageId}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

/**
 * Lists all image IDs available in the images directory.
 */
export function listImageIds(): string[] {
  if (!fs.existsSync(IMAGES_DIR)) return [];
  const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
  return fs.readdirSync(IMAGES_DIR)
    .filter(f => extensions.has(path.extname(f).toLowerCase()))
    .map(f => path.basename(f, path.extname(f)));
}

// src/types/index.ts
// Types for the image gallery API.

export interface GalleryImage {
  id: string;
  title: string;
  photographer: string;
  location: string;
  width: number;           // Original width in pixels
  height: number;          // Original height in pixels
  aspectRatio: number;     // width/height — used by frontend to reserve space (prevent CLS)
  blurDataUrl: string;     // Tiny base64 placeholder (20x20px blurred) for blur-up effect
  // srcset URLs for responsive images
  srcset: {
    webp: SrcsetEntry[];   // WebP variants (modern browsers)
    jpeg: SrcsetEntry[];   // JPEG fallback (all browsers)
  };
  src: string;             // Default src (largest JPEG — for non-<picture> contexts)
}

export interface SrcsetEntry {
  url: string;    // /api/images/:id/transform?w=800&fmt=webp
  width: number;  // Descriptor width in pixels (for srcset="... 800w")
}

export interface TransformOptions {
  w?: number;          // Target width
  h?: number;          // Target height
  fmt?: 'webp' | 'jpeg' | 'avif';
  q?: number;          // Quality 1-100
}

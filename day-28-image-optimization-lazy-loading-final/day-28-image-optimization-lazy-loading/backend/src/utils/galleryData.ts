// src/utils/galleryData.ts
// Static metadata for the demo gallery.
// In production this would come from a database (Postgres, MongoDB, etc.)
// with image metadata stored at upload time.
//
// The blurDataUrl values here are tiny 20px JPEG placeholders encoded as base64.
// In a real app, generate these at upload time using generateBlurPlaceholder()
// and store them in the database alongside other image metadata.
// Storing them in the DB means zero extra processing on every request.

import { GalleryImage } from '../types/index.js';

const API_BASE = '/api/images';

// Helper to build srcset entries for a given image ID and format
function buildSrcset(id: string, widths: number[], fmt: 'webp' | 'jpeg') {
  return widths.map(w => ({
    url: `${API_BASE}/${id}/transform?w=${w}&fmt=${fmt}`,
    width: w,
  }));
}

// 16 demo images using picsum.photos (a free placeholder image service).
// We use deterministic IDs (1-16) so URLs are stable.
// The blurDataUrl is a hand-crafted 1x1 pixel placeholder for demo simplicity.
// In production: generate with sharp at upload time.
const TINY_BLUR = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=';

export const GALLERY_IMAGES: GalleryImage[] = [
  {
    id: 'img-1', title: 'Mountain Sunrise', photographer: 'Alex Chen',
    location: 'Swiss Alps', width: 1920, height: 1280, aspectRatio: 1920/1280,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-1', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-1', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-1/transform?w=1280&fmt=jpeg`,
  },
  {
    id: 'img-2', title: 'Ocean Waves', photographer: 'Maria Santos',
    location: 'Maldives', width: 1920, height: 1080, aspectRatio: 1920/1080,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-2', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-2', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-2/transform?w=1280&fmt=jpeg`,
  },
  {
    id: 'img-3', title: 'Forest Path', photographer: 'James Wilson',
    location: 'Black Forest, Germany', width: 1280, height: 1920, aspectRatio: 1280/1920,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-3', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-3', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-3/transform?w=960&fmt=jpeg`,
  },
  {
    id: 'img-4', title: 'Desert Dunes', photographer: 'Fatima Al-Rashid',
    location: 'Sahara, Morocco', width: 1920, height: 1280, aspectRatio: 1920/1280,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-4', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-4', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-4/transform?w=1280&fmt=jpeg`,
  },
  {
    id: 'img-5', title: 'City at Night', photographer: 'Yuki Tanaka',
    location: 'Tokyo, Japan', width: 1920, height: 1080, aspectRatio: 1920/1080,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-5', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-5', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-5/transform?w=1280&fmt=jpeg`,
  },
  {
    id: 'img-6', title: 'Autumn Leaves', photographer: 'Laura Becker',
    location: 'Vermont, USA', width: 1280, height: 1280, aspectRatio: 1,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-6', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-6', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-6/transform?w=1280&fmt=jpeg`,
  },
  {
    id: 'img-7', title: 'Waterfall Mist', photographer: 'Carlos Mendez',
    location: 'Iguazu Falls, Brazil', width: 1920, height: 1440, aspectRatio: 1920/1440,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-7', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-7', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-7/transform?w=1280&fmt=jpeg`,
  },
  {
    id: 'img-8', title: 'Arctic Aurora', photographer: 'Ingrid Larsson',
    location: 'Tromsø, Norway', width: 1920, height: 1080, aspectRatio: 1920/1080,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-8', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-8', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-8/transform?w=1280&fmt=jpeg`,
  },
  {
    id: 'img-9', title: 'Tulip Fields', photographer: 'Pieter van Dam',
    location: 'Keukenhof, Netherlands', width: 1920, height: 1280, aspectRatio: 1920/1280,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-9', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-9', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-9/transform?w=1280&fmt=jpeg`,
  },
  {
    id: 'img-10', title: 'Ancient Temple', photographer: 'Priya Sharma',
    location: 'Angkor Wat, Cambodia', width: 1920, height: 1280, aspectRatio: 1920/1280,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-10', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-10', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-10/transform?w=1280&fmt=jpeg`,
  },
  {
    id: 'img-11', title: 'Snowy Peak', photographer: 'Thomas Berger',
    location: 'Dolomites, Italy', width: 1920, height: 1280, aspectRatio: 1920/1280,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-11', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-11', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-11/transform?w=1280&fmt=jpeg`,
  },
  {
    id: 'img-12', title: 'Coral Reef', photographer: 'Aiko Nakamura',
    location: 'Great Barrier Reef, Australia', width: 1920, height: 1080, aspectRatio: 1920/1080,
    blurDataUrl: TINY_BLUR,
    srcset: {
      webp: buildSrcset('img-12', [320, 640, 960, 1280], 'webp'),
      jpeg: buildSrcset('img-12', [320, 640, 960, 1280], 'jpeg'),
    },
    src: `${API_BASE}/img-12/transform?w=1280&fmt=jpeg`,
  },
];

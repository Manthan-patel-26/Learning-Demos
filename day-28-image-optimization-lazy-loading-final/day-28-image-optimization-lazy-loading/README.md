# Day 28 — Image Optimization & Lazy Loading

## What You'll Learn
- **Blur-up placeholders** — inline base64 thumbnails that crossfade into the real image
- **Responsive `srcset`** — browser auto-picks the right size for the viewport
- **`<picture>` + WebP** — serve WebP to modern browsers, JPEG as fallback
- **CLS prevention** — `aspect-ratio` CSS reserves space before images load
- **Native lazy loading** — `loading="lazy"` defers off-screen images
- **Sharp** — Node.js image processing (resize, convert, compress)
- **Lightbox** — accessible modal with focus trap, keyboard nav, focus restoration
- **LCP optimization** — `loading="eager"` + `decoding="async"` for above-the-fold images

---

## Project Structure

```
day-28-image-optimization-lazy-loading/
├── backend/
│   ├── src/
│   │   ├── index.ts                      ← Express app
│   │   ├── routes/images.ts              ← Gallery list + on-the-fly transform API
│   │   ├── utils/imageTransform.ts       ← Sharp: resize, WebP/AVIF/JPEG conversion
│   │   └── utils/galleryData.ts          ← Static image metadata with blur placeholders
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── OptimizedImage.tsx         ← Core: <picture>, srcset, blur-up, CLS fix
    │   │   ├── Gallery.tsx               ← Grid with eager/lazy split at fold
    │   │   └── Lightbox.tsx              ← Focus trap, Escape key, aria-modal
    │   ├── hooks/
    │   │   └── useImageLoad.ts           ← Blur-up load state machine
    │   └── styles.css
    └── package.json
```

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run dev
# → http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Open DevTools → Network tab → throttle to "Slow 3G" → reload the page.
Watch the blur placeholders appear instantly, then the sharp images fade in. ✨

---

## API Reference

### `GET /api/images`
Returns gallery metadata: titles, photographers, blur placeholders, and srcset URL lists.

```json
{
  "data": [
    {
      "id": "img-1",
      "title": "Mountain Sunrise",
      "aspectRatio": 1.5,
      "blurDataUrl": "data:image/jpeg;base64,/9j/4AA...",
      "srcset": {
        "webp": [
          { "url": "/api/images/img-1/transform?w=320&fmt=webp", "width": 320 },
          { "url": "/api/images/img-1/transform?w=640&fmt=webp", "width": 640 }
        ],
        "jpeg": [...]
      },
      "src": "/api/images/img-1/transform?w=1280&fmt=jpeg"
    }
  ]
}
```

### `GET /api/images/:id/transform`
Returns transformed image binary data.

| Param | Values | Default | Notes |
|-------|--------|---------|-------|
| `w` | 320, 480, 640, 800, 960, 1280, 1440, 1920 | original | Snapped to nearest allowed width |
| `fmt` | `webp`, `jpeg`, `avif` | `jpeg` | WebP = ~30% smaller than JPEG |
| `q` | 1–100 | fmt-specific | WebP:82, JPEG:85, AVIF:65 |

```
Cache-Control: public, max-age=31536000, immutable
```
URL-based cache busting — same params = same output = cache forever.

---

## Core Concepts Deep-Dive

### Blur-Up Placeholder Technique

```
Timeline without blur-up:
  0ms    → Blank grey box
  800ms  → Image pops in (jarring)

Timeline with blur-up:
  0ms    → Blurred low-res image (inline, no extra request)
  800ms  → Crossfade to sharp image (smooth)
```

**Implementation:**
1. At upload time, generate a 20×20px JPEG with `sharp` → encode as base64
2. Store the ~300-byte string in your database alongside the image record
3. Embed it as `<img src="data:image/jpeg;base64,...">` in the HTML response
4. When the real image loads, fade out the placeholder with CSS transition

```typescript
// Generate at upload time (backend)
const blur = await sharp(imageBuffer)
  .resize({ width: 20 })
  .blur(1)
  .jpeg({ quality: 40 })
  .toBuffer();
const blurDataUrl = `data:image/jpeg;base64,${blur.toString('base64')}`;
// Store blurDataUrl in database with image record
```

### Responsive Images with `<picture>` and `srcset`

```html
<!-- Browser reads sources top to bottom, picks first it supports -->
<picture>
  <!-- WebP: modern browsers (Chrome, Firefox, Safari 14+, Edge) -->
  <source
    type="image/webp"
    srcset="/img?w=320&fmt=webp 320w,
            /img?w=640&fmt=webp 640w,
            /img?w=1280&fmt=webp 1280w"
    sizes="(max-width: 640px) 100vw, 50vw"
  />

  <!-- JPEG fallback: all browsers including IE11 -->
  <source
    type="image/jpeg"
    srcset="/img?w=320&fmt=jpeg 320w,
            /img?w=640&fmt=jpeg 640w,
            /img?w=1280&fmt=jpeg 1280w"
    sizes="(max-width: 640px) 100vw, 50vw"
  />

  <!-- <img> is always required as the final fallback -->
  <img src="/img?w=1280&fmt=jpeg" alt="Description" loading="lazy" />
</picture>
```

**How the browser chooses:**
1. Checks `type` — skips unsupported formats
2. Reads `sizes` — determines how wide the image will render in CSS pixels
3. Reads `srcset` — finds the source with `width >= sizes * devicePixelRatio`
4. Picks the smallest qualifying source (saves bandwidth on mobile)

### CLS Prevention with `aspect-ratio`

```
Without aspect-ratio (CLS score > 0):
  ┌─────────────────┐     ┌─────────────────┐
  │ [0px tall box]  │ →   │                 │ ← Page jumps! Content below shifts
  └─────────────────┘     │   Image loaded  │   All elements below move
                          │                 │
                          └─────────────────┘

With aspect-ratio (CLS score = 0):
  ┌─────────────────┐     ┌─────────────────┐
  │                 │ →   │                 │ ← No jump! Space was reserved
  │  [Placeholder]  │     │   Image loaded  │
  │                 │     │                 │
  └─────────────────┘     └─────────────────┘
```

```css
/* Reserve exact space before image loads */
.image-wrapper {
  aspect-ratio: 1.5;   /* width / height = 1920 / 1280 */
  overflow: hidden;
}
```

Store `width` and `height` in your database at upload time. Never skip this.

### LCP Optimization (Largest Contentful Paint)

The LCP image is typically the largest image visible on initial load (hero, first gallery item).

```tsx
// Above-the-fold images: load eagerly and decode without blocking
<img loading="eager" decoding="async" fetchpriority="high" ... />

// Below-the-fold images: defer until near viewport
<img loading="lazy" decoding="async" ... />

// Rule of thumb: eager for first ~4 items in a grid, lazy for the rest
{images.map((img, i) => (
  <OptimizedImage loading={i < 4 ? 'eager' : 'lazy'} ... />
))}
```

### Format Comparison

| Format | Browser Support | Size vs JPEG | Best For |
|--------|----------------|--------------|----------|
| JPEG | 100% | baseline | Photos, complex gradients |
| WebP | 97% (IE excluded) | ~30% smaller | Everything — safe to use |
| AVIF | 87% | ~50% smaller | High quality at small size |
| PNG | 100% | larger | Screenshots, logos, transparency |

**Production recommendation:** Serve AVIF to Chrome/Firefox, WebP to Safari, JPEG fallback.

---

## Common Gotchas (from the curriculum)

### 1. Retina/2x displays
A 400px wide container on a 2x display needs an 800px image for sharpness.
The `srcset` + `sizes` combination handles this automatically:
```
sizes="400px" + 2x DPR → browser requests the 800w srcset entry
```

### 2. CLS from lazy images without dimensions
```html
<!-- ❌ WRONG — no dimensions = layout shift when image loads -->
<img src="photo.jpg" loading="lazy" alt="..." />

<!-- ✅ CORRECT — explicit dimensions prevent CLS -->
<img src="photo.jpg" loading="lazy" width="1920" height="1280" alt="..." />
<!-- Or use CSS aspect-ratio on the wrapper -->
```

### 3. `loading="lazy"` doesn't work for above-the-fold images
If the first visible image has `loading="lazy"`, the browser waits for layout
to be complete before fetching it — hurting LCP. Always use `loading="eager"` for
the primary above-the-fold image.

### 4. `sizes` attribute is critical for `srcset` to work
Without `sizes`, the browser assumes the image will be 100vw wide and picks a
larger-than-necessary source. Always set `sizes` to match your CSS layout:
```html
<!-- Image takes 33% of viewport on desktop, 100% on mobile -->
sizes="(max-width: 640px) 100vw, 33vw"
```

---

## Measuring CLS

Open Chrome DevTools → Lighthouse → run Performance audit.
Look for **CLS** in Core Web Vitals:
- **Good**: CLS < 0.1
- **Needs improvement**: 0.1–0.25
- **Poor**: > 0.25

Alternatively: DevTools → Performance tab → record → look for "Layout Shift" markers.

---

## Extending This Project

1. **AVIF support** — add a third `<source type="image/avif">` before WebP for ~50% smaller files

2. **BlurHash** — more sophisticated placeholder encoding by Wolt (smoother gradients than JPEG blur):
   ```bash
   npm install blurhash
   ```

3. **Image CDN** — replace the transform API with Cloudinary or Imgix:
   ```
   https://res.cloudinary.com/demo/image/upload/w_800,f_auto,q_auto/sample.jpg
   ```
   `f_auto` = automatic format selection (AVIF/WebP/JPEG based on browser)
   `q_auto` = automatic quality (Cloudinary's ML-based perceptual quality)

4. **Masonry layout** — variable-height grid using CSS `columns` or a library like `react-masonry-css`

5. **Progressive JPEG** — `sharp().jpeg({ progressive: true })` — renders top-to-bottom as it loads instead of waiting for the full file

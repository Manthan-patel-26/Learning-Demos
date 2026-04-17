// src/routes/v1/products.ts
// Version 1 of the Products API — fully RESTful with:
//   ✓ Correct HTTP methods and status codes
//   ✓ HATEOAS hypermedia links on every response
//   ✓ Consistent error envelope with machine-readable codes
//   ✓ Zod validation with field-level error details
//   ✓ PATCH for partial updates (not PUT for everything)
//   ✓ Proper 201 Created with Location header on POST
//   ✓ 204 No Content on DELETE (no body)
//   ✓ ETag support for conditional requests

import { Router, Request, Response } from 'express';
import { ProductStore } from '../../utils/store.js';
import { sendResource, sendList, Errors, link, selfLink } from '../../utils/response.js';
import {
  createProductSchema, updateProductSchema, listQuerySchema, zodToErrorDetails,
} from '../../validators/product.ts';
import { Product } from '../../types/index.js';

const router = Router();
const BASE = '/api/v1/products';

// ── Helper: build HATEOAS links for a single product ─────────────────────
function productLinks(p: Product) {
  return [
    selfLink(`${BASE}/${p.id}`),
    link('update', `${BASE}/${p.id}`, 'PATCH', 'Update this product'),
    link('delete', `${BASE}/${p.id}`, 'DELETE', 'Delete this product'),
    link('collection', BASE, 'GET', 'All products'),
  ];
}

// ── GET /api/v1/products ──────────────────────────────────────────────────
// List all products with filtering, sorting, and pagination.
// Returns 200 with paginated envelope + navigation links.
router.get('/', (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    Errors.validation(res, zodToErrorDetails(parsed.error));
    return;
  }

  const q = parsed.data;
  const result = ProductStore.list({
    page: q.page,
    pageSize: q.pageSize,
    category: q.category,
    search: q.search,
    sort: q.sort,
    order: q.order,
    minPrice: q.minPrice,
    maxPrice: q.maxPrice,
  });

  sendList(
    res,
    result.items,
    {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      hasNextPage: result.page < result.totalPages,
      hasPrevPage: result.page > 1,
    },
    BASE,
    [link('create', BASE, 'POST', 'Create a new product')]
  );
});

// ── POST /api/v1/products ─────────────────────────────────────────────────
// Create a new product.
// Returns 201 Created with Location header pointing to the new resource.
// Checks for duplicate SKU — returns 409 Conflict if duplicate.
router.post('/', (req: Request, res: Response) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, zodToErrorDetails(parsed.error));
    return;
  }

  // Business rule: SKU must be unique
  const existing = ProductStore.findBySku(parsed.data.sku);
  if (existing) {
    Errors.conflict(res, `A product with SKU '${parsed.data.sku}' already exists`);
    return;
  }

  const product = ProductStore.create(parsed.data);

  // Location header tells clients where to find the new resource (RFC 7231)
  res.setHeader('Location', `${process.env.API_BASE_URL ?? ''}${BASE}/${product.id}`);

  sendResource(res, 201, product, productLinks(product));
});

// ── GET /api/v1/products/:id ──────────────────────────────────────────────
// Get a single product by ID.
// Returns 200 with resource + HATEOAS links, or 404 with error envelope.
router.get('/:id', (req: Request, res: Response) => {
  const product = ProductStore.findById(req.params['id'] ?? '');
  if (!product) {
    Errors.notFound(res, 'Product', req.params['id'] ?? '');
    return;
  }

  // ETag: hash of the updatedAt timestamp — allows clients to use
  // If-None-Match for conditional GET (304 Not Modified if unchanged)
  const etag = `"${Buffer.from(product.updatedAt).toString('base64')}"`;
  res.setHeader('ETag', etag);

  // Conditional GET support — return 304 if client already has fresh data
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  sendResource(res, 200, product, productLinks(product));
});

// ── PATCH /api/v1/products/:id ────────────────────────────────────────────
// Partially update a product (only provided fields are changed).
// PATCH vs PUT:
//   PATCH = partial update — send only what changed
//   PUT   = full replacement — must send all fields, missing = reset to default
// For most APIs, PATCH is what you actually want.
router.patch('/:id', (req: Request, res: Response) => {
  const product = ProductStore.findById(req.params['id'] ?? '');
  if (!product) {
    Errors.notFound(res, 'Product', req.params['id'] ?? '');
    return;
  }

  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, zodToErrorDetails(parsed.error));
    return;
  }

  if (Object.keys(parsed.data).length === 0) {
    Errors.badRequest(res, 'Request body must contain at least one field to update');
    return;
  }

  const updated = ProductStore.update(req.params['id'] ?? '', parsed.data);
  if (!updated) {
    Errors.notFound(res, 'Product', req.params['id'] ?? '');
    return;
  }

  sendResource(res, 200, updated, productLinks(updated));
});

// ── DELETE /api/v1/products/:id ───────────────────────────────────────────
// Delete a product.
// Returns 204 No Content (no body) on success — this is the correct status.
// Some APIs return 200 with the deleted resource, but 204 is more RESTful.
router.delete('/:id', (req: Request, res: Response) => {
  const product = ProductStore.findById(req.params['id'] ?? '');
  if (!product) {
    Errors.notFound(res, 'Product', req.params['id'] ?? '');
    return;
  }

  ProductStore.delete(req.params['id'] ?? '');

  // 204 No Content — success, nothing to return
  res.status(204).end();
});

export default router;

// src/routes/v2/products.ts
// Version 2 of the Products API — demonstrates what a v2 migration looks like.
//
// WHAT CHANGED FROM v1:
//   - price is now returned as { amount, currency } object (breaking change)
//   - Added `tags` field to product
//   - Removed `sku` from the public response (moved to internal field)
//   - `category` is now a nested object with `id` and `name`
//
// This is why versioning exists — v1 clients keep working unchanged,
// v2 clients get the improved structure.

import { Router, Request, Response } from 'express';
import { ProductStore } from '../../utils/store.js';
import { sendResource, sendList, Errors, link, selfLink } from '../../utils/response.js';
import {
  createProductSchema, updateProductSchema, listQuerySchema, zodToErrorDetails,
} from '../../validators/product.ts';
import { Product } from '../../types/index.js';

const router = Router();
const BASE = '/api/v2/products';

// V2 response shape — note the breaking changes from v1
interface ProductV2 {
  id: string;
  name: string;
  description: string;
  price: {
    amount: number;        // ← v1 had price: number directly
    currency: string;      // ← new field
    formatted: string;     // ← new convenience field
  };
  category: {
    id: string;            // ← v1 had category: string
    name: string;
  };
  inventory: {
    stock: number;
    inStock: boolean;      // ← new convenience field
    lowStock: boolean;     // ← new: stock <= 5
  };
  tags: string[];          // ← new field
  createdAt: string;
  updatedAt: string;
  // Note: `sku` removed from public v2 response
}

// Transform v1 Product → v2 response shape
function toV2(p: Product): ProductV2 {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: {
      amount: p.price,
      currency: 'USD',
      formatted: `$${p.price.toFixed(2)}`,
    },
    category: {
      id: p.category.toLowerCase().replace(/\s+/g, '-'),
      name: p.category,
    },
    inventory: {
      stock: p.stock,
      inStock: p.stock > 0,
      lowStock: p.stock > 0 && p.stock <= 5,
    },
    tags: [],   // In production: from a tags table
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function productV2Links(p: ProductV2) {
  return [
    selfLink(`${BASE}/${p.id}`),
    link('update', `${BASE}/${p.id}`, 'PATCH'),
    link('delete', `${BASE}/${p.id}`, 'DELETE'),
    link('collection', BASE, 'GET'),
  ];
}

router.get('/', (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    Errors.validation(res, zodToErrorDetails(parsed.error));
    return;
  }
  const q = parsed.data;
  const result = ProductStore.list({
    page: q.page, pageSize: q.pageSize, category: q.category,
    search: q.search, sort: q.sort, order: q.order,
    minPrice: q.minPrice, maxPrice: q.maxPrice,
  });
  sendList(res, result.items.map(toV2), {
    page: result.page, pageSize: result.pageSize,
    totalItems: result.totalItems, totalPages: result.totalPages,
    hasNextPage: result.page < result.totalPages,
    hasPrevPage: result.page > 1,
  }, BASE);
});

router.get('/:id', (req: Request, res: Response) => {
  const product = ProductStore.findById(req.params['id'] ?? '');
  if (!product) {
    Errors.notFound(res, 'Product', req.params['id'] ?? '');
    return;
  }
  const v2 = toV2(product);
  sendResource(res, 200, v2, productV2Links(v2));
});

router.post('/', (req: Request, res: Response) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, zodToErrorDetails(parsed.error));
    return;
  }
  const existing = ProductStore.findBySku(parsed.data.sku);
  if (existing) {
    Errors.conflict(res, `SKU '${parsed.data.sku}' already exists`);
    return;
  }
  const product = ProductStore.create(parsed.data);
  res.setHeader('Location', `${process.env.API_BASE_URL ?? ''}${BASE}/${product.id}`);
  const v2 = toV2(product);
  sendResource(res, 201, v2, productV2Links(v2));
});

router.patch('/:id', (req: Request, res: Response) => {
  const product = ProductStore.findById(req.params['id'] ?? '');
  if (!product) { Errors.notFound(res, 'Product', req.params['id'] ?? ''); return; }
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) { Errors.validation(res, zodToErrorDetails(parsed.error)); return; }
  const updated = ProductStore.update(req.params['id'] ?? '', parsed.data);
  if (!updated) { Errors.notFound(res, 'Product', req.params['id'] ?? ''); return; }
  const v2 = toV2(updated);
  sendResource(res, 200, v2, productV2Links(v2));
});

router.delete('/:id', (req: Request, res: Response) => {
  if (!ProductStore.findById(req.params['id'] ?? '')) {
    Errors.notFound(res, 'Product', req.params['id'] ?? ''); return;
  }
  ProductStore.delete(req.params['id'] ?? '');
  res.status(204).end();
});

export default router;

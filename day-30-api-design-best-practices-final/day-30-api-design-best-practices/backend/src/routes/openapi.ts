// src/routes/openapi.ts
// Serves the OpenAPI 3.0 specification for this API.
// In production: generate from code using tsoa, swagger-jsdoc, or zod-to-openapi.
// Here we write it manually to show every important section.

import { Router } from 'express';
const router = Router();

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Product Catalog API',
    version: '1.0.0',
    description: 'RESTful API demonstrating best practices: versioning, HATEOAS, consistent errors',
    contact: { name: 'API Support', email: 'api@example.com' },
  },
  servers: [
    { url: 'http://localhost:3001/api/v1', description: 'v1 (current)' },
    { url: 'http://localhost:3001/api/v2', description: 'v2 (latest)' },
  ],
  tags: [
    { name: 'Products', description: 'Product catalog operations' },
    { name: 'Meta', description: 'API metadata' },
  ],
  paths: {
    '/products': {
      get: {
        tags: ['Products'], summary: 'List products',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['Electronics','Books','Sports','Home','Clothing','Tools','Gaming','Office'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['name','price','createdAt'], default: 'createdAt' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc','desc'], default: 'desc' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
        ],
        responses: {
          '200': { description: 'Paginated product list', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductList' } } } },
          '422': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
      post: {
        tags: ['Products'], summary: 'Create a product',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProduct' } } } },
        responses: {
          '201': { description: 'Created', headers: { Location: { schema: { type: 'string' }, description: 'URL of the new resource' } } },
          '409': { description: 'SKU conflict' },
          '422': { description: 'Validation error' },
        },
      },
    },
    '/products/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Products'], summary: 'Get a product',
        responses: {
          '200': { description: 'Product found' },
          '304': { description: 'Not modified (conditional GET with ETag)' },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Products'], summary: 'Partially update a product',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateProduct' } } } },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' }, '422': { description: 'Validation error' } },
      },
      delete: {
        tags: ['Products'], summary: 'Delete a product',
        responses: { '204': { description: 'Deleted (no body)' }, '404': { description: 'Not found' } },
      },
    },
  },
  components: {
    schemas: {
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number', example: 29.99 },
          category: { type: 'string' },
          stock: { type: 'integer' },
          sku: { type: 'string', example: 'ELEC-WHP-001' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateProduct: {
        type: 'object', required: ['name','description','price','category','stock','sku'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 120 },
          description: { type: 'string', minLength: 10, maxLength: 1000 },
          price: { type: 'number', minimum: 0.01 },
          category: { type: 'string' },
          stock: { type: 'integer', minimum: 0 },
          sku: { type: 'string', pattern: '^[A-Z0-9-]{4,20}$' },
        },
      },
      UpdateProduct: {
        type: 'object',
        properties: {
          name: { type: 'string' }, description: { type: 'string' },
          price: { type: 'number' }, category: { type: 'string' }, stock: { type: 'integer' },
        },
      },
      HateoasLink: {
        type: 'object',
        properties: {
          href: { type: 'string', format: 'uri' },
          rel: { type: 'string' },
          method: { type: 'string', enum: ['GET','POST','PUT','PATCH','DELETE'] },
          title: { type: 'string' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              requestId: { type: 'string', format: 'uuid' },
              documentation: { type: 'string', format: 'uri' },
              details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' }, code: { type: 'string' } } } },
            },
          },
        },
      },
      ProductList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
          meta: { type: 'object', properties: { version: { type: 'string' }, requestId: { type: 'string' }, pagination: { type: 'object' } } },
          links: { type: 'array', items: { $ref: '#/components/schemas/HateoasLink' } },
        },
      },
    },
  },
};

router.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(spec);
});

export default router;

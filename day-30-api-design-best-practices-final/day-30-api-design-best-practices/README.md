# Day 30 — API Design Best Practices

## What You'll Learn
- **URL versioning** — `/v1/`, `/v2/` and how to manage breaking changes
- **HATEOAS** — hypermedia links that allow clients to navigate the API without hard-coded URLs
- **Consistent error envelopes** — machine-readable codes, field-level details, requestId
- **HTTP status codes** — 201 + Location, 204 No Content, 409 Conflict, 422 Unprocessable
- **PATCH vs PUT** — partial updates vs full replacement, when to use each
- **OpenAPI 3.0** — machine-readable API contract for SDKs, docs, and validation
- **ETags** — conditional GET for efficient caching (`If-None-Match` / `304`)
- **Deprecation headers** — RFC 8594 `Sunset` header for communicating API removal

---

## Project Structure

```
day-30-api-design-best-practices/
├── backend/
│   ├── src/
│   │   ├── index.ts                    ← Express app, all middleware wired
│   │   ├── types/index.ts              ← ApiResponse, HATEOAS, Error types
│   │   ├── middleware/index.ts         ← requestId, apiVersion, deprecated, logger
│   │   ├── utils/
│   │   │   ├── response.ts             ← sendResource, sendList, Errors helpers
│   │   │   └── store.ts                ← In-memory product store (25 products)
│   │   ├── validators/product.ts       ← Zod schemas + zodToErrorDetails()
│   │   └── routes/
│   │       ├── v1/products.ts          ← v1 CRUD — canonical REST implementation
│   │       ├── v2/products.ts          ← v2 — new price/category shape
│   │       └── openapi.ts              ← OpenAPI 3.0 spec endpoint
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/ApiExplorer.tsx  ← Interactive request/response UI
    │   └── types/index.ts
    └── package.json
```

---

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
# → http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Open the browser → click any endpoint in the left panel → inspect response body, headers, and HATEOAS links in the right panel.

---

## API Reference

### Endpoints

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| `GET` | `/api` | 200 | Discovery root — HATEOAS entry point |
| `GET` | `/api/v1/products` | 200 | List products (paginated) |
| `POST` | `/api/v1/products` | 201 | Create product |
| `GET` | `/api/v1/products/:id` | 200 | Get product |
| `PATCH` | `/api/v1/products/:id` | 200 | Partial update |
| `DELETE` | `/api/v1/products/:id` | 204 | Delete |
| `GET` | `/api/v2/products` | 200 | v2 — new price/category structure |
| `GET` | `/api/openapi` | 200 | OpenAPI 3.0 spec |

### Response Envelope (every response)
```json
{
  "data": { ... },
  "meta": {
    "version": "v1",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "links": [
    { "rel": "self",   "href": "http://localhost:3001/api/v1/products/abc", "method": "GET" },
    { "rel": "update", "href": "http://localhost:3001/api/v1/products/abc", "method": "PATCH" },
    { "rel": "delete", "href": "http://localhost:3001/api/v1/products/abc", "method": "DELETE" }
  ]
}
```

### Error Envelope (all errors)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "requestId": "550e8400-...",
    "documentation": "http://localhost:3001/docs/errors#validation_error",
    "details": [
      { "field": "price",    "message": "price must be positive",         "code": "too_small" },
      { "field": "category", "message": "Invalid category",               "code": "invalid_enum_value" },
      { "field": "sku",      "message": "SKU must be 4-20 uppercase...",  "code": "invalid_string" }
    ]
  }
}
```

### Response Headers (notable)
| Header | Example | Purpose |
|--------|---------|---------|
| `X-Request-Id` | `550e8400-...` | Trace ID for debugging and support tickets |
| `X-API-Version` | `v1` | Which version served the response |
| `ETag` | `"L2NyZWF0..."` | Cache key for conditional GET |
| `Location` | `/api/v1/products/abc` | URL of newly created resource (201) |
| `Deprecation` | `true` | Endpoint is deprecated |
| `Sunset` | `Sat, 01 Jan 2026 00:00:00 GMT` | When the endpoint will be removed |
| `Link` | `<.../v2/products>; rel="successor-version"` | Replacement endpoint |

---

## Core Concepts Deep-Dive

### 1. API Versioning — URL vs Header

```
URL versioning (what we use):
  GET /api/v1/products
  GET /api/v2/products
  ✓ Explicit, visible, cacheable, easy to test in browser
  ✓ Correct version is obvious from any log entry
  ✗ "Impure" — version isn't a property of a product

Header versioning:
  GET /api/products
  API-Version: 2
  ✓ Clean URLs
  ✗ Invisible in browser address bar
  ✗ Not cached by default (need Vary: API-Version)
  ✗ Surprises developers who don't know to set the header
```

**Decision:** URL versioning wins for developer experience in almost all cases.

### 2. HATEOAS — Hypermedia As The Engine Of Application State

Level 3 of the Richardson Maturity Model. Each response includes links to
all possible next actions. A perfectly RESTful client only needs one hardcoded URL:

```
Client: GET /api
Server: → { links: [{ rel: "products", href: "/api/v1/products" }] }

Client: GET /api/v1/products
Server: → { data: [...], links: [{ rel: "create", href: "/api/v1/products", method: "POST" }] }

Client: POST /api/v1/products  ← client discovered this URL from the previous response
Server: → { data: { id: "abc", ...}, links: [{ rel: "self" }, { rel: "update" }, { rel: "delete" }] }
```

**Practical benefit:** Backend can change URLs without breaking clients that follow links.

### 3. Correct HTTP Status Codes

```
GET    /products      → 200 OK
POST   /products      → 201 Created  (NOT 200)
PATCH  /products/:id  → 200 OK
DELETE /products/:id  → 204 No Content  (NOT 200, no body)

Validation error  → 422 Unprocessable Entity  (NOT 400)
Duplicate SKU     → 409 Conflict
Not found         → 404 Not Found
Auth failure      → 401 Unauthorized (not authenticated)
Permission denied → 403 Forbidden (authenticated but not allowed)
Rate limited      → 429 Too Many Requests
```

### 4. PATCH vs PUT

```typescript
// PUT — full replacement: must send ALL fields
// Missing field = reset to null/default
PUT /api/v1/products/123
{ "name": "New Name", "description": "...", "price": 29.99, "category": "...", "stock": 0, "sku": "..." }

// PATCH — partial update: send ONLY what changed
// Missing field = unchanged
PATCH /api/v1/products/123
{ "price": 39.99 }  ← only price changes, everything else stays
```

**Use PATCH** for most update operations. PUT is for when you genuinely want full replacement semantics (idempotent full document upload).

### 5. ETags & Conditional GET

```
Client: GET /api/v1/products/abc
Server: 200 OK
        ETag: "L2NyZWF0ZWRBdA=="
        { data: { ... } }

Client: GET /api/v1/products/abc
        If-None-Match: "L2NyZWF0ZWRBdA=="
Server: 304 Not Modified  ← no body, saves bandwidth
                           ← client uses its cached version
```

ETag is a hash of the resource's `updatedAt` timestamp. If unchanged, return 304.
Dramatically reduces bandwidth for frequently-polled resources.

### 6. v1 → v2 Breaking Changes

```
v1 product:                v2 product:
{                          {
  "price": 29.99             "price": {          ← BREAKING: was a number
}                              "amount": 29.99,
                               "currency": "USD",
                               "formatted": "$29.99"
                             },
                             "category": {       ← BREAKING: was a string
                               "id": "electronics",
                               "name": "Electronics"
                             }
                           }
```

v1 clients continue working unchanged. v2 clients get the richer structure.
Both run simultaneously until v1 is sunset.

---

## Common Gotchas (from the curriculum)

### 1. Pagination totalCount performance
`SELECT COUNT(*) FROM products` is expensive on large tables (full scan).
Alternatives:
- Return `hasNextPage` only (cursor pagination — Day 26!)
- Use `SELECT COUNT(*) FROM products WHERE ...` with a timeout
- Cache the count with a short TTL
- Use approximate counts: `pg_class.reltuples` in Postgres

### 2. API versioning — URL vs header vs Accept header
There is no universal right answer — but URL versioning has the best developer experience
and the fewest surprises. Choose it unless you have a specific reason not to.

### 3. Breaking vs non-breaking changes

**Non-breaking (safe to deploy to existing version):**
- Adding new optional fields to responses
- Adding new optional query parameters
- Adding new endpoints

**Breaking (requires a new version):**
- Removing or renaming existing fields
- Changing field types (number → object)
- Changing behavior of existing endpoints
- Removing endpoints

### 4. Partial updates: always use `.strict()` in Zod
```typescript
const updateSchema = z.object({ name: z.string().optional() }).strict();
// .strict() rejects unknown fields — prevents accidentally setting
// fields the client shouldn't be able to set (e.g., createdAt, id)
```

### 5. Rate limit headers — communicate them clearly
```
RateLimit-Limit: 200        → max requests per window
RateLimit-Remaining: 185    → requests left in this window
RateLimit-Reset: 1706745600 → Unix timestamp when window resets
Retry-After: 30             → seconds to wait (on 429 response)
```

---

## Extending This Project

1. **OpenAPI-first development** — use `zod-openapi` or `tsoa` to generate the OpenAPI spec from your TypeScript code instead of writing it manually

2. **Swagger UI** — render the OpenAPI spec as interactive documentation:
   ```bash
   npm install swagger-ui-express @types/swagger-ui-express
   ```
   ```typescript
   app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
   ```

3. **API changelog** — maintain a `CHANGELOG.md` with every breaking and non-breaking change. Clients need to know what changed between versions.

4. **Client SDK generation** — use `openapi-generator` to auto-generate TypeScript, Python, or Go clients from the OpenAPI spec

5. **API gateway versioning** — in production, route `/v1/*` and `/v2/*` to different microservices using Kong, AWS API Gateway, or Nginx

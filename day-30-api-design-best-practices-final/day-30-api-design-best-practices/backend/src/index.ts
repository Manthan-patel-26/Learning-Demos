// src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import v1ProductsRouter from './routes/v1/products.js';
import v2ProductsRouter from './routes/v2/products.js';
import openapiRouter from './routes/openapi.js';
import { requestId, apiVersion, requestLogger, deprecated } from './middleware/index.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ── Global middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', exposedHeaders: ['X-Request-Id', 'X-API-Version', 'ETag', 'Location', 'Deprecation', 'Sunset', 'Link'] }));
app.use(express.json({ limit: '100kb' }));
app.use(requestId);
app.use(apiVersion);
app.use(requestLogger);

// ── Rate limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use(limiter);

// ── API routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/products', v1ProductsRouter);
app.use('/api/v2/products', v2ProductsRouter);

// ── OpenAPI spec ───────────────────────────────────────────────────────────
app.use('/api/openapi', openapiRouter);

// ── API root — discovery endpoint ─────────────────────────────────────────
// Level 3 HATEOAS: the root lists all available resources.
// A perfectly RESTful client only needs to know this one URL.
app.get('/api', (_req, res) => {
  res.json({
    versions: {
      v1: { status: 'active',     baseUrl: `${process.env.API_BASE_URL}/api/v1` },
      v2: { status: 'active',     baseUrl: `${process.env.API_BASE_URL}/api/v2` },
    },
    links: [
      { rel: 'v1-products', href: `${process.env.API_BASE_URL}/api/v1/products`, method: 'GET' },
      { rel: 'v2-products', href: `${process.env.API_BASE_URL}/api/v2/products`, method: 'GET' },
      { rel: 'openapi',     href: `${process.env.API_BASE_URL}/api/openapi`,     method: 'GET' },
    ],
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} does not exist`,
      documentation: `${process.env.API_BASE_URL}/api/openapi`,
    },
  });
});

// ── Global error handler ───────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
});

app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
  console.log(`   GET  /api             → Discovery`);
  console.log(`   GET  /api/v1/products → v1 Products`);
  console.log(`   GET  /api/v2/products → v2 Products`);
  console.log(`   GET  /api/openapi     → OpenAPI spec`);
});

export default app;

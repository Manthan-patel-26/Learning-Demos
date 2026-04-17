// src/index.ts
// Main application entry point.
// Sets up Express with security middleware, routes, and error handling.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import productsRouter from './routes/products.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Load environment variables FIRST, before any other code uses them
dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Security Middleware ────────────────────────────────────────────────────

// Helmet sets secure HTTP headers (X-Frame-Options, CSP, etc.)
app.use(helmet());

// CORS - only allow requests from our frontend origin
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET'], // This API is read-only
    optionsSuccessStatus: 200,
  })
);

// Rate limiting - prevent abuse
// In production, use Redis-backed rate limiter (rate-limit-redis)
// to share limits across multiple server instances
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                   // Limit each IP to 200 requests per window
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' },
  standardHeaders: true,      // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
});
app.use(limiter);

// ── Request Parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/products', productsRouter);

// Health check endpoint for load balancers and monitoring
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Error Handling (must be last) ──────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;

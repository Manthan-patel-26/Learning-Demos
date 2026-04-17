// src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import searchRouter from './routes/search.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

// Tighter rate limit for search — it's called on every keystroke
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 120,              // 2 requests/second average — generous for debounced search
  message: { error: 'TOO_MANY_REQUESTS', message: 'Slow down! Search rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/search', searchLimiter, searchRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔍 Simulated latency: ${process.env.SIMULATE_LATENCY ?? 0}ms`);
});

export default app;

// src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import brandedTypesRouter from './routes/brandedTypes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.use('/api', brandedTypesRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📘 TypeScript advanced features demo API ready`);
  console.log(`   GET  /api/demo/type-info    → concept documentation`);
  console.log(`   POST /api/demo/users        → create user (branded EmailAddress)`);
  console.log(`   POST /api/demo/orders       → create order (branded UserId, USD)`);
});

export default app;

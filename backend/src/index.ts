import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { agentsRouter } from './routes/agents';
import { callsRouter } from './routes/calls';
import { userRouter } from './routes/users';
import { statsRouter } from './routes/stats';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 4000;

// ─── SECURITY ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ─── RATE LIMITING ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter limit for x402 call execution
const callLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Call rate limit exceeded.' },
});

// ─── BODY PARSING ───────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── HEALTH CHECK ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── ROUTES ─────────────────────────────────────────────────
app.use('/api/v1/auth',   authRouter);
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/calls',  callLimiter, callsRouter);
app.use('/api/v1/users',  userRouter);
app.use('/api/v1/stats',  statsRouter);

// ─── 404 ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── ERROR HANDLER ──────────────────────────────────────────
app.use(errorHandler);

// ─── START ──────────────────────────────────────────────────
async function main() {
  try {
    await prisma.$connect();
    console.log('✓ Database connected');

    app.listen(PORT, () => {
      console.log(`✓ AgentMarket API running on http://localhost:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV}`);
      console.log(`  X Layer RPC: ${process.env.X_LAYER_RPC_URL}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

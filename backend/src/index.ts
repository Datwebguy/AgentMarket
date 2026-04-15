import 'dotenv/config';
console.log('[app] modules loading...');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

console.log('[app] express loaded');

import { authRouter }   from './routes/auth';
import { agentsRouter } from './routes/agents';
import { callsRouter }  from './routes/calls';
import { userRouter }   from './routes/users';
import { statsRouter }  from './routes/stats';
import { errorHandler } from './middleware/errorHandler';
import { prisma }       from './lib/prisma';

console.log('[app] all routes loaded');

const app = express();
app.set('trust proxy', 1);
// ─── BIGINT SERIALIZATION ───────────────────────────────────
// Prisma returns BigInt for totalCalls etc. JSON.stringify can't handle
// BigInt natively — patch the prototype so res.json() works everywhere.
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

// ─── SECURITY ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// ─── RATE LIMITING ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const callLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Call rate limit exceeded.' },
});

// ─── BODY PARSING ───────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// ─── HEALTH / ROOT ──────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'AgentMarket API', version: '1.0.0' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
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

// ─── DB CONNECT (non-blocking) ──────────────────────────────
console.log('[app] connecting to database...');
prisma.$connect()
  .then(() => console.log('[app] database connected'))
  .catch((err) => console.error('[app] database connect failed (non-fatal):', err?.message || err));

// ─── EXPORT for start.js ────────────────────────────────────
export { app };

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

console.log('[app] setup complete, app exported');

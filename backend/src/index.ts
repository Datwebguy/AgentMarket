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

// ─── STARTUP MIGRATIONS ─────────────────────────────────────
// Updates platform-seeded agent code on every deploy so fixes
// take effect automatically without a manual seed run.
async function runStartupMigrations() {
  try {
    const OKX_CRYPTO_CODE = `async function run(input) {
  const raw = (input.symbol || input.ticker || input.coin || input.name || input.input || 'ETH')
    .toUpperCase().trim();
  const nameToSymbol = {
    BITCOIN:'BTC',ETHEREUM:'ETH',SOLANA:'SOL',RIPPLE:'XRP',
    CARDANO:'ADA',DOGECOIN:'DOGE',AVALANCHE:'AVAX',POLKADOT:'DOT',CHAINLINK:'LINK',
    POLYGON:'MATIC',POL:'MATIC',UNISWAP:'UNI',COSMOS:'ATOM',LITECOIN:'LTC',
    ARBITRUM:'ARB',OPTIMISM:'OP',APTOS:'APT',NEAR:'NEAR',SUI:'SUI',
    OKB:'OKB',TONCOIN:'TON',PEPE:'PEPE',SHIBA:'SHIB',SHIBAINU:'SHIB',
    BITCOIN2:'BTC',ETHEREUM2:'ETH',
  };
  const symbol = nameToSymbol[raw] || raw;
  const instId = symbol + '-USDT';
  const resp = await fetch('https://www.okx.com/api/v5/market/ticker?instId=' + instId);
  if (!resp.ok) throw new Error('OKX API error: ' + resp.status);
  const json = await resp.json();
  if (!json.data || !json.data[0] || !json.data[0].last) {
    return { error: 'Coin not found: ' + symbol, hint: 'Try: BTC, ETH, SOL, OKB, XRP, ADA, DOGE, AVAX, DOT, LINK, MATIC, UNI, ATOM, LTC, ARB, OP, APT, NEAR, SUI, TON, PEPE, SHIB' };
  }
  const d = json.data[0];
  const price  = parseFloat(d.last);
  const open   = parseFloat(d.open24h);
  const change = open > 0 ? ((price - open) / open * 100) : 0;
  return {
    symbol, instId,
    priceUsd:  parseFloat(price.toFixed(price < 1 ? 8 : 2)),
    change24h: parseFloat(change.toFixed(2)),
    direction: change >= 0 ? 'up' : 'down',
    high24h:   parseFloat(parseFloat(d.high24h).toFixed(price < 1 ? 6 : 2)),
    low24h:    parseFloat(parseFloat(d.low24h).toFixed(price < 1 ? 6 : 2)),
    volume24h: parseFloat(parseFloat(d.volCcy24h || d.vol24h || '0').toFixed(0)),
    summary:   symbol + ' is $' + price.toFixed(price < 1 ? 6 : 2) + ' (' + (change >= 0 ? '+' : '') + change.toFixed(2) + '% 24h)',
    source: 'OKX', timestamp: new Date().toISOString(),
  };
}`;

    const DEFI_TVL_CODE = `async function run(input) {
  const query = (input.protocol || input.name || input.input || 'uniswap').toLowerCase().trim();
  const resp = await fetch('https://api.llama.fi/protocol/' + query);
  if (resp.status === 404) return { error: 'Protocol not found: ' + query, hint: 'Try: uniswap, aave, lido, compound, curve, gmx, makerdao, pancakeswap, hyperliquid' };
  if (!resp.ok) throw new Error('DeFiLlama API error: ' + resp.status);
  const d = await resp.json();
  const currentTvl = d.currentChainTvls ? Object.values(d.currentChainTvls).reduce((a, b) => a + b, 0) : (d.tvl && d.tvl.length ? d.tvl[d.tvl.length-1].totalLiquidityUSD : 0);
  const prevTvl = d.tvl && d.tvl.length > 1 ? d.tvl[d.tvl.length-2].totalLiquidityUSD : null;
  const change24h = prevTvl ? parseFloat(((currentTvl - prevTvl) / prevTvl * 100).toFixed(2)) : null;
  const topChains = d.currentChainTvls ? Object.entries(d.currentChainTvls).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([chain,tvl])=>({chain,tvlUsd:parseFloat(tvl.toFixed(0))})) : [];
  const fmt = currentTvl >= 1e9 ? '$' + (currentTvl/1e9).toFixed(2) + 'B' : '$' + (currentTvl/1e6).toFixed(1) + 'M';
  return { name: d.name, slug: query, category: d.category||null, chains: d.chains||[], tvlUsd: parseFloat(currentTvl.toFixed(2)), tvlFormatted: fmt, change24h, topChains, summary: (d.name||query) + ' TVL is ' + fmt + (change24h!==null?' ('+(change24h>=0?'+':'')+change24h+'% 24h)':''), source: 'DeFiLlama', timestamp: new Date().toISOString() };
}`;

    const FOREX_CODE = `async function run(input) {
  const from = (input.from || input.base || 'USD').toUpperCase().trim();
  const to   = (input.to || input.target || 'EUR').toUpperCase().trim();
  const amount = parseFloat(input.amount || '1');
  if (isNaN(amount) || amount <= 0) return { error: 'amount must be a positive number', example: { from:'USD', to:'EUR', amount:100 } };
  const resp = await fetch('https://api.frankfurter.app/latest?from=' + from);
  if (!resp.ok) throw new Error('Exchange rate API error: ' + resp.status);
  const data = await resp.json();
  if (!data.rates) return { error: 'Currency not found: ' + from, hint: 'Supported: USD, EUR, GBP, JPY, AUD, CAD, CHF, CNY, KRW, INR, BRL, MXN, SGD, HKD, NOK, SEK, DKK, NZD, ZAR, TRY' };
  if (to && to !== from && data.rates[to] !== undefined) {
    const rate = data.rates[to];
    const converted = parseFloat((amount * rate).toFixed(4));
    return { from, to, rate: parseFloat(rate.toFixed(6)), amount, result: converted, summary: amount + ' ' + from + ' = ' + converted + ' ' + to, date: data.date, source: 'Frankfurter ECB' };
  }
  const topRates = ['EUR','GBP','JPY','AUD','CAD','CHF','CNY','KRW','INR','BRL'].filter(c=>c!==from&&data.rates[c]).reduce((acc,c)=>{acc[c]=parseFloat((amount*data.rates[c]).toFixed(4));return acc;},{});
  return { base: from, amount, rates: topRates, date: data.date, summary: amount + ' ' + from + ' converted to top currencies', source: 'Frankfurter ECB' };
}`;

    const migrations = [
      { slug: 'crypto-price-checker',  code: OKX_CRYPTO_CODE },
      { slug: 'defi-tvl-checker',      code: DEFI_TVL_CODE       },
      { slug: 'currency-exchange-rate', code: FOREX_CODE          },
    ];

    for (const m of migrations) {
      const updated = await prisma.agent.updateMany({
        where: { slug: m.slug },
        data:  { code: m.code },
      });
      if (updated.count > 0) console.log(`[migration] updated agent code: ${m.slug}`);
    }
    console.log('[migration] startup migrations complete');
  } catch (err: any) {
    console.error('[migration] startup migration error (non-fatal):', err?.message);
  }
}

// ─── DB CONNECT + STARTUP MIGRATIONS ───────────────────────
console.log('[app] connecting to database...');
prisma.$connect()
  .then(async () => {
    console.log('[app] database connected');
    await runStartupMigrations();
  })
  .catch((err) => console.error('[app] database connect failed (non-fatal):', err?.message || err));

// ─── EXPORT for start.js ────────────────────────────────────
export { app };

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

console.log('[app] setup complete, app exported');

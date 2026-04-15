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

    const FEAR_GREED_CODE = `async function run(input) {
  const limit = Math.min(parseInt(input.days || input.limit || '7'), 30);
  const resp = await fetch('https://api.alternative.me/fng/?limit=' + limit + '&format=json');
  if (!resp.ok) throw new Error('Fear & Greed API error: ' + resp.status);
  const json = await resp.json();
  if (!json.data || !json.data[0]) throw new Error('No data returned');
  const current = json.data[0];
  const score = parseInt(current.value);
  const classification = current.value_classification;
  const trend = json.data.map(function(d) { return { date: new Date(parseInt(d.timestamp)*1000).toISOString().split('T')[0], score: parseInt(d.value), sentiment: d.value_classification }; });
  const avg = Math.round(trend.reduce(function(a,b){return a+b.score;},0)/trend.length);
  var signal,advice;
  if(score<=25){signal='EXTREME_FEAR';advice='Historically a buy opportunity — market is panicking';}
  else if(score<=45){signal='FEAR';advice='Market is fearful — possible accumulation zone';}
  else if(score<=55){signal='NEUTRAL';advice='Market sentiment is balanced';}
  else if(score<=75){signal='GREED';advice='Market is greedy — consider taking profits';}
  else{signal='EXTREME_GREED';advice='Historically a sell signal — market is euphoric';}
  return { score, classification, signal, advice, averageScore: avg, trend, summary: 'Crypto market is in '+classification+' (score: '+score+'/100, '+limit+'-day avg: '+avg+')', source:'Alternative.me', timestamp:new Date().toISOString() };
}`;

    const IP_INTEL_CODE = `async function run(input) {
  const ip = (input.ip || input.address || '').trim();
  if (!ip) return { error: 'Provide an IP address', example: { ip: '8.8.8.8' } };
  const resp = await fetch('https://ipwho.is/' + ip);
  if (!resp.ok) throw new Error('IP lookup error: ' + resp.status);
  const d = await resp.json();
  if (!d.success) return { error: d.message || 'IP lookup failed', ip, hint: 'Provide a valid public IPv4 or IPv6 address' };
  return {
    ip: d.ip, type: d.type,
    country: d.country, countryCode: d.country_code,
    region: d.region, city: d.city, postal: d.postal,
    timezone: d.timezone ? d.timezone.id : null,
    coordinates: { lat: d.latitude, lon: d.longitude },
    isp: d.connection ? d.connection.isp : null,
    org: d.connection ? d.connection.org : null,
    asn: d.connection ? d.connection.asn : null,
    summary: d.city + ', ' + d.country + ' (' + d.country_code + ') · ' + (d.connection ? d.connection.isp : 'Unknown ISP'),
    source: 'ipwho.is', timestamp: new Date().toISOString(),
  };
}`;

    const ETH_WALLET_CODE = `async function run(input) {
  const address = (input.address || input.wallet || input.addr || '').trim();
  if (!address) return { error: 'Provide an Ethereum address', example: { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' } };
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return { error: 'Invalid Ethereum address — must be 0x followed by 40 hex characters' };
  const RPCS = ['https://cloudflare-eth.com', 'https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com'];
  async function rpc(method, params) {
    var lastErr;
    for (var i = 0; i < RPCS.length; i++) {
      try {
        var r = await fetch(RPCS[i], { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0',method:method,params:params,id:1}) });
        if (!r.ok) { lastErr = new Error('RPC HTTP ' + r.status); continue; }
        var j = await r.json();
        if (j.error) { lastErr = new Error(j.error.message); continue; }
        return j.result;
      } catch(e) { lastErr = e; }
    }
    throw lastErr || new Error('All RPC endpoints failed');
  }
  const balanceHex = await rpc('eth_getBalance', [address, 'latest']);
  const code       = await rpc('eth_getCode',    [address, 'latest']);
  const txCountHex = await rpc('eth_getTransactionCount', [address, 'latest']);
  const balanceWei = parseInt(balanceHex, 16);
  const balanceEth = balanceWei / 1e18;
  const txCount    = parseInt(txCountHex, 16);
  const isContract = code && code !== '0x' && code.length > 2;
  return {
    address,
    balanceEth:  parseFloat(balanceEth.toFixed(8)),
    balanceWei:  balanceWei.toString(),
    txCount, isContract,
    type:  isContract ? 'Smart Contract' : 'EOA Wallet',
    risk: { isEmpty: balanceEth === 0 && txCount === 0, isNew: txCount < 5, hasBalance: balanceEth > 0 },
    summary: address.slice(0,6)+'...'+address.slice(-4)+' | '+balanceEth.toFixed(4)+' ETH | '+txCount+' txs | '+(isContract?'Contract':'Wallet'),
    network: 'Ethereum Mainnet', source: 'Cloudflare/Ankr RPC', timestamp: new Date().toISOString(),
  };
}`;

    const OWNER_WALLET = process.env.SEED_OWNER_WALLET || '0x492F0E1C2C32A524884B891f1B37A171c1A03764';

    // Create new agents if they don't exist yet
    const newAgents = [
      {
        slug: 'crypto-fear-greed-index', name: 'Crypto Fear & Greed Index',
        description: 'Get the live Crypto Fear & Greed Index score (0–100) with trend data for up to 30 days. Understand current market sentiment and get actionable trading signals.',
        category: 'TRADING', code: FEAR_GREED_CODE, pricePerCallUsdc: 0.05,
        tags: ['trading','sentiment','fear','greed','market-psychology'],
        inputSchema: { type:'object', properties:{ days:{type:'number',description:'Days of history (1–30, default 7)'} }, example:{ days:7 } },
      },
      {
        slug: 'ip-address-intelligence', name: 'IP Address Intelligence',
        description: 'Geolocate any IP address and get country, city, timezone, ISP, ASN, and risk flags (proxy, VPN, hosting, mobile). Useful for fraud detection and geo-targeting.',
        category: 'INTELLIGENCE', code: IP_INTEL_CODE, pricePerCallUsdc: 0.05,
        tags: ['ip','geolocation','intelligence','fraud','network'],
        inputSchema: { type:'object', properties:{ ip:{type:'string',description:'Public IPv4 or IPv6 address'} }, example:{ ip:'8.8.8.8' } },
      },
      {
        slug: 'ethereum-wallet-inspector', name: 'Ethereum Wallet Inspector',
        description: 'Inspect any Ethereum address — ETH balance, transaction count, contract detection, and risk signals. Powered by public Ethereum RPC.',
        category: 'RISK', code: ETH_WALLET_CODE, pricePerCallUsdc: 0.05,
        tags: ['ethereum','wallet','risk','on-chain','balance'],
        inputSchema: { type:'object', properties:{ address:{type:'string',description:'Ethereum address (0x...)'} }, example:{ address:'0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' } },
      },
    ];

    // Find or create owner user
    let owner = await prisma.user.findUnique({ where: { walletAddress: OWNER_WALLET } });
    if (!owner) {
      owner = await prisma.user.create({ data: { walletAddress: OWNER_WALLET, username: 'agentmarket', bio: 'AgentMarket platform account' } });
    }

    for (const a of newAgents) {
      const exists = await prisma.agent.findUnique({ where: { slug: a.slug } });
      if (!exists) {
        await (prisma.agent as any).create({
          data: { ownerId: owner.id, walletAddress: OWNER_WALLET, status: 'ACTIVE', isVerified: true, name: a.name, slug: a.slug, description: a.description, category: a.category, code: a.code, pricePerCallUsdc: a.pricePerCallUsdc, tags: a.tags, inputSchema: a.inputSchema },
        });
        console.log(`[migration] created new agent: ${a.name}`);
      } else {
        await prisma.agent.update({ where: { slug: a.slug }, data: { code: a.code } });
        console.log(`[migration] refreshed agent: ${a.name}`);
      }
    }

    const migrations = [
      { slug: 'crypto-price-checker',   code: OKX_CRYPTO_CODE  },
      { slug: 'defi-tvl-checker',       code: DEFI_TVL_CODE    },
      { slug: 'currency-exchange-rate', code: FOREX_CODE        },
      { slug: 'crypto-fear-greed-index',    code: FEAR_GREED_CODE },
      { slug: 'ip-address-intelligence',    code: IP_INTEL_CODE   },
      { slug: 'ethereum-wallet-inspector',  code: ETH_WALLET_CODE },
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

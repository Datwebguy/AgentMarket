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
      { slug: 'currency-exchange-rate',    code: FOREX_CODE       },
      { slug: 'crypto-fear-greed-index',   code: FEAR_GREED_CODE  },
      { slug: 'ip-address-intelligence',   code: IP_INTEL_CODE    },
      { slug: 'ethereum-wallet-inspector', code: ETH_WALLET_CODE  },
    ];

    for (const m of migrations) {
      const updated = await prisma.agent.updateMany({
        where: { slug: m.slug },
        data:  { code: m.code },
      });
      if (updated.count > 0) console.log(`[migration] updated agent code: ${m.slug}`);
    }

    // ── 3 new agents ──────────────────────────────────────────────────────────
    const WHALE_TRACKER_CODE = `async function run(input) {
  const pair   = (input.pair || input.symbol || 'BTC-USDT').toUpperCase().replace('/', '-');
  const minUsd = parseFloat(input.minUsd || input.min || '500000');
  const resp = await fetch('https://www.okx.com/api/v5/market/trades?instId=' + pair + '&limit=100');
  if (!resp.ok) throw new Error('OKX API error: ' + resp.status);
  const json = await resp.json();
  if (!json.data || json.data.length === 0) return { error: 'No trades found for: ' + pair, hint: 'Try: BTC-USDT, ETH-USDT, SOL-USDT, OKB-USDT' };
  const trades = json.data.map(function(t) {
    var usd = parseFloat(t.px) * parseFloat(t.sz);
    return { side: t.side, price: parseFloat(t.px), size: parseFloat(t.sz), usdValue: parseFloat(usd.toFixed(2)), time: new Date(parseInt(t.ts)).toISOString() };
  });
  const whales = trades.filter(function(t) { return t.usdValue >= minUsd; }).sort(function(a,b) { return b.usdValue - a.usdValue; });
  var buyVol = 0, sellVol = 0;
  whales.forEach(function(t) { if(t.side==='buy') buyVol+=t.usdValue; else sellVol+=t.usdValue; });
  var pressure = buyVol >= sellVol ? 'BUYING' : 'SELLING';
  return {
    pair, minUsdThreshold: minUsd, whaleCount: whales.length,
    topWhales: whales.slice(0, 10),
    buyVolumeUsd: parseFloat(buyVol.toFixed(2)),
    sellVolumeUsd: parseFloat(sellVol.toFixed(2)),
    totalVolumeUsd: parseFloat((buyVol + sellVol).toFixed(2)),
    pressure,
    signal: pressure === 'BUYING' ? 'Whales accumulating — bullish pressure' : 'Whales distributing — bearish pressure',
    summary: whales.length + ' whale trades in ' + pair + ' above $' + minUsd.toLocaleString() + ' — ' + pressure + ' pressure',
    source: 'OKX', timestamp: new Date().toISOString(),
  };
}`;

    const TRENDING_CODE = `async function run(input) {
  var filter = (input.filter || input.type || 'gainers').toLowerCase();
  var limit  = Math.min(parseInt(input.limit || '10'), 25);
  var minVol = parseFloat(input.minVolume || '500000');
  var resp = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
  if (!resp.ok) throw new Error('OKX API error: ' + resp.status);
  var json = await resp.json();
  if (!json.data) return { error: 'No data returned' };
  var tickers = json.data
    .filter(function(t) { return t.instId.endsWith('-USDT') && parseFloat(t.volCcy24h || '0') >= minVol; })
    .map(function(t) {
      var price = parseFloat(t.last);
      var open  = parseFloat(t.open24h);
      var chg   = open > 0 ? ((price - open) / open * 100) : 0;
      return { symbol: t.instId.replace('-USDT',''), pair: t.instId, price: price, change24h: parseFloat(chg.toFixed(2)), volume24hUsd: parseFloat(parseFloat(t.volCcy24h||'0').toFixed(0)), high24h: parseFloat(t.high24h), low24h: parseFloat(t.low24h) };
    });
  var sorted;
  if (filter === 'losers')       sorted = tickers.sort(function(a,b){return a.change24h - b.change24h;});
  else if (filter === 'volume')  sorted = tickers.sort(function(a,b){return b.volume24hUsd - a.volume24hUsd;});
  else                           sorted = tickers.sort(function(a,b){return b.change24h - a.change24h;});
  var top = sorted.slice(0, limit);
  var leader = top[0];
  return {
    filter, count: top.length, tokens: top,
    summary: 'Top ' + limit + ' ' + filter + ' on OKX — ' + (leader ? leader.symbol + ' leads at ' + (leader.change24h >= 0 ? '+' : '') + leader.change24h + '%' : 'no data'),
    source: 'OKX', timestamp: new Date().toISOString(),
  };
}`;

    const SWAP_QUOTE_CODE = `async function run(input) {
  var chainId   = parseInt(input.chainId || '196');
  var fromToken = (input.fromToken || input.from || '').toLowerCase().trim();
  var toToken   = (input.toToken   || input.to   || '').toLowerCase().trim();
  var amountRaw = input.amount || '1000000';
  var chainNames = { 1:'Ethereum', 137:'Polygon', 196:'XLayer', 42161:'Arbitrum', 8453:'Base', 10:'Optimism', 56:'BSC' };

  // Well-known token addresses → OKX symbol + decimals
  var TOKEN_MAP = {
    // XLayer (196)
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': { symbol:'OKB',  decimals:18 },
    '0x74b7f16337b8972027f6196a17a631ac6de26d22': { symbol:'USDC', decimals:6  },
    '0x1e4a5963abfd975d8c9021ce480b42188849d41d': { symbol:'USDT', decimals:6  },
    '0x5a77f1443d16ee5761d310e38b62f77f726bc71c': { symbol:'WETH', decimals:18 },
    // Ethereum (1)
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol:'USDC', decimals:6  },
    '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol:'USDT', decimals:6  },
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol:'WETH', decimals:18 },
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol:'WBTC', decimals:8  },
    '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol:'DAI',  decimals:18 },
    // Arbitrum (42161)
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': { symbol:'USDC', decimals:6  },
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol:'USDT', decimals:6  },
    // Base (8453)
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol:'USDC', decimals:6  },
  };

  // Allow passing symbol names directly as fromToken/toToken
  var SYMBOL_MAP = { 'okb':'OKB','usdc':'USDC','usdt':'USDT','weth':'WETH','eth':'ETH','wbtc':'WBTC','btc':'BTC','dai':'DAI','sol':'SOL','bnb':'BNB' };

  function resolveToken(addrOrSym) {
    if (TOKEN_MAP[addrOrSym]) return { address: addrOrSym, ...TOKEN_MAP[addrOrSym] };
    var sym = SYMBOL_MAP[addrOrSym.toLowerCase()];
    if (sym) return { address: addrOrSym, symbol: sym, decimals: sym === 'USDC' || sym === 'USDT' ? 6 : 18 };
    return null;
  }

  var STABLE = ['USDC','USDT','DAI','BUSD','FRAX','LUSD'];

  async function getPrice(symbol) {
    if (STABLE.indexOf(symbol) !== -1) return 1.0;
    var sym = symbol === 'WETH' ? 'ETH' : symbol === 'WBTC' ? 'BTC' : symbol;
    var r = await fetch('https://www.okx.com/api/v5/market/ticker?instId=' + sym + '-USDT');
    if (!r.ok) throw new Error('OKX price fetch failed for ' + sym + ' (HTTP ' + r.status + ')');
    var j = await r.json();
    if (!j.data || !j.data[0] || !j.data[0].last) throw new Error('No price data for ' + sym + '. Try using a token symbol like ETH, BTC, OKB.');
    return parseFloat(j.data[0].last);
  }

  var fromInfo = resolveToken(fromToken);
  var toInfo   = resolveToken(toToken);

  if (!fromInfo) return { error: 'fromToken not recognized: ' + fromToken, hint: 'Use a known contract address or symbol (usdc, usdt, eth, btc, okb, weth, wbtc, dai)' };
  if (!toInfo)   return { error: 'toToken not recognized: '   + toToken,   hint: 'Use a known contract address or symbol (usdc, usdt, eth, btc, okb, weth, wbtc, dai)' };

  var fromPrice = await getPrice(fromInfo.symbol);
  var toPrice   = await getPrice(toInfo.symbol);

  var fromAmount = parseFloat(amountRaw) / Math.pow(10, fromInfo.decimals);
  var fromUsd    = fromAmount * fromPrice;
  var toAmount   = toPrice > 0 ? fromUsd / toPrice : 0;
  var rate       = fromAmount > 0 ? toAmount / fromAmount : 0;

  return {
    network:  chainNames[chainId] || 'Chain ' + chainId, chainId,
    from: { symbol: fromInfo.symbol, address: fromInfo.address, amount: parseFloat(fromAmount.toFixed(6)), priceUsd: fromPrice, valueUsd: parseFloat(fromUsd.toFixed(4)) },
    to:   { symbol: toInfo.symbol,   address: toInfo.address,   amount: parseFloat(toAmount.toFixed(6)),   priceUsd: toPrice },
    rate:    parseFloat(rate.toFixed(6)),
    summary: fromAmount + ' ' + fromInfo.symbol + ' → ' + toAmount.toFixed(4) + ' ' + toInfo.symbol + ' (1 ' + fromInfo.symbol + ' = ' + rate.toFixed(4) + ' ' + toInfo.symbol + ')',
    note:    'Indicative rate from OKX spot prices. Actual DEX rate may vary ±0.1–2% due to slippage and fees.',
    source:  'OKX Market Prices', timestamp: new Date().toISOString(),
  };
}`;

    const newAgents3 = [
      {
        slug: 'okx-whale-tracker', name: 'OKX Whale Tracker',
        description: 'Detect large whale trades on any OKX trading pair in real time. Pass a pair like BTC-USDT and a minimum USD threshold to surface the biggest trades, track buy vs sell pressure, and get a directional market signal. Ideal for traders and analysts watching smart money.',
        category: 'TRADING', code: WHALE_TRACKER_CODE, pricePerCallUsdc: 0.05,
        tags: ['whale', 'trading', 'okx', 'on-chain', 'market-data'],
        inputSchema: { type:'object', properties:{ pair:{type:'string',description:'Trading pair e.g. BTC-USDT'}, minUsd:{type:'number',description:'Minimum USD trade size (default 500000)'} }, example:{ pair:'ETH-USDT', minUsd:500000 } },
      },
      {
        slug: 'trending-tokens-scanner', name: 'Trending Tokens Scanner',
        description: 'Scan all OKX spot markets and surface the top gaining, losing, or highest-volume tokens right now. Filter by gainers, losers, or volume. Returns price, 24h change, and volume for each token. Perfect for finding momentum plays and market movers.',
        category: 'INTELLIGENCE', code: TRENDING_CODE, pricePerCallUsdc: 0.05,
        tags: ['trending', 'tokens', 'gainers', 'losers', 'okx'],
        inputSchema: { type:'object', properties:{ filter:{type:'string',description:'gainers | losers | volume (default gainers)'}, limit:{type:'number',description:'Number of results (max 25, default 10)'} }, example:{ filter:'gainers', limit:10 } },
      },
      {
        slug: 'dex-swap-quote', name: 'DEX Swap Quote',
        description: 'Get the best on-chain swap quote for any token pair across XLayer, Ethereum, Arbitrum, Base, Polygon and more — powered by OKX DEX Aggregator across 500+ liquidity sources. Returns rate, price impact, and best routes. XLayer (chainId 196) is the default chain.',
        category: 'DEFI', code: SWAP_QUOTE_CODE, pricePerCallUsdc: 0.05,
        tags: ['dex', 'swap', 'xlayer', 'okx', 'defi', 'aggregator'],
        inputSchema: { type:'object', properties:{ chainId:{type:'number',description:'Chain ID: 196=XLayer, 1=ETH, 42161=Arbitrum, 137=Polygon, 8453=Base'}, fromToken:{type:'string',description:'From token contract address'}, toToken:{type:'string',description:'To token contract address'}, amount:{type:'string',description:'Amount in wei (default 1e18 = 1 token)'} }, example:{ chainId:196, fromToken:'0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', toToken:'0x74b7f16337b8972027f6196a17a631ac6de26d22', amount:'1000000000000000000' } },
      },
    ];

    for (const a of newAgents3) {
      const exists = await prisma.agent.findUnique({ where: { slug: a.slug } });
      if (!exists) {
        await (prisma.agent as any).create({
          data: { ownerId: owner.id, walletAddress: OWNER_WALLET, status:'ACTIVE', isVerified:true, name:a.name, slug:a.slug, description:a.description, category:a.category, code:a.code, pricePerCallUsdc:a.pricePerCallUsdc, tags:a.tags, inputSchema:a.inputSchema },
        });
        console.log(`[migration] created: ${a.name}`);
      } else {
        await prisma.agent.update({ where:{ slug: a.slug }, data:{ code: a.code } });
        console.log(`[migration] refreshed: ${a.name}`);
      }
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

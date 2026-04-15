/**
 * Seed script — creates/updates all platform demo agents.
 * Run: SEED_OWNER_WALLET=0x... npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OWNER_WALLET = process.env.SEED_OWNER_WALLET || '0x0000000000000000000000000000000000000001';

// ── Agent 1: Crypto Price Checker (uses CoinCap — no rate limits) ─────────────
const CRYPTO_PRICE_CODE = `
async function run(input) {
  // Accept any of these input keys: symbol, ticker, coin, name, input
  const raw = (input.symbol || input.ticker || input.coin || input.name || input.input || 'bitcoin').toLowerCase().trim();

  const idMap = {
    btc: 'bitcoin', bitcoin: 'bitcoin',
    eth: 'ethereum', ethereum: 'ethereum',
    sol: 'solana', solana: 'solana',
    okb: 'okb',
    bnb: 'binance-coin', binance: 'binance-coin',
    usdc: 'usd-coin',
    xrp: 'xrp', ripple: 'xrp',
    ada: 'cardano', cardano: 'cardano',
    doge: 'dogecoin', dogecoin: 'dogecoin',
    avax: 'avalanche', avalanche: 'avalanche',
    dot: 'polkadot', polkadot: 'polkadot',
    link: 'chainlink', chainlink: 'chainlink',
    matic: 'polygon', pol: 'polygon', polygon: 'polygon',
    uni: 'uniswap', uniswap: 'uniswap',
    atom: 'cosmos', cosmos: 'cosmos',
    ltc: 'litecoin', litecoin: 'litecoin',
    near: 'near-protocol',
    arb: 'arbitrum', arbitrum: 'arbitrum',
    op: 'optimism', optimism: 'optimism',
    apt: 'aptos', aptos: 'aptos',
    sui: 'sui',
  };

  const assetId = idMap[raw] || raw;

  const resp = await fetch('https://api.coincap.io/v2/assets/' + assetId);
  if (!resp.ok) throw new Error('Price API error: ' + resp.status);
  const json = await resp.json();

  if (!json.data) {
    return { error: 'Coin not found: ' + raw, hint: 'Try: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, DOT, LINK' };
  }

  const d = json.data;
  const price    = parseFloat(d.priceUsd);
  const change   = parseFloat(d.changePercent24Hr || '0');
  const mcap     = d.marketCapUsd ? parseFloat(d.marketCapUsd) : null;

  return {
    symbol:      (d.symbol || raw).toUpperCase(),
    name:         d.name,
    priceUsd:     parseFloat(price.toFixed(price < 1 ? 8 : 2)),
    change24h:    parseFloat(change.toFixed(2)),
    direction:    change >= 0 ? 'up' : 'down',
    marketCapUsd: mcap ? parseFloat(mcap.toFixed(0)) : null,
    rank:         d.rank ? parseInt(d.rank) : null,
    summary:      d.name + ' is $' + price.toFixed(price < 1 ? 6 : 2) + ' (' + (change >= 0 ? '+' : '') + change.toFixed(2) + '% 24h)',
    source:      'CoinCap',
    timestamp:    new Date().toISOString(),
  };
}
`.trim();

// ── Agent 2: DeFi Protocol TVL ──────────────────────────────────────────────
const DEFI_TVL_CODE = `
async function run(input) {
  const query = (input.protocol || input.name || 'uniswap').toLowerCase().trim();

  // Fetch protocol data from DeFiLlama
  const resp = await fetch('https://api.llama.fi/protocol/' + query);
  if (resp.status === 404) {
    return {
      error: 'Protocol not found: ' + query,
      hint: 'Try: uniswap, aave, compound, curve, lido, makerdao, gmx, pancakeswap, hyperliquid',
    };
  }
  if (!resp.ok) throw new Error('DeFiLlama API error: ' + resp.status);

  const d = await resp.json();

  const currentTvl = d.currentChainTvls
    ? Object.values(d.currentChainTvls).reduce((a, b) => a + b, 0)
    : (d.tvl && d.tvl.length ? d.tvl[d.tvl.length - 1].totalLiquidityUSD : 0);

  const prevTvl = d.tvl && d.tvl.length > 1 ? d.tvl[d.tvl.length - 2].totalLiquidityUSD : null;
  const change24h = prevTvl ? parseFloat(((currentTvl - prevTvl) / prevTvl * 100).toFixed(2)) : null;

  const topChains = d.currentChainTvls
    ? Object.entries(d.currentChainTvls)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([chain, tvl]) => ({ chain, tvlUsd: parseFloat(tvl.toFixed(0)) }))
    : [];

  const tvlB = (currentTvl / 1e9).toFixed(2);
  const tvlM = (currentTvl / 1e6).toFixed(1);

  return {
    name:         d.name,
    slug:         query,
    category:     d.category || null,
    chains:       d.chains || [],
    tvlUsd:       parseFloat(currentTvl.toFixed(2)),
    tvlFormatted: currentTvl >= 1e9 ? '$' + tvlB + 'B' : '$' + tvlM + 'M',
    change24h,
    topChains,
    url:          d.url || null,
    summary:      (d.name || query) + ' TVL is ' + (currentTvl >= 1e9 ? '$' + tvlB + 'B' : '$' + tvlM + 'M') + (change24h !== null ? ' (' + (change24h >= 0 ? '+' : '') + change24h + '% 24h)' : ''),
    source:      'DeFiLlama',
    timestamp:    new Date().toISOString(),
  };
}
`.trim();

// ── Agent 3: Currency Exchange Rate ────────────────────────────────────────
const FOREX_CODE = `
async function run(input) {
  const from   = (input.from   || input.base   || 'USD').toUpperCase().trim();
  const to     = (input.to     || input.target || 'EUR').toUpperCase().trim();
  const amount = parseFloat(input.amount || '1');

  if (isNaN(amount) || amount <= 0) {
    return { error: 'amount must be a positive number', example: { from: 'USD', to: 'EUR', amount: 100 } };
  }

  const resp = await fetch('https://api.frankfurter.app/latest?from=' + from);
  if (!resp.ok) throw new Error('Exchange rate API error: ' + resp.status);
  const data = await resp.json();

  if (!data.rates) {
    return { error: 'Currency not found: ' + from, hint: 'Supported: USD, EUR, GBP, JPY, AUD, CAD, CHF, CNY, KRW, INR, BRL, MXN, SGD, HKD, NOK, SEK, DKK, NZD, ZAR, TRY' };
  }

  // Return single pair or full rates
  if (to && to !== from && data.rates[to] !== undefined) {
    const rate      = data.rates[to];
    const converted = parseFloat((amount * rate).toFixed(4));
    return {
      from, to,
      rate:      parseFloat(rate.toFixed(6)),
      amount,
      result:    converted,
      summary:   amount + ' ' + from + ' = ' + converted + ' ' + to,
      date:      data.date,
      source:   'Frankfurter ECB',
    };
  }

  // Multi-currency snapshot
  const topRates = ['EUR','GBP','JPY','AUD','CAD','CHF','CNY','KRW','INR','BRL']
    .filter(c => c !== from && data.rates[c])
    .reduce((acc, c) => {
      acc[c] = parseFloat((amount * data.rates[c]).toFixed(4));
      return acc;
    }, {});

  return {
    base:    from,
    amount,
    rates:   topRates,
    date:    data.date,
    summary: amount + ' ' + from + ' converted to top currencies',
    source: 'Frankfurter ECB',
  };
}
`.trim();

// ── Seed ────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('Seeding database...');
  console.log('Owner wallet:', OWNER_WALLET);

  // Upsert owner user
  const owner = await prisma.user.upsert({
    where:  { walletAddress: OWNER_WALLET },
    update: {},
    create: {
      walletAddress: OWNER_WALLET,
      username:      'agentmarket',
      bio:           'AgentMarket platform account',
    },
  });
  console.log('Owner user:', owner.id, owner.walletAddress);

  const agents = [
    {
      slug:             'crypto-price-checker',
      name:             'Crypto Price Checker',
      description:      'Get real-time cryptocurrency prices, 24h change, market cap, and rank for any token. Supports BTC, ETH, SOL, OKB, BNB, XRP, and thousands more. Just pass a ticker symbol like BTC or full name like bitcoin.',
      category:         'DEFI' as const,
      code:             CRYPTO_PRICE_CODE,
      pricePerCallUsdc: 0.001,
      tags:             ['crypto', 'price', 'defi', 'market-data', 'coincap'],
      isVerified:       true,
      inputSchema: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Ticker (BTC, ETH, SOL…) or name (bitcoin, ethereum…)' },
        },
        example: { symbol: 'BTC' },
      },
    },
    {
      slug:             'defi-tvl-checker',
      name:             'DeFi TVL Checker',
      description:      'Look up the Total Value Locked (TVL) for any DeFi protocol — Uniswap, Aave, Compound, Lido, GMX, and more. Returns TVL in USD, 24h change, top chains, and category powered by DeFiLlama.',
      category:         'DEFI' as const,
      code:             DEFI_TVL_CODE,
      pricePerCallUsdc: 0.001,
      tags:             ['defi', 'tvl', 'protocols', 'defillama', 'on-chain'],
      isVerified:       true,
      inputSchema: {
        type: 'object',
        properties: {
          protocol: { type: 'string', description: 'Protocol slug or name (e.g. uniswap, aave, lido)' },
        },
        example: { protocol: 'uniswap' },
      },
    },
    {
      slug:             'currency-exchange-rate',
      name:             'Currency Exchange Rate',
      description:      'Convert between 30+ world currencies using live ECB exchange rates. Pass any two currency codes and an optional amount to get the converted value. Supports USD, EUR, GBP, JPY, AUD, CAD, CHF, CNY and more.',
      category:         'PAYMENTS' as const,
      code:             FOREX_CODE,
      pricePerCallUsdc: 0.001,
      tags:             ['forex', 'currency', 'exchange', 'payments', 'ecb'],
      isVerified:       true,
      inputSchema: {
        type: 'object',
        properties: {
          from:   { type: 'string', description: 'Base currency code (e.g. USD)' },
          to:     { type: 'string', description: 'Target currency code (e.g. EUR)' },
          amount: { type: 'number', description: 'Amount to convert (default 1)' },
        },
        example: { from: 'USD', to: 'EUR', amount: 100 },
      },
    },
  ];

  for (const a of agents) {
    const existing = await prisma.agent.findUnique({ where: { slug: a.slug } });
    if (existing) {
      // Update the code in case it changed (e.g. API fix)
      await prisma.agent.update({
        where: { slug: a.slug },
        data:  {
          code:        a.code,
          description: a.description,
          tags:        a.tags,
          isVerified:  a.isVerified,
          inputSchema: a.inputSchema as any,
        },
      });
      console.log('Updated:', a.name);
    } else {
      await prisma.agent.create({
        data: {
          ownerId:          owner.id,
          walletAddress:    OWNER_WALLET,
          status:           'ACTIVE',
          name:             a.name,
          slug:             a.slug,
          description:      a.description,
          category:         a.category,
          code:             a.code,
          pricePerCallUsdc: a.pricePerCallUsdc,
          tags:             a.tags,
          isVerified:       a.isVerified,
          inputSchema:      a.inputSchema as any,
        },
      });
      console.log('Created:', a.name);
    }
  }

  console.log('Done!');
}

seed()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

/**
 * Seed script — restores the Crypto Price Checker demo agent.
 * Run: npx ts-node prisma/seed.ts
 *
 * The agent is created under a "platform" user account (Datwebguy's wallet).
 * If the user already exists it is reused; if the agent already exists it is skipped.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── config ──────────────────────────────────────────────────────────────────
const OWNER_WALLET = process.env.SEED_OWNER_WALLET || '0x0000000000000000000000000000000000000001';

const CRYPTO_PRICE_CODE = `
// Crypto Price Checker — resolves common tickers via CoinGecko free API
const symbolMap = {
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum',
  sol: 'solana', solana: 'solana',
  okb: 'okb',
  usdc: 'usd-coin',
  bnb: 'binancecoin',
  xrp: 'ripple',
  ada: 'cardano',
  doge: 'dogecoin',
  avax: 'avalanche-2',
  dot: 'polkadot',
  link: 'chainlink',
  matic: 'matic-network', pol: 'matic-network',
  uni: 'uniswap',
  atom: 'cosmos',
  ltc: 'litecoin',
  near: 'near',
  apt: 'aptos',
  arb: 'arbitrum',
  op: 'optimism',
};

async function main(input) {
  const raw = (input.symbol || input.ticker || 'bitcoin').toLowerCase().trim();
  const coinId = symbolMap[raw] || raw;

  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + coinId + '&vs_currencies=usd&include_24hr_change=true&include_market_cap=true';

  const resp = await fetch(url);
  if (!resp.ok) throw new Error('CoinGecko API error: ' + resp.status);

  const data = await resp.json();
  if (!data[coinId]) {
    return {
      error: 'Coin not found: ' + raw,
      hint: 'Try a common symbol like BTC, ETH, SOL, or a CoinGecko ID like bitcoin',
    };
  }

  const coin = data[coinId];
  return {
    symbol: raw.toUpperCase(),
    coinId,
    priceUsd: coin.usd,
    change24h: coin.usd_24h_change ? parseFloat(coin.usd_24h_change.toFixed(2)) : null,
    marketCapUsd: coin.usd_market_cap || null,
    source: 'CoinGecko',
    timestamp: new Date().toISOString(),
  };
}

return main(input);
`.trim();

// ── seed ────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('Seeding database...');

  // 1. Upsert owner user
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

  // 2. Check if the agent already exists
  const existing = await prisma.agent.findUnique({ where: { slug: 'crypto-price-checker' } });
  if (existing) {
    console.log('Crypto Price Checker already exists, skipping.');
    return;
  }

  // 3. Create the agent
  const agent = await prisma.agent.create({
    data: {
      ownerId:          owner.id,
      name:             'Crypto Price Checker',
      slug:             'crypto-price-checker',
      description:      'Get real-time cryptocurrency prices, 24h change, and market cap for any token. Supports BTC, ETH, SOL, OKB, and hundreds more via CoinGecko. Just pass a ticker symbol.',
      category:         'INTELLIGENCE',
      code:             CRYPTO_PRICE_CODE,
      pricePerCallUsdc: 0.001,
      walletAddress:    OWNER_WALLET,
      tags:             ['crypto', 'price', 'defi', 'coingecko', 'market-data'],
      status:           'ACTIVE',
      isVerified:       true,
      inputSchema: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Ticker symbol (BTC, ETH, SOL, OKB…) or CoinGecko ID' },
        },
        required: ['symbol'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          symbol:       { type: 'string' },
          priceUsd:     { type: 'number' },
          change24h:    { type: 'number' },
          marketCapUsd: { type: 'number' },
        },
      },
    },
  });

  console.log('Created agent:', agent.id, agent.name, agent.slug);
  console.log('Done!');
}

seed()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

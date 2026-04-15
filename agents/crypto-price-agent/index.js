const express = require('express');
const axios   = require('axios');

const app = express();
app.use(express.json());

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', agent: 'Crypto Price Checker' });
});

// Main agent endpoint
app.post('/run', async (req, res) => {
  try {
    const rawCoin     = req.body?.coin ?? req.body?.input ?? req.body?.symbol ?? req.body?.token ?? null;
    const rawCurrency = req.body?.currency ?? 'usd';

    if (!rawCoin || typeof rawCoin !== 'string' || !rawCoin.trim()) {
      return res.status(400).json({
        error:   'Missing required parameter: coin',
        message: 'Provide a coin name in the payload.',
        example: { coin: 'bitcoin', currency: 'usd' },
      });
    }

    const coinId   = rawCoin.trim().toLowerCase().replace(/\s+/g, '-');
    const currency = (typeof rawCurrency === 'string' ? rawCurrency.trim().toLowerCase() : 'usd');

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true`;

    const { data } = await axios.get(url, { timeout: 10000 });

    if (!data[coinId] || data[coinId][currency] === undefined) {
      return res.status(404).json({
        error:    `Coin "${coinId}" not found or not priced in "${currency}".`,
        hint:     'Use the CoinGecko ID e.g. bitcoin, ethereum, solana, okb, cardano',
        received: coinId,
      });
    }

    const price     = data[coinId][currency] ?? 0;
    const change24h = data[coinId][`${currency}_24h_change`] ?? 0;
    const marketCap = data[coinId][`${currency}_market_cap`] ?? 0;

    res.json({
      coin:      coinId,
      currency:  currency.toUpperCase(),
      price,
      change24h: parseFloat(change24h.toFixed(2)),
      marketCap,
      direction: change24h >= 0 ? 'up' : 'down',
      summary:   `${coinId} is $${price.toLocaleString()} ${currency.toUpperCase()} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% in 24h)`,
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price', detail: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Crypto Price Agent running on port ${PORT}`);
});

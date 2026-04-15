const express = require('express');
const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', agent: 'Crypto Price Checker' });
});

// Main agent endpoint — AgentMarket calls this
app.post('/run', async (req, res) => {
  try {
    // Accept coin from multiple common field names callers might use
    const rawCoin     = req.body?.coin ?? req.body?.input ?? req.body?.symbol ?? req.body?.token ?? null;
    const rawCurrency = req.body?.currency ?? 'usd';

    // Strict required check
    if (!rawCoin || typeof rawCoin !== 'string' || !rawCoin.trim()) {
      return res.status(400).json({
        error:   'Missing required parameter: coin',
        message: 'Provide a coin name in the payload. Example: {"coin": "bitcoin"}',
        example: { coin: 'bitcoin', currency: 'usd' },
      });
    }

    const coinId  = rawCoin.trim().toLowerCase().replace(/\s+/g, '-');
    const currency = (typeof rawCurrency === 'string' ? rawCurrency : 'usd').trim().toLowerCase();

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({ error: `CoinGecko API error: ${response.status}` });
    }

    const data = await response.json();

    if (!data[coinId] || !data[coinId][currency]) {
      return res.status(404).json({
        error:    `Coin "${coinId}" not found or not priced in "${currency}".`,
        hint:     'Use the CoinGecko ID e.g. bitcoin, ethereum, solana, okb, cardano, chainlink',
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
app.listen(PORT, () => console.log(`Crypto Price Agent running on port ${PORT}`));

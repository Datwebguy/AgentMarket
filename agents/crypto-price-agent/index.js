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
    const { coin = 'bitcoin', currency = 'usd' } = req.body;

    if (!coin || typeof coin !== 'string') {
      return res.status(400).json({ error: 'Provide a coin name e.g. bitcoin, ethereum, solana' });
    }

    const coinId = coin.toLowerCase().trim().replace(/\s+/g, '-');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data[coinId]) {
      return res.status(404).json({
        error: `Coin "${coin}" not found. Try: bitcoin, ethereum, solana, okb, cardano`,
      });
    }

    const price     = data[coinId][currency];
    const change24h = data[coinId][`${currency}_24h_change`];
    const marketCap = data[coinId][`${currency}_market_cap`];

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

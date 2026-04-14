# Onboarding the First 10 Agents

## Why Manual Onboarding Matters

The first 10 agents set the tone for the entire marketplace. They define quality standards,
seed the leaderboard, and give callers a reason to come back. Hand-pick and manually verify each one.

---

## What Makes a Good First Agent

A strong first agent has:
- A clear, specific capability (not "does everything")
- Sub-2 second response time
- Well-defined input schema (so callers know what to send)
- A real use case in DeFi, trading, or intelligence
- The builder reachable via X or Telegram

---

## Agent Categories to Fill First

Aim for at least 2 agents per category before launch:

| Category       | Target agents | Why first                            |
|---------------|---------------|--------------------------------------|
| RISK          | 2             | Every trader needs risk scanning     |
| DEFI          | 2             | Yield and liquidity are always hot   |
| TRADING       | 2             | Swap routing drives call volume      |
| INTELLIGENCE  | 2             | Sentiment and whale tracking go viral|
| INFRASTRUCTURE| 1             | Utility agents drive developer trust |
| PAYMENTS      | 1             | Showcases the x402 protocol itself   |

---

## Onboarding Checklist Per Agent

For each agent you manually onboard, do the following:

### Step 1 — Verify the endpoint
```bash
curl -X POST https://their-endpoint.xyz/api/call \
  -H "Content-Type: application/json" \
  -d '{"input": "0xABC..."}'
```
The response must be valid JSON within 5 seconds.

### Step 2 — Register via API (you as admin)
```bash
curl -X POST https://api.agentmarket.xyz/v1/agents \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name":             "Token Risk Scanner",
    "description":      "Deep security scan for EVM tokens. Detects honeypots, rug pull vectors, and holder concentration risks.",
    "category":         "RISK",
    "endpointUrl":      "https://their-endpoint.xyz/api/call",
    "pricePerCallUsdc": 0.002,
    "tags":             ["risk", "security", "token", "defi"]
  }'
```

### Step 3 — Verify the agent via admin
```bash
curl -X POST https://api.agentmarket.xyz/v1/admin/agents/AGENT_ID/verify \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```
Verified agents get a checkmark on their listing.

### Step 4 — Test the full x402 flow
Run the quickstart code from the docs page with the agent's real endpoint.
Confirm the payment settles on XLayer and the result is correct.

### Step 5 — Write the listing copy
Good listing copy converts browsers into callers. Guidelines:
- Description: 1 sentence about capability, 1 about the data source used
- Tags: max 4, all lowercase, specific (not generic like "ai")
- Price: research comparable services to set a fair per-call price

---

## Suggested First 10 Agents

These are the 10 agents you should prioritize finding and onboarding:

1. **Token Risk Scanner** — RISK — OKX Security API based
2. **Whale Wallet Tracker** — INTELLIGENCE — Smart money flow on XLayer
3. **Swap Route Optimizer** — TRADING — OKX DEX + Uniswap V3 routing
4. **DeFi Yield Finder** — DEFI — Scans Aave, Lido, PancakeSwap on XLayer
5. **Portfolio Health Scorer** — DEFI — Wallet analysis and rebalancing tips
6. **Token Sentiment Oracle** — INTELLIGENCE — Social signals and onchain volume
7. **Gas Fee Estimator** — INFRASTRUCTURE — Real-time XLayer gas predictions
8. **Contract Auditor Lite** — RISK — Automated contract vulnerability scanning
9. **Liquidity Pool Monitor** — DEFI — Pool depth and impermanent loss tracking
10. **Market Making Signal** — TRADING — Spread and volatility signals for traders

---

## Where to Find Builders

- Post in OKX developer Discord and Telegram
- Tweet from @Datweb3guy: "Looking for AI agent builders to list on AgentMarket"
- Post in DeFi developer channels on Farcaster
- Reach out directly to builders you see deploying tools on XLayer

---

## Seeding the Leaderboard

Once you have 5 or more agents live, make 10-20 test calls to each agent
(using small amounts of USDC on testnet first, then mainnet).

This seeds the leaderboard with real data and gives new visitors something to see.

The calls cost: 10 calls x $0.002 x 10 agents = $0.20 total. Worth it.

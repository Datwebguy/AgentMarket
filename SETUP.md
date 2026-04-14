# AgentMarket — Mainnet Setup Guide

Everything here deploys to XLayer Mainnet (chain ID 196) with real USDC.

---

## What You Need Before Starting

| Item | Where | Cost |
|------|-------|------|
| Node.js 20+ | nodejs.org | Free |
| Git | git-scm.com | Free |
| VS Code | code.visualstudio.com | Free |
| OKB for gas | Buy on OKX, bridge to XLayer | ~$5 |
| USDC on XLayer | okx.com/xlayer/bridge | Your amount |

---

## Step 1 — Generate a Fresh Platform Wallet

This wallet collects the 5% platform fees and pays gas. Never reuse a personal wallet.

```bash
node -e "
const {ethers} = require('ethers');
const w = ethers.Wallet.createRandom();
console.log('Address:    ', w.address);
console.log('PrivateKey: ', w.privateKey);
"
```

Save both values in a password manager. Fund the address with at least 0.05 OKB on XLayer.

---

## Step 2 — Supabase (Database)

1. supabase.com — create free account and new project
2. Settings → Database → copy the Connection string (URI)
3. Looks like: `postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres`

---

## Step 3 — OKX Onchain OS API Keys

1. web3.okx.com/onchainos/dev-portal
2. Create project named AgentMarket
3. Copy: API Key, Secret Key, Passphrase, Project ID

---

## Step 4 — Fill backend/.env

```bash
cd backend
cp .env.example .env
# fill every line with your values
```

Key values:
```
X_LAYER_RPC_URL=https://rpc.xlayer.tech
X_LAYER_CHAIN_ID=196
USDC_CONTRACT_ADDRESS=0x74b7F16337b8972027F6196A17a631aC6dE26d22
NODE_ENV=production
```

---

## Step 5 — Run Database Migration

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
```

---

## Step 6 — Deploy Contract to XLayer MAINNET

```bash
cd contracts
npm install
npx hardhat compile

# Set your platform wallet key in contracts/.env
echo 'PLATFORM_PRIVATE_KEY="0xYOUR_KEY"' > .env
echo 'X_LAYER_RPC_URL="https://rpc.xlayer.tech"' >> .env

# Deploy to mainnet
npm run deploy
```

Copy the output contract address into backend/.env and frontend/.env.local:
```
AGENT_REGISTRY_ADDRESS="0xYOUR_DEPLOYED_ADDRESS"
NEXT_PUBLIC_REGISTRY_ADDRESS="0xYOUR_DEPLOYED_ADDRESS"
```

Verify live on OKLink: https://www.oklink.com/xlayer

---

## Step 7 — Deploy Backend to Railway

```bash
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/Datwebguy/agentmarket.git
git push -u origin main
```

1. railway.app → New Project → GitHub → select repo → Root Directory: `backend`
2. Add all backend/.env variables in the Variables tab
3. Copy your Railway URL

Test: `curl https://YOUR-RAILWAY-URL/health`

---

## Step 8 — Deploy Frontend to Vercel

1. vercel.com → New Project → GitHub → Root Directory: `frontend`
2. Add frontend/.env.local variables, set NEXT_PUBLIC_API_URL to your Railway URL
3. Deploy

---

## XLayer Mainnet Reference

| | |
|--|--|
| Chain ID | 196 |
| RPC | https://rpc.xlayer.tech |
| Explorer | https://www.oklink.com/xlayer |
| USDC | 0x74b7F16337b8972027F6196A17a631aC6dE26d22 |
| Bridge | https://www.okx.com/xlayer/bridge |
| Gas token | OKB |

---

## Add XLayer to MetaMask

- Network Name: XLayer Mainnet
- RPC URL: https://rpc.xlayer.tech
- Chain ID: 196
- Symbol: OKB
- Explorer: https://www.oklink.com/xlayer

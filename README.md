# AgentMarket — Production Platform

## Architecture

```
agentmarket/
├── backend/          # Node.js + Express + Prisma API server
├── frontend/         # Next.js 14 App Router
├── contracts/        # Solidity smart contracts (X Layer)
└── docs/             # API documentation
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend API | Node.js, Express, TypeScript |
| Database | PostgreSQL (Supabase) + Prisma ORM |
| Auth | SIWE (Sign-In with Ethereum) + JWT |
| Payments | x402 Protocol, USDC, EIP-3009 |
| Blockchain | X Layer (OKX L2, EVM-compatible) |
| Agent Skills | OKX Onchain OS API |
| DEX | Uniswap V3 + OKX DEX |
| Wallets | OKX TEE Agentic Wallets |
| Deployment | Vercel (frontend) + Railway (backend) |

## Setup

```bash
# 1. Backend
cd backend
cp .env.example .env   # fill in your keys
npm install
npx prisma migrate dev
npm run dev            # http://localhost:4000

# 2. Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

## Environment Variables Required

### Backend
- `DATABASE_URL` — PostgreSQL connection string (Supabase)
- `JWT_SECRET` — 32+ char random string
- `OKX_API_KEY` / `OKX_SECRET_KEY` / `OKX_PASSPHRASE` — OKX Onchain OS
- `OKX_PROJECT_ID` — OKX developer project ID
- `X_LAYER_RPC_URL` — X Layer mainnet RPC
- `PLATFORM_PRIVATE_KEY` — Platform wallet private key (for fee collection)
- `USDC_CONTRACT_ADDRESS` — USDC on X Layer

### Frontend
- `NEXT_PUBLIC_API_URL` — Backend API URL
- `NEXT_PUBLIC_X_LAYER_CHAIN_ID` — 196 (mainnet) or 195 (testnet)
- `NEXT_PUBLIC_USDC_ADDRESS` — USDC contract on X Layer
- `NEXT_PUBLIC_REGISTRY_ADDRESS` — AgentRegistry contract address

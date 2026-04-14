# Monitoring and Analytics Setup

## 1. Sentry — Error Tracking

**Frontend**
```bash
cd frontend
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
# Follow the prompts — it auto-creates sentry.client.config.ts and sentry.server.config.ts
```

Add to `.env.local`:
```
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_PROJECT
```

**Backend**
```bash
cd backend
npm install @sentry/node
```

Add to top of `src/index.ts` (before other imports):
```typescript
import './lib/monitoring';
```

Add to `.env`:
```
SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_PROJECT
```

---

## 2. Plausible — Privacy-Friendly Analytics

1. Create account at https://plausible.io
2. Add your domain (e.g. `agentmarket.xyz`)
3. The `<Analytics />` component in layout.tsx handles everything
4. Add to `.env.local`:
   ```
   NEXT_PUBLIC_PLAUSIBLE_DOMAIN=agentmarket.xyz
   ```

**Custom events already tracked:**
- `agent_call_success` — every successful x402 call
- `agent_call_error` — failed calls
- Add more via `trackEvent('event_name', { key: 'value' })` from `src/lib/analytics.ts`

---

## 3. Better Uptime — Availability Monitoring

1. Create account at https://betteruptime.com (free tier: 1-minute checks)
2. Add monitors for:
   - `https://your-backend.railway.app/health` — backend API
   - `https://agentmarket.xyz` — frontend
   - `https://rpc.xlayer.tech` — XLayer RPC
3. Set up email + Slack alerts

---

## 4. Railway Metrics (Built-In)

Railway automatically shows:
- CPU and memory usage
- Request volume
- Deployment logs
- Crash alerts

Access at: https://railway.app → Your Project → Observability tab

---

## 5. What to Watch in Production

| Metric             | Warning threshold | Critical threshold |
|-------------------|-------------------|--------------------|
| API response time  | > 2 seconds       | > 5 seconds        |
| Error rate         | > 1%              | > 5%               |
| x402 failure rate  | > 2%              | > 10%              |
| XLayer RPC latency | > 500ms           | > 2 seconds        |
| DB connection pool | > 80% used        | > 95% used         |

---

## 6. Log Structure

All API errors are already logged with `console.error`. In production on Railway,
logs are accessible via the Railway dashboard. Search for:

```
[Error]      — unhandled server errors
x402 fail    — payment verification failures
OKX API error — OKX Onchain OS issues
Settlement   — onchain settlement issues
```

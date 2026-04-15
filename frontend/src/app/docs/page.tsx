'use client';

import { useState } from 'react';
import { Navbar } from '../../components/Navbar';

const SECTIONS = [
  { id: 'quickstart',    label: 'Quickstart'         },
  { id: 'calling',       label: 'Calling an Agent'   },
  { id: 'deploying',     label: 'Deploying an Agent' },
  { id: 'x402',          label: 'x402 Protocol'      },
  { id: 'auth',          label: 'Authentication'     },
  { id: 'api-agents',    label: 'Agents API'         },
  { id: 'api-calls',     label: 'Calls API'          },
  { id: 'api-stats',     label: 'Stats API'          },
  { id: 'errors',        label: 'Error Codes'        },
  { id: 'sdks',          label: 'SDKs and Libraries' },
];

const s: React.CSSProperties = { // inline style shortcuts
};

function CodeBlock({ code, lang = 'js' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: 'relative', background: '#0a0a0a', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>{lang}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          style={{ fontSize: 11, color: copied ? '#00d4a0' : '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{ padding: '16px', fontSize: 12, color: '#ccc', overflowX: 'auto', lineHeight: 1.7, fontFamily: 'monospace', margin: 0 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Heading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-1px', marginBottom: 12, marginTop: 48, scrollMarginTop: 80 }}>
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 10, marginTop: 28, color: '#ddd' }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: '#888', lineHeight: 1.8, marginBottom: 14, fontWeight: 400 }}>{children}</p>;
}

function Badge({ children, color = 'purple' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    purple: { bg: 'rgba(249,115,22,.15)', text: '#f97316' },
    teal:   { bg: 'rgba(0,212,160,.12)',  text: '#00d4a0' },
    amber:  { bg: 'rgba(245,158,11,.12)', text: '#f59e0b' },
    red:    { bg: 'rgba(239,68,68,.12)',  text: '#ef4444' },
  };
  const c = colors[color] || colors.purple;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: c.bg, color: c.text, fontFamily: 'monospace', marginRight: 6 }}>
      {children}
    </span>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('quickstart');

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'Figtree', sans-serif" }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0, paddingTop: 58 }}>

          {/* Sidebar */}
          <div style={{ position: 'sticky', top: 58, height: 'calc(100vh - 58px)', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,.06)', padding: '32px 0' }}>
            <div style={{ padding: '0 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#444', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'monospace' }}>Documentation</div>
            </div>
            {SECTIONS.map(sec => (
              <a key={sec.id} href={`#${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                style={{
                  display: 'block', padding: '8px 20px', fontSize: 13, fontWeight: activeSection === sec.id ? 700 : 400,
                  color: activeSection === sec.id ? '#f97316' : '#666',
                  borderLeft: activeSection === sec.id ? '2px solid #f97316' : '2px solid transparent',
                  textDecoration: 'none', transition: 'all .15s',
                }}>
                {sec.label}
              </a>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: '40px 56px', maxWidth: 820 }}>

            {/* QUICKSTART */}
            <Heading id="quickstart">Quickstart</Heading>
            <P>AgentMarket lets you call AI agents via HTTP and pay automatically using the x402 protocol. Payments settle in USDC on XLayer in approximately 2 seconds.</P>

            <SubHeading>Install dependencies</SubHeading>
            <CodeBlock lang="bash" code={`npm install axios ethers`} />

            <SubHeading>Call your first agent</SubHeading>
            <CodeBlock lang="javascript" code={`const { ethers } = require('ethers');
const axios = require('axios');

// Your wallet (with USDC on XLayer)
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);

// 1. Get payment requirements from the agent
const { data: req } = await axios.post(
  'https://api.agentmarket.xyz/v1/calls/token-risk-scanner/execute',
  { input: '0xABC...' }
).catch(e => ({ data: e.response.data }));

// req.accepts[0] contains: payTo, maxAmountRequired, asset

// 2. Sign EIP-3009 authorization (no gas, no separate tx)
const nonce = ethers.hexlify(ethers.randomBytes(32));
const now   = Math.floor(Date.now() / 1000);

const sig = await wallet.signTypedData(
  {
    name: 'USD Coin', version: '2',
    chainId: 196,
    verifyingContract: '0x74b7F16337b8972027F6196A17a631aC6dE26d22'
  },
  {
    TransferWithAuthorization: [
      { name: 'from',        type: 'address' },
      { name: 'to',          type: 'address' },
      { name: 'value',       type: 'uint256' },
      { name: 'validAfter',  type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce',       type: 'bytes32'  },
    ]
  },
  {
    from:        wallet.address,
    to:          req.accepts[0].payTo,
    value:       BigInt(req.accepts[0].maxAmountRequired),
    validAfter:  BigInt(now - 60),
    validBefore: BigInt(now + 300),
    nonce,
  }
);

const { v, r, s } = ethers.Signature.from(sig);
const paymentHeader = Buffer.from(JSON.stringify({
  from: wallet.address,
  to:   req.accepts[0].payTo,
  value: req.accepts[0].maxAmountRequired,
  validAfter:  String(now - 60),
  validBefore: String(now + 300),
  nonce, v, r, s, chainId: 196
})).toString('base64');

// 3. Execute the call with the payment header
const { data: result } = await axios.post(
  'https://api.agentmarket.xyz/v1/calls/token-risk-scanner/execute',
  { input: '0xABC...' },
  { headers: { 'X-Payment': paymentHeader } }
);

console.log(result);
// { result: { risk_score: 18, verdict: 'LOW_RISK', ... }, txHash: '0x...', responseMs: 1240 }`} />

            {/* CALLING AN AGENT */}
            <Heading id="calling">Calling an Agent</Heading>
            <P>Every agent call goes through a two-step flow: first request returns HTTP 402 with payment requirements, second request includes the payment and gets the result.</P>

            <SubHeading>Step 1: Get payment requirements</SubHeading>
            <P>Send any POST to the execute endpoint without a payment header. You will receive HTTP 402 with the payment specification.</P>
            <CodeBlock lang="http" code={`POST /api/v1/calls/:agentId/execute
Content-Type: application/json

{ "input": "your data" }

-- Response: 402 Payment Required --
{
  "error": "X-PAYMENT header required",
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "eip155:196",
    "maxAmountRequired": "2000",
    "payTo": "0xAgentWallet...",
    "asset": "0x74b7F16...USDC",
    "maxTimeoutSeconds": 300
  }]
}`} />

            <SubHeading>Step 2: Execute with payment</SubHeading>
            <CodeBlock lang="http" code={`POST /api/v1/calls/:agentId/execute
Content-Type: application/json
X-Payment: <base64 encoded EIP-3009 payload>

{ "input": "your data" }

-- Response: 200 OK --
{
  "result": { ... agent response ... },
  "callId": "uuid",
  "txHash": "0x...",
  "responseMs": 1240,
  "settled": {
    "amount": "0.002",
    "agentEarned": "0.0019",
    "fee": "0.0001",
    "currency": "USDC",
    "network": "XLayer"
  }
}`} />

            {/* DEPLOYING */}
            <Heading id="deploying">Deploying an Agent</Heading>
            <P>Any HTTP endpoint that accepts POST and returns JSON can be an agent. Wrap your existing API, ML model, or onchain script in a simple endpoint and register it.</P>

            <SubHeading>Minimal agent server</SubHeading>
            <CodeBlock lang="javascript" code={`const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/call', async (req, res) => {
  const { input } = req.body;

  // Your agent logic here
  const result = await processInput(input);

  res.json({
    result,
    processed_at: new Date().toISOString(),
  });
});

app.listen(3001, () => console.log('Agent running on port 3001'));`} />

            <SubHeading>Register via API</SubHeading>
            <CodeBlock lang="javascript" code={`const { data } = await axios.post(
  'https://api.agentmarket.xyz/v1/agents',
  {
    name:             'My DeFi Agent',
    description:      'Analyzes token risk using onchain data.',
    category:         'RISK',
    endpointUrl:      'https://my-agent.railway.app/api/call',
    pricePerCallUsdc: 0.002,
    tags:             ['risk', 'defi', 'token'],
  },
  { headers: { Authorization: 'Bearer YOUR_JWT' } }
);

console.log(data.agent.walletAddress); // Save this — your earning wallet
console.log(data.wallet.privateKey);   // SAVE ONCE, shown only here`} />

            {/* x402 */}
            <Heading id="x402">x402 Protocol</Heading>
            <P>x402 is an HTTP native micropayment protocol built on EIP-3009 USDC authorizations. The payment proof travels in the HTTP header with no blockchain transaction from the caller and no gas fee popups.</P>

            <SubHeading>X-Payment header structure</SubHeading>
            <CodeBlock lang="json" code={`{
  "from":        "0xCallerWallet",
  "to":          "0xAgentWallet",
  "value":       "2000",
  "validAfter":  "1714000000",
  "validBefore": "1714000300",
  "nonce":       "0x<random 32 bytes>",
  "v":           28,
  "r":           "0x...",
  "s":           "0x...",
  "chainId":     196
}`} />
            <P>This JSON is base64-encoded and sent as the value of the X-Payment header. The backend verifies the EIP-712 signature, checks the nonce has not been used, and submits the transferWithAuthorization call on XLayer.</P>

            {/* AUTH */}
            <Heading id="auth">Authentication</Heading>
            <P>AgentMarket uses Sign-In with Ethereum (SIWE) for wallet-based auth and issues JWT tokens for API access.</P>

            <SubHeading>SIWE sign-in flow</SubHeading>
            <CodeBlock lang="javascript" code={`// 1. Get nonce
const { data: { nonce } } = await axios.get(
  'https://api.agentmarket.xyz/v1/auth/nonce'
);

// 2. Build and sign SIWE message
const message = new SiweMessage({
  domain:    window.location.host,
  address:   wallet.address,
  statement: 'Sign in to AgentMarket.',
  uri:       window.location.origin,
  version:   '1',
  chainId:   196,
  nonce,
});
const signature = await wallet.signMessage(message.prepareMessage());

// 3. Verify and get JWT
const { data: { token } } = await axios.post(
  'https://api.agentmarket.xyz/v1/auth/verify',
  { message: message.prepareMessage(), signature }
);

// Use token in Authorization header for all subsequent requests
axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;`} />

            {/* API AGENTS */}
            <Heading id="api-agents">Agents API</Heading>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {[
                { method: 'GET',   path: '/agents',        auth: false, desc: 'List all active agents. Supports category, search, sort, page, limit query params.' },
                { method: 'GET',   path: '/agents/:slug',  auth: false, desc: 'Get full agent details including stats and recent call history.' },
                { method: 'POST',  path: '/agents',        auth: true,  desc: 'Deploy a new agent. Returns agent record plus wallet private key (shown once only).' },
                { method: 'PATCH', path: '/agents/:id',    auth: true,  desc: 'Update agent name, description, price, or endpoint URL. Owner only.' },
                { method: 'GET',   path: '/agents/:id/stats', auth: false, desc: 'Agent performance stats and recent calls.' },
              ].map(ep => (
                <div key={ep.path} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Badge color={ep.method === 'GET' ? 'teal' : ep.method === 'POST' ? 'purple' : 'amber'}>{ep.method}</Badge>
                  <code style={{ fontSize: 13, color: '#ccc', flex: 1 }}>{ep.path}</code>
                  {ep.auth && <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,.1)', padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace', flexShrink: 0 }}>AUTH</span>}
                  <span style={{ fontSize: 12, color: '#555', maxWidth: 280, lineHeight: 1.5, fontWeight: 400 }}>{ep.desc}</span>
                </div>
              ))}
            </div>

            {/* API CALLS */}
            <Heading id="api-calls">Calls API</Heading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {[
                { method: 'POST', path: '/calls/:agentId/execute', auth: false, desc: 'Execute an agent call. Returns 402 without X-Payment header, or the agent result with it.' },
                { method: 'GET',  path: '/calls',                  auth: true,  desc: 'List your call history as either a caller or agent owner.' },
                { method: 'GET',  path: '/calls/:id',              auth: false, desc: 'Get a single call by ID. Input and output are redacted for non-owners.' },
              ].map(ep => (
                <div key={ep.path} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Badge color={ep.method === 'GET' ? 'teal' : 'purple'}>{ep.method}</Badge>
                  <code style={{ fontSize: 13, color: '#ccc', flex: 1 }}>{ep.path}</code>
                  {ep.auth && <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,.1)', padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace', flexShrink: 0 }}>AUTH</span>}
                  <span style={{ fontSize: 12, color: '#555', maxWidth: 280, lineHeight: 1.5, fontWeight: 400 }}>{ep.desc}</span>
                </div>
              ))}
            </div>

            {/* STATS */}
            <Heading id="api-stats">Stats API</Heading>
            <CodeBlock lang="http" code={`GET /api/v1/stats/platform
-- Returns platform-wide aggregates --
{
  "totalAgents": 42,
  "totalCalls": 156487,
  "totalVolumeUsdc": "1240.82",
  "uniqueCallers": 2340,
  "avgResponseMs": 1480
}

GET /api/v1/stats/leaderboard?by=calls&limit=10
-- Returns top agents sorted by calls or revenue --`} />

            {/* ERRORS */}
            <Heading id="errors">Error Codes</Heading>
            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
              {[
                { code: '400', label: 'Bad Request',         desc: 'Missing or invalid request body. Check the error.details field.' },
                { code: '401', label: 'Unauthorized',        desc: 'Missing or expired JWT. Re-authenticate via /auth/verify.' },
                { code: '402', label: 'Payment Required',    desc: 'x402 header missing or invalid. Check the accepts array in the response.' },
                { code: '403', label: 'Forbidden',           desc: 'Authenticated but not authorized for this resource.' },
                { code: '404', label: 'Not Found',           desc: 'Agent or call not found. Check the ID or slug.' },
                { code: '429', label: 'Rate Limited',        desc: '200 requests per 15 minutes overall, 30 call executions per minute.' },
                { code: '502', label: 'Agent Error',         desc: 'The agent endpoint returned an error. Payment was still settled.' },
                { code: '500', label: 'Server Error',        desc: 'Internal error. Payment was not settled. Contact support.' },
              ].map((e, i, arr) => (
                <div key={e.code} style={{ display: 'grid', gridTemplateColumns: '60px 140px 1fr', gap: 16, padding: '12px 18px', alignItems: 'center', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                  <code style={{ fontSize: 13, color: e.code === '402' ? '#f97316' : e.code.startsWith('4') ? '#f59e0b' : e.code.startsWith('5') ? '#ef4444' : '#00d4a0', fontFamily: 'monospace', fontWeight: 700 }}>{e.code}</code>
                  <span style={{ fontSize: 13, color: '#ccc', fontWeight: 600 }}>{e.label}</span>
                  <span style={{ fontSize: 12, color: '#555', lineHeight: 1.5, fontWeight: 400 }}>{e.desc}</span>
                </div>
              ))}
            </div>

            {/* SDKS */}
            <Heading id="sdks">SDKs and Libraries</Heading>
            <P>Official SDKs are in development. For now, use the patterns shown in this guide with any HTTP client.</P>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { lang: 'JavaScript / Node.js', status: 'Available', note: 'Use ethers.js v6 + axios as shown above' },
                { lang: 'Python',               status: 'Available', note: 'Use eth-account + requests library' },
                { lang: 'Go',                   status: 'Coming soon', note: 'Official SDK in development' },
                { lang: 'Rust',                 status: 'Coming soon', note: 'Official SDK in development' },
              ].map(s => (
                <div key={s.lang} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{s.lang}</div>
                  <div style={{ fontSize: 11, color: s.status === 'Available' ? '#00d4a0' : '#f59e0b', fontFamily: 'monospace', fontWeight: 600, marginBottom: 6 }}>{s.status}</div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, fontWeight: 400 }}>{s.note}</div>
                </div>
              ))}
            </div>

            <div style={{ height: 80 }}></div>
          </div>
        </div>
      </main>
    </>
  );
}

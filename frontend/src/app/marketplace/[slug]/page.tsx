'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Agent } from '../../../lib/api';
import { CallModal } from '../../../components/CallModal';
import { Navbar }    from '../../../components/Navbar';

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  DEFI:           { bg: 'rgba(0,212,160,.1)',  color: '#00d4a0' },
  RISK:           { bg: 'rgba(239,68,68,.1)',  color: '#ef4444' },
  TRADING:        { bg: 'rgba(96,165,250,.1)', color: '#60a5fa' },
  INTELLIGENCE:   { bg: 'rgba(124,92,252,.12)',color: '#7c5cfc' },
  PAYMENTS:       { bg: 'rgba(245,158,11,.1)', color: '#f59e0b' },
  INFRASTRUCTURE: { bg: 'rgba(255,255,255,.06)',color: '#888'   },
};

export default function AgentDetailPage({ params }: { params: { slug: string } }) {
  const [showCall, setShowCall] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['agent', params.slug],
    queryFn:  () => api.getAgent(params.slug),
  });

  const agent = data?.agent;
  const catStyle = agent ? (CATEGORY_COLORS[agent.category] || CATEGORY_COLORS.INFRASTRUCTURE) : { bg: '#111', color: '#888' };

  if (isLoading) return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Figtree', sans-serif" }}>
        <div style={{ color: '#444', fontSize: 14 }}>Loading agent...</div>
      </main>
    </>
  );

  if (error || !agent) return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Figtree', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>404</div>
          <div style={{ color: '#666', fontSize: 14 }}>Agent not found</div>
          <a href="/marketplace" style={{ color: '#7c5cfc', fontSize: 13, display: 'block', marginTop: 12 }}>← Back to Marketplace</a>
        </div>
      </main>
    </>
  );

  const price = parseFloat(agent.pricePerCallUsdc.toString()).toFixed(4);
  const revenue = parseFloat(agent.totalRevenueUsdc.toString()).toFixed(2);

  // Integration code snippet
  const integrationSnippet = `// Install: npm install axios ethers
const { ethers } = require('ethers');
const axios = require('axios');

const AGENT_ID   = '${agent.id}';
const USDC_ADDR  = '${process.env.NEXT_PUBLIC_USDC_ADDRESS}';
const API_BASE   = '${process.env.NEXT_PUBLIC_API_URL || 'https://api.agentmarket.xyz/v1'}';

async function callAgent(wallet, inputPayload) {
  // 1. Get payment requirements
  const { data: req } = await axios.post(
    \`\${API_BASE}/calls/\${AGENT_ID}/execute\`,
    inputPayload
  ).catch(e => ({ data: e.response.data }));

  const { payTo, maxAmountRequired } = req.accepts[0];

  // 2. Sign EIP-3009 authorization
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  const now   = Math.floor(Date.now() / 1000);
  const sig   = await wallet.signTypedData(
    { name: 'USD Coin', version: '2', chainId: 196, verifyingContract: USDC_ADDR },
    { TransferWithAuthorization: [
      { name: 'from',        type: 'address' },
      { name: 'to',          type: 'address' },
      { name: 'value',       type: 'uint256' },
      { name: 'validAfter',  type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce',       type: 'bytes32'  },
    ]},
    { from: wallet.address, to: payTo,
      value: BigInt(maxAmountRequired),
      validAfter: BigInt(now - 60),
      validBefore: BigInt(now + 300), nonce }
  );

  const { v, r, s } = ethers.Signature.from(sig);
  const payment = Buffer.from(JSON.stringify({
    from: wallet.address, to: payTo,
    value: maxAmountRequired,
    validAfter: String(now - 60),
    validBefore: String(now + 300),
    nonce, v, r, s, chainId: 196
  })).toString('base64');

  // 3. Execute call
  const { data: result } = await axios.post(
    \`\${API_BASE}/calls/\${AGENT_ID}/execute\`,
    inputPayload,
    { headers: { 'X-Payment': payment } }
  );
  return result;
}`;

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'Figtree', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

          {/* Breadcrumb */}
          <div style={{ fontSize: 13, color: '#555', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="/marketplace" style={{ color: '#555', textDecoration: 'none' }}>Marketplace</a>
            <span>/</span>
            <span style={{ color: '#888' }}>{agent.name}</span>
          </div>

          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'flex-start', marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4, ...catStyle, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  {agent.category}
                </span>
                {agent.isVerified && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4, background: 'rgba(34,197,94,.1)', color: '#22c55e' }}>
                    ✓ Verified
                  </span>
                )}
              </div>
              <h1 style={{ fontWeight: 900, fontSize: 36, letterSpacing: '-1.5px', marginBottom: 12 }}>{agent.name}</h1>
              <p style={{ fontSize: 16, color: '#888', lineHeight: 1.7, maxWidth: 620 }}>{agent.description}</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                {agent.tags?.map(tag => (
                  <span key={tag} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 4, border: '1px solid rgba(255,255,255,.1)', color: '#666', fontFamily: 'monospace' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Call CTA */}
            <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 24, minWidth: 220, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 6 }}>Price Per Call</div>
              <div style={{ fontWeight: 900, fontSize: 28, color: '#00d4a0', letterSpacing: '-1px', marginBottom: 16 }}>{price} USDC</div>
              <button
                onClick={() => setShowCall(true)}
                style={{
                  width: '100%', background: '#7c5cfc', color: '#fff', border: 'none',
                  borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
                }}
              >
                Call This Agent
              </button>
              <div style={{ fontSize: 11, color: '#444' }}>Payment via x402 · USDC · X Layer</div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 40 }}>
            {[
              { label: 'Total Calls',      value: parseInt(agent.totalCalls.toString()).toLocaleString(), color: '#7c5cfc' },
              { label: 'Total Earned',     value: `$${revenue}`, color: '#00d4a0' },
              { label: 'Avg Response',     value: agent.avgResponseMs ? `${agent.avgResponseMs}ms` : '—', color: '#fff' },
              { label: 'Uptime',           value: `${parseFloat(agent.uptimePct.toString()).toFixed(1)}%`, color: '#fff' },
            ].map(s => (
              <div key={s.label} style={{ background: '#101010', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontWeight: 900, fontSize: 24, color: s.color, letterSpacing: '-1px' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Two column: integration code + owner info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, marginBottom: 40 }}>

            {/* Integration snippet */}
            <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Integration Code</div>
                <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>Node.js · ethers.js</span>
              </div>
              <pre style={{
                padding: '18px', fontSize: 11, color: '#00d4a0',
                overflowX: 'auto', lineHeight: 1.65, fontFamily: 'monospace',
                whiteSpace: 'pre', maxHeight: 400, overflowY: 'auto',
              }}>
                {integrationSnippet}
              </pre>
            </div>

            {/* Owner + details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '18px' }}>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.5px' }}>Builder</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#888', wordBreak: 'break-all' }}>
                  {agent.owner?.walletAddress?.slice(0, 10)}...{agent.owner?.walletAddress?.slice(-6)}
                </div>
                {agent.owner?.username && (
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{agent.owner.username}</div>
                )}
              </div>
              <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '18px' }}>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.5px' }}>Agent Wallet</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', wordBreak: 'break-all' }}>{agent.walletAddress}</div>
                <a
                  href={`${process.env.NEXT_PUBLIC_X_LAYER_EXPLORER}/address/${agent.walletAddress}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: '#7c5cfc', display: 'block', marginTop: 6 }}
                >
                  View on OKLink ↗
                </a>
              </div>
              <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '18px' }}>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.5px' }}>Deployed</div>
                <div style={{ fontSize: 13, color: '#888' }}>
                  {new Date(agent.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showCall && <CallModal agent={agent} onClose={() => setShowCall(false)} />}
      </main>
    </>
  );
}

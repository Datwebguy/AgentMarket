'use client';

import { useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { api } from '../../lib/api';
import { Navbar } from '../../components/Navbar';

const CATEGORIES = ['DEFI', 'RISK', 'TRADING', 'INTELLIGENCE', 'PAYMENTS', 'INFRASTRUCTURE', 'OTHER'];

export default function DeployPage() {
  const { isConnected } = useAccount();
  const { connectAsync } = useConnect();

  const [form, setForm] = useState({
    name:             '',
    description:      '',
    category:         'DEFI',
    endpointUrl:      '',
    pricePerCallUsdc: '0.002',
    tags:             '',
  });
  const [step,      setStep]      = useState<'form' | 'deploying' | 'done' | 'error'>('form');
  const [result,    setResult]    = useState<{ agent: any; wallet: { address: string; privateKey: string } } | null>(null);
  const [errMsg,    setErrMsg]    = useState('');
  const [keyCopied, setKeyCopied] = useState(false);

  async function deploy(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!isConnected) {
        await connectAsync({ connector: injected() });
      }
      setStep('deploying');

      const data = await api.deployAgent({
        name:             form.name,
        description:      form.description,
        category:         form.category,
        endpointUrl:      form.endpointUrl,
        pricePerCallUsdc: parseFloat(form.pricePerCallUsdc),
        tags:             form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });

      setResult(data);
      setStep('done');
    } catch (err: any) {
      setErrMsg(err?.response?.data?.error || err.message || 'Deployment failed');
      setStep('error');
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#080808',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 10, padding: '11px 14px', color: '#fff',
    fontFamily: "'Figtree', sans-serif", fontSize: 14, outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontFamily: 'monospace',
    letterSpacing: '1px', color: '#555', textTransform: 'uppercase', marginBottom: 6,
  };

  return (
    <>
    <Navbar />
    <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'Figtree', sans-serif" }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '24px 32px' }}>
        <a href="/marketplace" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>← Back to Marketplace</a>
        <h1 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-1px', marginTop: 8 }}>Deploy an Agent</h1>
        <p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          Register your AI agent and start earning USDC on every call via x402.
        </p>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 32px' }}>

        {step === 'form' && (
          <form onSubmit={deploy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div>
                <label style={labelStyle}>Agent Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required placeholder="e.g. DeFi Risk Analyzer" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Description *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required rows={4} placeholder="What does your agent do? What inputs does it accept? What does it return?"
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Category *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Price Per Call (USDC) *</label>
                  <input type="number" step="0.0001" min="0.0001" max="100"
                    value={form.pricePerCallUsdc}
                    onChange={e => setForm(f => ({ ...f, pricePerCallUsdc: e.target.value }))}
                    required style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Endpoint URL *</label>
                <input value={form.endpointUrl} onChange={e => setForm(f => ({ ...f, endpointUrl: e.target.value }))}
                  required type="url" placeholder="https://your-agent.example.com/api/v1/call"
                  style={inputStyle} />
                <p style={{ fontSize: 11, color: '#444', marginTop: 5 }}>
                  Your agent must accept POST requests with JSON body and return JSON.
                  The platform will forward calls here after payment verification.
                </p>
              </div>

              <div>
                <label style={labelStyle}>Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="e.g. risk, security, token" style={inputStyle} />
              </div>

              {/* Fee summary */}
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Fee Structure
                </div>
                {[
                  ['One-time listing fee',  '0.01 USDC'],
                  ['Platform fee per call', '5%'],
                  ['You earn per call',     `${(parseFloat(form.pricePerCallUsdc || '0') * 0.95).toFixed(5)} USDC (95%)`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: '#666' }}>{k}</span>
                    <span style={{ color: k.includes('earn') ? '#00d4a0' : '#999', fontWeight: k.includes('earn') ? 700 : 400 }}>{v}</span>
                  </div>
                ))}
              </div>

              <button type="submit" style={{
                background: '#7c5cfc', color: '#fff', border: 'none',
                borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Figtree', sans-serif",
              }}>
                {isConnected ? 'Deploy Agent →' : 'Connect Wallet & Deploy →'}
              </button>
            </div>
          </form>
        )}

        {step === 'deploying' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚙️</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Deploying your agent...</div>
            <div style={{ fontSize: 14, color: '#666' }}>Provisioning TEE wallet and registering on X Layer</div>
          </div>
        )}

        {step === 'done' && result && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <h2 style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-1px', marginBottom: 8 }}>Agent Deployed</h2>
              <p style={{ fontSize: 14, color: '#666' }}>
                <strong style={{ color: '#fff' }}>{result.agent.name}</strong> is now live on AgentMarket.
              </p>
            </div>

            {/* CRITICAL: Private key warning */}
            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, padding: '18px 20px', marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#ef4444', marginBottom: 8 }}>
                ⚠️ Save Your Agent Wallet Private Key — Shown Once Only
              </div>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                This is your agent's earning wallet on X Layer. AgentMarket does NOT store this key.
                If you lose it, you lose access to your agent's earned USDC.
              </p>
              <div style={{ background: '#080808', borderRadius: 8, padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#ef4444', wordBreak: 'break-all', marginBottom: 10 }}>
                {result.wallet.privateKey}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(result.wallet.privateKey); setKeyCopied(true); }}
                  style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {keyCopied ? '✓ Copied' : 'Copy Private Key'}
                </button>
              </div>
            </div>

            {/* Agent details */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '16px 18px', marginBottom: 24 }}>
              {[
                ['Agent ID',       result.agent.id],
                ['Agent Wallet',   result.wallet.address],
                ['Price Per Call', `${result.agent.pricePerCallUsdc} USDC`],
                ['Status',         result.agent.status],
                ['Marketplace URL', `/marketplace/${result.agent.slug}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 7, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: '#555', fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>{k}</span>
                  <span style={{ color: '#ccc', fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>

            <a
              href={`/marketplace`}
              style={{
                display: 'block', textAlign: 'center',
                background: '#7c5cfc', color: '#fff',
                borderRadius: 10, padding: '13px 0',
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}
            >
              View on Marketplace →
            </a>
          </div>
        )}

        {step === 'error' && (
          <div>
            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Deployment Failed</div>
              <div style={{ fontSize: 13, color: '#888' }}>{errMsg}</div>
            </div>
            <button onClick={() => { setStep('form'); setErrMsg(''); }}
              style={{ width: '100%', background: 'transparent', color: '#888', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
    </>
  );
}

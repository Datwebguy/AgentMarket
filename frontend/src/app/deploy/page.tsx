'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { api } from '../../lib/api';
import { Navbar } from '../../components/Navbar';
import { useAuthStore } from '../../hooks/useAuthStore';

const CATEGORIES = ['DEFI', 'RISK', 'TRADING', 'INTELLIGENCE', 'PAYMENTS', 'INFRASTRUCTURE', 'OTHER'];
const FONT = "'Figtree', sans-serif";

const TEMPLATES: Record<string, { name: string; description: string; category: string; tags: string; code: string }> = {
  crypto: {
    name: 'Crypto Price Checker',
    description: 'Get live cryptocurrency prices, 24h change, and market cap for any coin. Supports Bitcoin, Ethereum, Solana, OKB and thousands more.',
    category: 'DEFI',
    tags: 'crypto, price, defi',
    code: `async function run(input) {
  const coin     = input.coin || input.input || 'bitcoin';
  const currency = input.currency || 'usd';
  const url = \`https://api.coingecko.com/api/v3/simple/price?ids=\${coin.toLowerCase()}&vs_currencies=\${currency}&include_24hr_change=true&include_market_cap=true\`;
  const res  = await fetch(url);
  const data = await res.json();
  const key  = coin.toLowerCase();
  if (!data[key]) return { error: 'Coin not found', hint: 'Try: bitcoin, ethereum, solana' };
  const d = data[key];
  const price     = d[currency];
  const change24h = d[currency + '_24h_change'] || 0;
  return {
    coin: key, currency: currency.toUpperCase(), price,
    change24h: parseFloat(change24h.toFixed(2)),
    direction: change24h >= 0 ? 'up' : 'down',
    summary: key + ' is $' + price.toLocaleString() + ' (' + (change24h >= 0 ? '+' : '') + change24h.toFixed(2) + '% 24h)',
  };
}`,
  },
  sentiment: {
    name: 'Text Sentiment Analyzer',
    description: 'Analyze the sentiment of any text and return a score from -1 (negative) to 1 (positive) with an overall label and confidence level.',
    category: 'INTELLIGENCE',
    tags: 'sentiment, nlp, text, analysis',
    code: `async function run(input) {
  const text = input.text || input.input || '';
  if (!text) return { error: 'Provide text to analyze', example: { text: 'Bitcoin is going to the moon!' } };

  const positive = ['great','good','excellent','amazing','love','bull','up','gain','profit','win','best','happy','positive','strong','growth'];
  const negative = ['bad','terrible','crash','dump','loss','bear','down','fear','panic','sell','worst','sad','negative','weak','decline'];

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  words.forEach(w => {
    if (positive.some(p => w.includes(p))) score += 1;
    if (negative.some(n => w.includes(n))) score -= 1;
  });

  const normalized = Math.max(-1, Math.min(1, score / Math.max(words.length / 5, 1)));
  const label = normalized > 0.2 ? 'positive' : normalized < -0.2 ? 'negative' : 'neutral';
  return { text: text.slice(0, 100), score: parseFloat(normalized.toFixed(3)), label, wordCount: words.length };
}`,
  },
  converter: {
    name: 'Unit Converter',
    description: 'Convert between common units including temperature, length, weight, and volume. Fast and accurate conversions for any value.',
    category: 'INFRASTRUCTURE',
    tags: 'converter, units, math, utility',
    code: `async function run(input) {
  const value = parseFloat(input.value || input.input || '0');
  const from  = (input.from || '').toLowerCase();
  const to    = (input.to   || '').toLowerCase();

  const conversions = {
    'celsius-fahrenheit': v => v * 9/5 + 32,
    'fahrenheit-celsius': v => (v - 32) * 5/9,
    'km-miles':           v => v * 0.621371,
    'miles-km':           v => v * 1.60934,
    'kg-lbs':             v => v * 2.20462,
    'lbs-kg':             v => v / 2.20462,
    'meters-feet':        v => v * 3.28084,
    'feet-meters':        v => v / 3.28084,
  };

  const fn = conversions[from + '-' + to];
  if (!fn) return { error: 'Unsupported conversion', supported: Object.keys(conversions) };
  const result = fn(value);
  return { value, from, to, result: parseFloat(result.toFixed(6)), summary: value + ' ' + from + ' = ' + result.toFixed(4) + ' ' + to };
}`,
  },
  blank: {
    name: '',
    description: '',
    category: 'INTELLIGENCE',
    tags: '',
    code: `async function run(input) {
  // 'input' contains everything the caller sends
  // Return any JSON object as your result

  const userInput = input.text || input.input || '';

  return {
    result: 'You sent: ' + userInput,
    timestamp: new Date().toISOString(),
  };
}`,
  },
};

export default function DeployPage() {
  const { isConnected } = useAccount();
  const { token } = useAuthStore();

  const [mode,     setMode]     = useState<'code' | 'url'>('code');
  const [template, setTemplate] = useState('blank');
  const [form,     setForm]     = useState({
    name: '', description: '', category: 'INTELLIGENCE',
    endpointUrl: '', pricePerCallUsdc: '0.01', tags: '',
    code: TEMPLATES.blank.code,
  });
  const [step,      setStep]      = useState<'form' | 'deploying' | 'done' | 'error'>('form');
  const [result,    setResult]    = useState<any>(null);
  const [errMsg,    setErrMsg]    = useState('');
  const [keyCopied, setKeyCopied] = useState(false);

  function applyTemplate(key: string) {
    const t = TEMPLATES[key];
    setTemplate(key);
    setForm(f => ({ ...f, name: t.name, description: t.description, category: t.category, tags: t.tags, code: t.code }));
  }

  async function deploy(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setErrMsg('Sign in first — click Connect Wallet in the top right.'); setStep('error'); return; }
    try {
      setStep('deploying');
      const data = await api.deployAgent({
        name:             form.name,
        description:      form.description,
        category:         form.category,
        endpointUrl:      mode === 'url'  ? form.endpointUrl : undefined,
        code:             mode === 'code' ? form.code        : undefined,
        pricePerCallUsdc: parseFloat(form.pricePerCallUsdc),
        tags:             form.tags.split(',').map(t => t.trim()).filter(Boolean),
      } as any);
      setResult(data);
      setStep('done');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.details
        ? ` — ${JSON.stringify(err.response.data.detail || err.response.data.details)}` : '';
      setErrMsg((err?.response?.data?.error || err.message || 'Deployment failed') + detail);
      setStep('error');
    }
  }

  const inp = {
    width: '100%', background: '#0d0d0d',
    border: '1px solid rgba(255,255,255,.1)', borderRadius: 10,
    padding: '11px 14px', color: '#fff',
    fontFamily: FONT, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  };
  const lbl = {
    display: 'block', fontSize: 11, fontFamily: 'monospace',
    letterSpacing: '1px', color: '#555', textTransform: 'uppercase' as const, marginBottom: 6,
  };

  const earnings = (parseFloat(form.pricePerCallUsdc || '0') * 0.95).toFixed(5);

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: FONT }}>

        {/* Header */}
        <div className="px-4 sm:px-8 py-5 sm:py-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <a href="/marketplace" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>← Marketplace</a>
          <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight mt-2 mb-1">Deploy an Agent</h1>
          <p style={{ fontSize: 14, color: '#555', margin: 0 }}>
            Write your code below and deploy in seconds. No server needed.
          </p>
        </div>

        <div className="max-w-[780px] mx-auto px-4 sm:px-8 py-6 sm:py-10">

          {/* Auth warning */}
          {(!isConnected || !token) && step === 'form' && (
            <div className="rounded-xl p-4 mb-6 flex items-center gap-3"
              style={{ background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.25)' }}>
              <span className="text-[18px] flex-shrink-0">🔑</span>
              <p className="text-[13px] m-0" style={{ color: '#888' }}>
                <strong style={{ color: '#f97316' }}>Sign in required.</strong>{' '}
                Click <strong style={{ color: '#fff' }}>Connect Wallet</strong> in the top right first.
              </p>
            </div>
          )}

          {/* ── FORM ── */}
          {step === 'form' && (
            <form onSubmit={deploy} className="flex flex-col gap-5">

              {/* Mode toggle */}
              <div className="flex rounded-xl p-1 gap-1"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,.08)' }}>
                {(['code', 'url'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className="flex-1 py-2.5 rounded-lg text-[13px] font-bold cursor-pointer border-none transition-all"
                    style={{ background: mode === m ? '#f97316' : 'transparent', color: mode === m ? '#fff' : '#555', fontFamily: FONT }}>
                    {m === 'code' ? '⚡ Write Code (Hosted)' : '🔗 External URL'}
                  </button>
                ))}
              </div>

              {/* Template picker */}
              {mode === 'code' && (
                <div>
                  <label style={lbl}>Start from a template</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(TEMPLATES).map(([key]) => (
                      <button key={key} type="button" onClick={() => applyTemplate(key)}
                        className="py-3 px-2 rounded-xl text-[12px] font-semibold cursor-pointer text-center transition-all"
                        style={{
                          border: `1px solid ${template === key ? '#f97316' : 'rgba(255,255,255,.08)'}`,
                          background: template === key ? 'rgba(249,115,22,.1)' : '#111',
                          color: template === key ? '#f97316' : '#888',
                          fontFamily: FONT,
                        }}>
                        {key === 'crypto' ? '₿ Crypto' : key === 'sentiment' ? '💬 Sentiment' : key === 'converter' ? '📐 Converter' : '✨ Blank'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Name + Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={lbl}>Agent Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required placeholder="e.g. Crypto Price Checker" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Category *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ ...inp, cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={lbl}>Description *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required rows={2} placeholder="What does your agent do and what inputs does it accept?"
                  style={{ ...inp, resize: 'vertical' }} />
              </div>

              {/* Code editor OR URL */}
              {mode === 'code' ? (
                <div>
                  <label style={lbl}>Agent Code *</label>
                  <p className="text-[12px] mb-2 mt-0" style={{ color: '#444' }}>
                    Define <code style={{ color: '#f97316' }}>async function run(input)</code> — return any JSON.
                    You have access to <code style={{ color: '#00d4a0' }}>fetch</code> for external APIs.
                  </p>
                  <textarea value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    required rows={14} spellCheck={false}
                    style={{ ...inp, fontFamily: "'Courier New', monospace", fontSize: 13, lineHeight: 1.6, resize: 'vertical', color: '#e2e8f0', background: '#050505', border: '1px solid rgba(249,115,22,.2)' }} />
                </div>
              ) : (
                <div>
                  <label style={lbl}>Endpoint URL *</label>
                  <input value={form.endpointUrl} onChange={e => setForm(f => ({ ...f, endpointUrl: e.target.value }))}
                    required={mode === 'url'} type="url" placeholder="https://your-agent.example.com/run" style={inp} />
                  <p className="text-[12px] mt-2 mb-0" style={{ color: '#444' }}>
                    Must accept POST with a JSON body and return JSON.
                  </p>
                </div>
              )}

              {/* Price + Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={lbl}>Price Per Call (USDC) *</label>
                  <input type="number" step="0.0001" min="0.0001" max="100"
                    value={form.pricePerCallUsdc}
                    onChange={e => setForm(f => ({ ...f, pricePerCallUsdc: e.target.value }))}
                    required style={inp} />
                </div>
                <div>
                  <label style={lbl}>Tags (comma-separated)</label>
                  <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="e.g. crypto, defi, price" style={inp} />
                </div>
              </div>

              {/* Earnings strip */}
              <div className="rounded-xl px-4 py-3 flex flex-wrap justify-between items-center gap-3"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,.06)' }}>
                <span className="text-[13px]" style={{ color: '#666' }}>You earn per call</span>
                <span className="text-[18px] font-black" style={{ color: '#00d4a0' }}>{earnings} USDC</span>
                <span className="text-[12px]" style={{ color: '#444' }}>Platform takes 5%</span>
              </div>

              <button type="submit"
                className="w-full py-4 rounded-xl text-[15px] font-bold text-white cursor-pointer border-none"
                style={{ background: '#f97316', fontFamily: FONT }}>
                {!token ? 'Sign In to Deploy →' : '🚀 Deploy Agent'}
              </button>
            </form>
          )}

          {/* ── DEPLOYING ── */}
          {step === 'deploying' && (
            <div className="text-center py-20">
              <div className="text-[40px] mb-4">⚙️</div>
              <h2 className="text-[18px] font-bold mb-2">Deploying your agent...</h2>
              <p style={{ color: '#555', fontSize: 14 }}>Provisioning wallet and going live on the marketplace</p>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && result && (
            <div>
              <div className="text-center mb-8">
                <div className="text-[48px] mb-3">✅</div>
                <h2 className="text-[24px] font-black tracking-tight mb-2">Agent Live</h2>
                <p style={{ fontSize: 14, color: '#555' }}>
                  <strong style={{ color: '#fff' }}>{result.agent.name}</strong> is now earning on AgentMarket.
                </p>
              </div>

              <div className="rounded-xl p-4 sm:p-5 mb-5"
                style={{ background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)' }}>
                <p className="text-[13px] font-bold mb-3 m-0" style={{ color: '#ef4444' }}>
                  ⚠️ Save Your Wallet Private Key — Shown Once Only
                </p>
                <p className="rounded-lg px-3 py-2.5 text-[11px] font-mono break-all mb-3 m-0"
                  style={{ background: '#080808', color: '#ef4444' }}>
                  {result.wallet.privateKey}
                </p>
                <button onClick={() => { navigator.clipboard.writeText(result.wallet.privateKey); setKeyCopied(true); }}
                  className="text-[12px] px-4 py-2 rounded-lg cursor-pointer"
                  style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', color: '#ef4444', fontFamily: FONT }}>
                  {keyCopied ? '✓ Copied' : 'Copy Key'}
                </button>
              </div>

              <div className="rounded-xl p-4 sm:p-5 mb-5 flex flex-col gap-2"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,.06)' }}>
                {[
                  ['Wallet',    result.wallet.address],
                  ['Price',     `${result.agent.pricePerCallUsdc} USDC / call`],
                  ['You earn',  `${(parseFloat(result.agent.pricePerCallUsdc) * 0.95).toFixed(5)} USDC / call`],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-wrap justify-between gap-2 text-[13px]">
                    <span style={{ color: '#555' }}>{k}</span>
                    <span className="font-mono text-[11px] break-all text-right" style={{ color: '#ccc' }}>{v}</span>
                  </div>
                ))}
              </div>

              <a href="/marketplace"
                className="block text-center text-[14px] font-bold text-white no-underline rounded-xl py-4"
                style={{ background: '#f97316' }}>
                View on Marketplace →
              </a>
            </div>
          )}

          {/* ── ERROR ── */}
          {step === 'error' && (
            <div>
              <div className="rounded-xl p-4 sm:p-5 mb-4"
                style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
                <p className="font-bold text-[14px] mb-2 m-0" style={{ color: '#ef4444' }}>Deployment Failed</p>
                <p className="text-[13px] leading-relaxed m-0" style={{ color: '#888' }}>{errMsg}</p>
              </div>
              <button onClick={() => { setStep('form'); setErrMsg(''); }}
                className="w-full py-3 rounded-xl text-[13px] font-semibold cursor-pointer"
                style={{ background: 'transparent', color: '#666', border: '1px solid rgba(255,255,255,.1)', fontFamily: FONT }}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { api } from '../../lib/api';
import { Navbar } from '../../components/Navbar';
import { useAuthStore } from '../../hooks/useAuthStore';

const CATEGORIES = ['DEFI', 'RISK', 'TRADING', 'INTELLIGENCE', 'PAYMENTS', 'INFRASTRUCTURE', 'OTHER'];

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
  if (!data[coin]) return { error: 'Coin not found', hint: 'Try: bitcoin, ethereum, solana' };
  const price     = data[coin][currency];
  const change24h = data[coin][\`\${currency}_24h_change\`] ?? 0;
  return {
    coin, currency: currency.toUpperCase(), price,
    change24h: parseFloat(change24h.toFixed(2)),
    direction: change24h >= 0 ? 'up' : 'down',
    summary: \`\${coin} is $\${price.toLocaleString()} (\${change24h >= 0 ? '+' : ''}\${change24h.toFixed(2)}% 24h)\`,
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
    'celsius-fahrenheit':    v => v * 9/5 + 32,
    'fahrenheit-celsius':    v => (v - 32) * 5/9,
    'km-miles':              v => v * 0.621371,
    'miles-km':              v => v * 1.60934,
    'kg-lbs':                v => v * 2.20462,
    'lbs-kg':                v => v / 2.20462,
    'meters-feet':           v => v * 3.28084,
    'feet-meters':           v => v / 3.28084,
    'liters-gallons':        v => v * 0.264172,
    'gallons-liters':        v => v / 0.264172,
  };

  const key = \`\${from}-\${to}\`;
  const fn  = conversions[key];
  if (!fn) return { error: \`Unsupported: \${from} to \${to}\`, supported: Object.keys(conversions) };

  const result = fn(value);
  return { value, from, to, result: parseFloat(result.toFixed(6)), summary: \`\${value} \${from} = \${result.toFixed(4)} \${to}\` };
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
    result: \`You sent: \${userInput}\`,
    timestamp: new Date().toISOString(),
  };
}`,
  },
};

export default function DeployPage() {
  const { isConnected } = useAccount();
  const { token } = useAuthStore();

  const [mode, setMode]   = useState<'code' | 'url'>('code');
  const [template, setTemplate] = useState('blank');
  const [form, setForm]   = useState({
    name:             '',
    description:      '',
    category:         'INTELLIGENCE',
    endpointUrl:      '',
    pricePerCallUsdc: '0.01',
    tags:             '',
    code:             TEMPLATES.blank.code,
  });
  const [step,      setStep]      = useState<'form' | 'deploying' | 'done' | 'error'>('form');
  const [result,    setResult]    = useState<any>(null);
  const [errMsg,    setErrMsg]    = useState('');
  const [keyCopied, setKeyCopied] = useState(false);

  function applyTemplate(key: string) {
    const t = TEMPLATES[key];
    setTemplate(key);
    setForm(f => ({
      ...f,
      name:        t.name,
      description: t.description,
      category:    t.category,
      tags:        t.tags,
      code:        t.code,
    }));
  }

  async function deploy(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setErrMsg('Sign in first. Click Connect Wallet in the top right and sign the message.');
      setStep('error');
      return;
    }
    try {
      setStep('deploying');
      const data = await api.deployAgent({
        name:             form.name,
        description:      form.description,
        category:         form.category,
        endpointUrl:      mode === 'url' ? form.endpointUrl : undefined,
        code:             mode === 'code' ? form.code : undefined,
        pricePerCallUsdc: parseFloat(form.pricePerCallUsdc),
        tags:             form.tags.split(',').map(t => t.trim()).filter(Boolean),
      } as any);
      setResult(data);
      setStep('done');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.details
        ? ` — ${JSON.stringify(err.response.data.detail || err.response.data.details)}`
        : '';
      setErrMsg((err?.response?.data?.error || err.message || 'Deployment failed') + detail);
      setStep('error');
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#0d0d0d',
    border: '1px solid rgba(255,255,255,.1)', borderRadius: 10,
    padding: '11px 14px', color: '#fff',
    fontFamily: "'Figtree', sans-serif", fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontFamily: 'monospace',
    letterSpacing: '1px', color: '#555', textTransform: 'uppercase', marginBottom: 6,
  };

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'Figtree', sans-serif" }}>
        <div className="deploy-header" style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '24px 32px' }}>
          <a href="/marketplace" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>← Back to Marketplace</a>
          <h1 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-1px', marginTop: 8 }}>Deploy an Agent</h1>
          <p style={{ fontSize: 14, color: '#555', marginTop: 4 }}>
            Write your agent code below and deploy it in seconds. No server needed.
          </p>
        </div>

        <div className="deploy-body" style={{ maxWidth: 780, margin: '0 auto', padding: '40px 32px' }}>

          {/* Auth warning */}
          {(!isConnected || !token) && step === 'form' && (
            <div style={{ background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>🔑</span>
              <div style={{ fontSize: 13, color: '#888' }}>
                <strong style={{ color: '#f97316' }}>Sign in required.</strong> Click <strong style={{ color: '#fff' }}>Connect Wallet</strong> in the top right first.
              </div>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={deploy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

                {/* Mode toggle */}
                <div style={{ display: 'flex', background: '#111', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 4, gap: 4 }}>
                  {(['code', 'url'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setMode(m)} style={{
                      flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                      background: mode === m ? '#f97316' : 'transparent',
                      color: mode === m ? '#fff' : '#555',
                    }}>
                      {m === 'code' ? '⚡ Write Code (Hosted)' : '🔗 External URL'}
                    </button>
                  ))}
                </div>

                {/* Template picker — only for code mode */}
                {mode === 'code' && (
                  <div>
                    <label style={lbl}>Start from a template</label>
                    <div className="deploy-template-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {Object.entries(TEMPLATES).map(([key, t]) => (
                        <button key={key} type="button" onClick={() => applyTemplate(key)} style={{
                          padding: '10px 8px', borderRadius: 8, border: `1px solid ${template === key ? '#f97316' : 'rgba(255,255,255,.08)'}`,
                          background: template === key ? 'rgba(249,115,22,.1)' : '#111',
                          color: template === key ? '#f97316' : '#888',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          textAlign: 'center',
                        }}>
                          {key === 'crypto' ? '₿ Crypto' : key === 'sentiment' ? '💬 Sentiment' : key === 'converter' ? '📐 Converter' : '✨ Blank'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Name + Category */}
                <div className="deploy-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                    <div style={{ fontSize: 12, color: '#444', marginBottom: 8 }}>
                      Define <code style={{ color: '#f97316' }}>async function run(input)</code> — return any JSON object.
                      You have access to <code style={{ color: '#00d4a0' }}>fetch</code> for external APIs.
                    </div>
                    <textarea
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                      required
                      rows={16}
                      spellCheck={false}
                      style={{
                        ...inp,
                        fontFamily: "'Courier New', monospace",
                        fontSize: 13,
                        lineHeight: 1.6,
                        resize: 'vertical',
                        color: '#e2e8f0',
                        background: '#050505',
                        border: '1px solid rgba(249,115,22,.2)',
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={lbl}>Endpoint URL *</label>
                    <input value={form.endpointUrl} onChange={e => setForm(f => ({ ...f, endpointUrl: e.target.value }))}
                      required={mode === 'url'} type="url" placeholder="https://your-agent.example.com/run"
                      style={inp} />
                    <p style={{ fontSize: 12, color: '#444', marginTop: 6 }}>
                      Must accept POST requests with a JSON body and return JSON.
                    </p>
                  </div>
                )}

                {/* Price + Tags */}
                <div className="deploy-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

                {/* Earnings summary */}
                <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 13, color: '#666' }}>You earn per call</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#00d4a0' }}>
                    {(parseFloat(form.pricePerCallUsdc || '0') * 0.95).toFixed(5)} USDC
                  </div>
                  <div style={{ fontSize: 12, color: '#444' }}>Platform takes 5%</div>
                </div>

                <button type="submit" style={{
                  background: '#f97316', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '15px 0', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', width: '100%',
                }}>
                  {!token ? 'Sign In to Deploy →' : '🚀 Deploy Agent'}
                </button>
              </div>
            </form>
          )}

          {step === 'deploying' && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Deploying your agent...</div>
              <div style={{ fontSize: 14, color: '#555' }}>Provisioning wallet and going live on the marketplace</div>
            </div>
          )}

          {step === 'done' && result && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h2 style={{ fontWeight: 900, fontSize: 26, letterSpacing: '-1px', marginBottom: 8 }}>Agent Live</h2>
                <p style={{ fontSize: 14, color: '#555' }}>
                  <strong style={{ color: '#fff' }}>{result.agent.name}</strong> is now earning on AgentMarket.
                </p>
              </div>

              <div style={{ background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#ef4444', marginBottom: 6 }}>
                  ⚠️ Save Your Earning Wallet Private Key (Shown Once)
                </div>
                <div style={{ background: '#080808', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#ef4444', wordBreak: 'break-all', marginBottom: 10 }}>
                  {result.wallet.privateKey}
                </div>
                <button onClick={() => { navigator.clipboard.writeText(result.wallet.privateKey); setKeyCopied(true); }}
                  style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {keyCopied ? '✓ Copied' : 'Copy Key'}
                </button>
              </div>

              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
                {[
                  ['Wallet',     result.wallet.address],
                  ['Price',      `${result.agent.pricePerCallUsdc} USDC per call`],
                  ['You earn',   `${(parseFloat(result.agent.pricePerCallUsdc) * 0.95).toFixed(5)} USDC per call`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ color: '#555' }}>{k}</span>
                    <span style={{ color: '#ccc', fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{v}</span>
                  </div>
                ))}
              </div>

              <a href="/marketplace" style={{
                display: 'block', textAlign: 'center', background: '#f97316',
                color: '#fff', borderRadius: 10, padding: '14px 0',
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}>
                View on Marketplace →
              </a>
            </div>
          )}

          {step === 'error' && (
            <div>
              <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Deployment Failed</div>
                <div style={{ fontSize: 13, color: '#888' }}>{errMsg}</div>
              </div>
              <button onClick={() => { setStep('form'); setErrMsg(''); }}
                style={{ width: '100%', background: 'transparent', color: '#666', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

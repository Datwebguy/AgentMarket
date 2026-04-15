import { ImageResponse } from 'next/og';

export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

const API = 'https://agentmarket-production-e911.up.railway.app/api/v1';

export default async function AgentOGImage({ params }: { params: { slug: string } }) {
  let agent: any = null;

  try {
    const res = await fetch(`${API}/agents/${params.slug}`);
    if (res.ok) agent = (await res.json()).agent;
  } catch {}

  const name        = agent?.name        || 'AI Agent';
  const description = agent?.description || 'An AI agent on AgentMarket';
  const category    = agent?.category    || 'AGENT';
  const price       = agent ? parseFloat(agent.pricePerCallUsdc).toFixed(4) : '—';
  const calls       = agent ? parseInt(agent.totalCalls).toLocaleString() : '—';

  const catColors: Record<string, string> = {
    DEFI: '#00d4a0', RISK: '#ef4444', TRADING: '#60a5fa',
    INTELLIGENCE: '#f97316', PAYMENTS: '#f59e0b', INFRASTRUCTURE: '#888',
  };
  const catColor = catColors[category] || '#f97316';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#080808',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '32px 32px', display: 'flex' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>Agent</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#f97316' }}>Market</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#00d4a0' }}>.</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: catColor, background: 'rgba(249,115,22,0.12)', padding: '6px 16px', borderRadius: 999, display: 'flex' }}>
            {category}
          </div>
        </div>

        {/* Agent name */}
        <div style={{ fontSize: 64, fontWeight: 900, color: '#ffffff', lineHeight: 1.0, letterSpacing: '-2px', marginBottom: 20, display: 'flex' }}>
          {name}
        </div>

        {/* Description */}
        <div style={{ fontSize: 20, color: '#888888', lineHeight: 1.5, maxWidth: 700, marginBottom: 'auto', display: 'flex' }}>
          {description.length > 120 ? description.slice(0, 117) + '...' : description}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 32, marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#00d4a0', letterSpacing: '-1px', display: 'flex' }}>{price} USDC</span>
            <span style={{ fontSize: 14, color: '#555', display: 'flex' }}>per call</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#f97316', letterSpacing: '-1px', display: 'flex' }}>{calls}</span>
            <span style={{ fontSize: 14, color: '#555', display: 'flex' }}>total calls</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-1px', display: 'flex' }}>x402</span>
            <span style={{ fontSize: 14, color: '#555', display: 'flex' }}>payment protocol</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

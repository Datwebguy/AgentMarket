import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

// Default OG image for homepage
export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#080808',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Dot grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            display: 'flex',
          }}
        />

        {/* Purple glow */}
        <div
          style={{
            position: 'absolute',
            width: 600,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(124,92,252,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
            display: 'flex',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 900, color: '#ffffff' }}>Agent</span>
          <span style={{ fontSize: 32, fontWeight: 900, color: '#7c5cfc' }}>Market</span>
          <span style={{ fontSize: 32, fontWeight: 900, color: '#00d4a0' }}>.</span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.0,
            letterSpacing: '-2px',
            marginBottom: 20,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span>The Marketplace</span>
          <span>for AI Agents</span>
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: 22,
            color: '#888888',
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.5,
            zIndex: 1,
            marginBottom: 48,
            display: 'flex',
          }}
        >
          Deploy agents. Earn USDC per call via x402. Built on XLayer.
        </div>

        {/* Stat pills */}
        <div style={{ display: 'flex', gap: 16, zIndex: 1 }}>
          {[
            { label: 'x402 Protocol', color: '#7c5cfc' },
            { label: 'XLayer Mainnet', color: '#00d4a0' },
            { label: 'OKX Onchain OS', color: '#f59e0b' },
          ].map(pill => (
            <div
              key={pill.label}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999,
                padding: '10px 22px',
                fontSize: 16,
                fontWeight: 700,
                color: pill.color,
                display: 'flex',
              }}
            >
              {pill.label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}

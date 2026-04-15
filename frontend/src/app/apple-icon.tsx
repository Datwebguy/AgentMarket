import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#0a0a0a',
          borderRadius: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Antenna */}
        <div style={{
          position: 'absolute',
          top: 24,
          width: 10,
          height: 22,
          background: '#f97316',
          borderRadius: 5,
        }} />
        <div style={{
          position: 'absolute',
          top: 18,
          width: 16,
          height: 10,
          borderRadius: '50%',
          background: '#f97316',
        }} />

        {/* Robot head */}
        <div style={{
          width: 110,
          height: 90,
          background: '#1a1a1a',
          border: '4px solid #f97316',
          borderRadius: 18,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginTop: 16,
        }}>
          {/* Eyes row */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#00d4a0',
              boxShadow: '0 0 8px #00d4a0',
            }} />
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#00d4a0',
              boxShadow: '0 0 8px #00d4a0',
            }} />
          </div>
          {/* Mouth */}
          <div style={{
            width: 48,
            height: 8,
            background: '#f97316',
            borderRadius: 4,
          }} />
        </div>

        {/* Body stub */}
        <div style={{
          width: 80,
          height: 24,
          background: '#1a1a1a',
          border: '3px solid rgba(249,115,22,0.5)',
          borderRadius: 8,
          marginTop: 6,
        }} />
      </div>
    ),
    { ...size }
  );
}

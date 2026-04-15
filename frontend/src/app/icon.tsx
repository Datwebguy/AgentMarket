import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0a0a0a',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* Robot head */}
        <div style={{
          width: 20,
          height: 16,
          background: '#1a1a1a',
          border: '1.5px solid #f97316',
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}>
          {/* Eyes row */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00d4a0' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00d4a0' }} />
          </div>
          {/* Mouth */}
          <div style={{ width: 8, height: 2, background: '#f97316', borderRadius: 1 }} />
        </div>
        {/* Antenna */}
        <div style={{
          position: 'absolute',
          top: 4,
          width: 2,
          height: 4,
          background: '#f97316',
          borderRadius: 1,
        }} />
        {/* Body stub */}
        <div style={{
          width: 14,
          height: 4,
          background: '#1a1a1a',
          border: '1px solid rgba(249,115,22,0.4)',
          borderRadius: 2,
          marginTop: 1,
        }} />
      </div>
    ),
    { ...size }
  );
}

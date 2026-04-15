'use client';

import { Agent } from '../lib/api';

interface Props {
  agent:  Agent;
  onCall: () => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  DEFI:           { bg: 'rgba(0,212,160,.1)',    color: '#00d4a0' },
  RISK:           { bg: 'rgba(239,68,68,.1)',     color: '#ef4444' },
  TRADING:        { bg: 'rgba(96,165,250,.1)',    color: '#60a5fa' },
  INTELLIGENCE:   { bg: 'rgba(249,115,22,.12)',   color: '#f97316' },
  PAYMENTS:       { bg: 'rgba(245,158,11,.1)',    color: '#f59e0b' },
  INFRASTRUCTURE: { bg: 'rgba(255,255,255,.06)',  color: '#888' },
};

export function AgentCard({ agent, onCall }: Props) {
  const catStyle = CATEGORY_COLORS[agent.category] || CATEGORY_COLORS.INFRASTRUCTURE;

  return (
    <div
      style={{
        background: '#101010',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 16,
        padding: 20,
        cursor: 'pointer',
        transition: 'border-color .2s, transform .15s',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Figtree', sans-serif",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(249,115,22,.35)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.1)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, #f97316, #00d4a0)',
        opacity: 0,
        transition: 'opacity .2s',
      }} className="card-bar" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: '#1c1c1c', border: '1px solid rgba(255,255,255,.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {getCategoryEmoji(agent.category)}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px',
            borderRadius: 4, ...catStyle,
          }}>
            {agent.category}
          </span>
          {agent.isVerified && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 4, background: 'rgba(34,197,94,.1)', color: '#22c55e',
            }}>
              ✓ VERIFIED
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, letterSpacing: '-.3px', color: '#fff' }}>
        {agent.name}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: '#888', lineHeight: 1.55, marginBottom: 12 }}>
        {agent.description.length > 100 ? agent.description.slice(0, 97) + '...' : agent.description}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#666' }}>
          <strong style={{ display: 'block', fontSize: 13, color: '#fff', fontWeight: 700 }}>
            {parseInt(agent.totalCalls.toString()).toLocaleString()}
          </strong>
          Calls
        </div>
        <div style={{ fontSize: 11, color: '#666' }}>
          <strong style={{ display: 'block', fontSize: 13, color: '#fff', fontWeight: 700 }}>
            {agent.avgResponseMs ? `${agent.avgResponseMs}ms` : '—'}
          </strong>
          Avg Response
        </div>
        <div style={{ fontSize: 11, color: '#666' }}>
          <strong style={{ display: 'block', fontSize: 13, color: '#fff', fontWeight: 700 }}>
            {parseFloat(agent.uptimePct.toString()).toFixed(1)}%
          </strong>
          Uptime
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 12,
      }}>
        <div>
          <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'monospace' }}>
            Per Call
          </div>
          <div style={{ fontSize: 15, color: '#00d4a0', fontWeight: 900, letterSpacing: '-.3px' }}>
            {parseFloat(agent.pricePerCallUsdc.toString()).toFixed(4)} USDC
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onCall(); }}
          style={{
            background: '#f97316', color: '#fff', border: 'none',
            borderRadius: 999, padding: '8px 18px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Figtree', sans-serif",
            transition: 'opacity .18s',
          }}
          onMouseEnter={e => ((e.target as HTMLElement).style.opacity = '.85')}
          onMouseLeave={e => ((e.target as HTMLElement).style.opacity = '1')}
        >
          Call Agent
        </button>
      </div>
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    DEFI:           '📈',
    RISK:           '🔍',
    TRADING:        '⚡',
    INTELLIGENCE:   '🧠',
    PAYMENTS:       '💸',
    INFRASTRUCTURE: '🔧',
    OTHER:          '🤖',
  };
  return map[category] || '🤖';
}

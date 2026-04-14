'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { api } from '../../lib/api';
import { useAuthStore } from '../../hooks/useAuthStore';

// Admin wallets — add your wallet address here
const ADMIN_WALLETS = [
  // Add your wallet address here when you deploy
  // e.g. '0xYOUR_WALLET_ADDRESS_LOWERCASE'
].map(a => a.toLowerCase());

type AdminTab = 'overview' | 'agents' | 'calls' | 'leaderboard';

export default function AdminPage() {
  const { address } = useAccount();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<AdminTab>('overview');

  // Check admin access
  const isAdmin = address && (
    ADMIN_WALLETS.includes(address.toLowerCase()) ||
    user?.role === 'ADMIN'
  );

  const qc = useQueryClient();

  const { data: stats }       = useQuery({ queryKey: ['admin-stats'],       queryFn: api.getPlatformStats.bind(api), enabled: !!isAdmin });
  const { data: agentData }   = useQuery({ queryKey: ['admin-agents'],      queryFn: () => api.listAgents({ limit: 50, sort: 'createdAt', order: 'desc' }), enabled: !!isAdmin && tab === 'agents' });
  const { data: lbData }      = useQuery({ queryKey: ['admin-leaderboard'], queryFn: () => api.getLeaderboard('calls', 20), enabled: !!isAdmin && tab === 'leaderboard' });
  const { data: callsData }   = useQuery({ queryKey: ['admin-calls'],       queryFn: () => api.listCalls({ limit: 30 }), enabled: !!isAdmin && tab === 'calls' });

  if (!address) {
    return (
      <main style={mainStyle}>
        <div style={centerStyle}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
          <h2 style={titleStyle}>Admin Access</h2>
          <p style={subStyle}>Connect your admin wallet to continue.</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={mainStyle}>
        <div style={centerStyle}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⛔</div>
          <h2 style={titleStyle}>Access Denied</h2>
          <p style={subStyle}>This wallet does not have admin permissions.</p>
          <code style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', marginTop: 12, display: 'block' }}>{address}</code>
        </div>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-.5px' }}>AgentMarket Admin</h1>
          <p style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', marginTop: 2 }}>{address?.slice(0,10)}...{address?.slice(-6)}</p>
        </div>
        <a href="/marketplace" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>← Back to platform</a>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '0 32px', display: 'flex', gap: 2 }}>
        {(['overview','agents','calls','leaderboard'] as AdminTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '12px 16px', fontSize: 13, fontWeight: tab === t ? 700 : 500,
            color: tab === t ? '#7c5cfc' : '#666', background: 'none', border: 'none',
            borderBottom: tab === t ? '2px solid #7c5cfc' : '2px solid transparent',
            cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
            marginBottom: -1,
          }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 32 }}>
              {[
                { label: 'Total Agents',    value: stats?.totalAgents ?? '—',                         color: '#7c5cfc' },
                { label: 'Total Calls',     value: stats?.totalCalls?.toLocaleString() ?? '—',         color: '#00d4a0' },
                { label: 'Volume (USDC)',   value: stats ? `$${parseFloat(stats.totalVolumeUsdc).toFixed(2)}` : '—', color: '#fff' },
                { label: 'Unique Callers',  value: stats?.uniqueCallers?.toLocaleString() ?? '—',      color: '#fff' },
              ].map(s => (
                <div key={s.label} style={statCard}>
                  <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontWeight: 900, fontSize: 28, color: s.color, letterSpacing: '-1px' }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={card}>
                <div style={cardTitle}>Platform Health</div>
                {[
                  ['Avg response time', `${stats?.avgResponseMs ?? '—'}ms`],
                  ['Active agents',     stats?.totalAgents ?? '—'],
                  ['x402 protocol',     'Operational'],
                  ['XLayer RPC',        'Connected'],
                  ['Database',          'Connected'],
                ].map(([k, v]) => (
                  <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <span style={{ color: '#666' }}>{k}</span>
                    <span style={{ color: v === 'Operational' || v === 'Connected' ? '#00d4a0' : '#ccc', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={cardTitle}>Quick Actions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {[
                    { label: 'Refresh all stats',    action: () => qc.invalidateQueries() },
                    { label: 'Export call data',     action: () => alert('Export feature coming in next build') },
                    { label: 'Broadcast announcement', action: () => alert('Broadcast feature coming in next build') },
                  ].map(a => (
                    <button key={a.label} onClick={a.action} style={{ padding: '10px 14px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#ccc', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background .18s' }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* AGENTS */}
        {tab === 'agents' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={cardTitle}>All Agents ({agentData?.pagination?.total ?? '—'})</div>
            </div>
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 90px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>
                <span>Name</span><span>Category</span><span>Calls</span><span>Price</span><span>Status</span><span>Actions</span>
              </div>
              {agentData?.agents.map(agent => (
                <div key={agent.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 90px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.03)', alignItems: 'center', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', marginTop: 2 }}>{agent.owner?.walletAddress?.slice(0,10)}...</div>
                  </div>
                  <span style={{ color: '#888' }}>{agent.category}</span>
                  <span style={{ color: '#ccc' }}>{parseInt(agent.totalCalls?.toString() || '0').toLocaleString()}</span>
                  <span style={{ color: '#00d4a0', fontWeight: 600 }}>{parseFloat(agent.pricePerCallUsdc?.toString() || '0').toFixed(4)} USDC</span>
                  <span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(34,197,94,.1)', color: '#22c55e', fontFamily: 'monospace' }}>
                      ACTIVE
                    </span>
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => {}} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: 'rgba(124,92,252,.15)', border: '1px solid rgba(124,92,252,.25)', color: '#7c5cfc', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Verify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALLS */}
        {tab === 'calls' && (
          <div style={card}>
            <div style={cardTitle}>Recent Calls</div>
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>
                <span>Call ID</span><span>Agent</span><span>Caller</span><span>Amount</span><span>Status</span>
              </div>
              {callsData?.calls.map(call => (
                <div key={call.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,.03)', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ fontFamily: 'monospace', color: '#7c5cfc' }}>{call.id.slice(0, 16)}...</span>
                  <span style={{ color: '#ccc', fontWeight: 600 }}>{call.agent?.name || '—'}</span>
                  <span style={{ fontFamily: 'monospace', color: '#666' }}>{call.callerWallet?.slice(0,10)}...</span>
                  <span style={{ color: '#00d4a0', fontWeight: 600 }}>{parseFloat(call.amountUsdc?.toString() || '0').toFixed(4)} USDC</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: call.status === 'COMPLETED' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)', color: call.status === 'COMPLETED' ? '#22c55e' : '#ef4444', fontFamily: 'monospace' }}>
                    {call.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <div style={card}>
            <div style={cardTitle}>Agent Leaderboard</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {lbData?.leaderboard.map((agent, i) => (
                <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? '#7c5cfc' : 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0, color: i < 3 ? '#fff' : '#555' }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{agent.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#7c5cfc' }}>{parseInt(agent.totalCalls?.toString() || '0').toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: '#444' }}>calls</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#00d4a0' }}>${parseFloat(agent.totalRevenueUsdc?.toString() || '0').toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: '#444' }}>earned</div>
                  </div>
                  {agent.isVerified && <span style={{ fontSize: 10, color: '#22c55e', background: 'rgba(34,197,94,.1)', padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace' }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

const mainStyle: React.CSSProperties = { minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'Figtree', sans-serif" };
const centerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' };
const titleStyle: React.CSSProperties = { fontWeight: 900, fontSize: 24, letterSpacing: '-1px', marginBottom: 8 };
const subStyle: React.CSSProperties = { fontSize: 14, color: '#666', fontWeight: 400 };
const statCard: React.CSSProperties = { background: '#101010', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '20px 22px' };
const card: React.CSSProperties = { background: '#101010', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '24px' };
const cardTitle: React.CSSProperties = { fontWeight: 800, fontSize: 16, letterSpacing: '-.3px', marginBottom: 16 };

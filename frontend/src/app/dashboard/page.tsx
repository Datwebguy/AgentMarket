'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { api } from '../../lib/api';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user', address],
    queryFn:  () => api.getUser(address!),
    enabled:  !!address,
  });

  const { data: calls } = useQuery({
    queryKey: ['calls'],
    queryFn:  () => api.listCalls({ limit: 10 }),
    enabled:  isConnected,
  });

  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn:  api.getPlatformStats.bind(api),
  });

  if (!isConnected) {
    return (
      <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Figtree', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
          <h2 style={{ fontWeight: 900, fontSize: 24, marginBottom: 8 }}>Connect Your Wallet</h2>
          <p style={{ color: '#666', fontSize: 14 }}>Connect your wallet to view your dashboard</p>
        </div>
      </main>
    );
  }

  const totalEarnings = user?.agents?.reduce(
    (sum, a) => sum + parseFloat(a.totalRevenueUsdc?.toString() || '0'), 0
  ) || 0;

  const totalCalls = user?.agents?.reduce(
    (sum, a) => sum + parseInt(a.totalCalls?.toString() || '0'), 0
  ) || 0;

  return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'Figtree', sans-serif" }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-1px' }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: '#555', fontFamily: 'monospace', marginTop: 2 }}>{address}</p>
        </div>
        <a href="/deploy" style={{ background: '#7c5cfc', color: '#fff', border: 'none', borderRadius: 999, padding: '9px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + Deploy Agent
        </a>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>

        {/* ── STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 40 }}>
          {[
            { label: 'Total Earnings', value: `$${totalEarnings.toFixed(4)}`, unit: 'USDC', color: '#00d4a0' },
            { label: 'Total Calls',    value: totalCalls.toLocaleString(), unit: 'all time', color: '#7c5cfc' },
            { label: 'Agents Live',    value: user?.agents?.length || 0, unit: 'deployed', color: '#fff' },
            { label: 'Platform Calls', value: stats?.totalCalls?.toLocaleString() || '—', unit: '24h total', color: '#fff' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} style={{ background: '#101010', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
              <div style={{ fontWeight: 900, fontSize: 26, letterSpacing: '-1px', color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{unit}</div>
            </div>
          ))}
        </div>

        {/* ── MY AGENTS ── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-.5px', marginBottom: 16 }}>My Agents</h2>
          {userLoading ? (
            <div style={{ color: '#444', fontSize: 14 }}>Loading...</div>
          ) : user?.agents?.length === 0 ? (
            <div style={{ background: '#101010', border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14, padding: '40px', textAlign: 'center' }}>
              <div style={{ color: '#444', fontSize: 14, marginBottom: 16 }}>No agents deployed yet.</div>
              <a href="/deploy" style={{ color: '#7c5cfc', fontSize: 13, fontWeight: 600 }}>Deploy your first agent →</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {user?.agents?.map(agent => (
                <div key={agent.id} style={{ background: '#101010', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{agent.category}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#00d4a0' }}>${parseFloat(agent.totalRevenueUsdc?.toString() || '0').toFixed(4)}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>EARNED</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{parseInt(agent.totalCalls?.toString() || '0').toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>CALLS</div>
                    </div>
                  </div>
                  <a href={`/marketplace/${agent.slug}`} style={{ fontSize: 12, color: '#7c5cfc', fontWeight: 600 }}>View →</a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RECENT CALLS ── */}
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-.5px', marginBottom: 16 }}>Recent Calls</h2>
          <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 100px', gap: 0, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>
              <span>Agent</span><span>Tx Hash</span><span>Amount</span><span>Status</span><span>Time</span>
            </div>
            {calls?.calls?.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#444', fontSize: 13 }}>No calls yet</div>
            ) : (
              calls?.calls?.map(call => (
                <div key={call.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 100px', gap: 0, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.03)', fontSize: 13, alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#ccc' }}>{call.agent?.name || '—'}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7c5cfc' }}>
                    {call.txHash ? `${call.txHash.slice(0, 10)}...` : '—'}
                  </span>
                  <span style={{ color: '#00d4a0', fontWeight: 600 }}>{parseFloat(call.amountUsdc?.toString() || '0').toFixed(4)} USDC</span>
                  <span style={{ fontSize: 11 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4,
                      background: call.status === 'COMPLETED' ? 'rgba(34,197,94,.1)' : call.status === 'FAILED' ? 'rgba(239,68,68,.1)' : 'rgba(255,255,255,.06)',
                      color: call.status === 'COMPLETED' ? '#22c55e' : call.status === 'FAILED' ? '#ef4444' : '#888',
                    }}>
                      {call.status}
                    </span>
                  </span>
                  <span style={{ fontSize: 11, color: '#444' }}>
                    {new Date(call.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { api, PlatformStats, Agent } from '../../lib/api';
import { Navbar } from '../../components/Navbar';

function EditAgentModal({ agent, onClose, onSaved }: { agent: Agent; onClose: () => void; onSaved: () => void }) {
  const [name, setName]         = useState(agent.name);
  const [description, setDesc]  = useState(agent.description);
  const [price, setPrice]       = useState(String(agent.pricePerCallUsdc ?? ''));
  const [code, setCode]         = useState(agent.code ?? '');
  const [endpointUrl, setUrl]   = useState(agent.endpointUrl ?? '');
  const [status, setStatus]     = useState(agent.status ?? 'ACTIVE');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.updateAgent(agent.id, {
        name,
        description,
        pricePerCallUsdc: parseFloat(price),
        ...(code        ? { code }        : {}),
        ...(endpointUrl ? { endpointUrl } : {}),
        status,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.5px' }}>Edit Agent</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3} style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Price per call (USDC)</label>
            <input type="number" step="0.001" value={price} onChange={e => setPrice(e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="DEPRECATED">DEPRECATED</option>
            </select>
          </div>

          {agent.code != null && (
            <div>
              <label style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Agent Code</label>
              <textarea value={code} onChange={e => setCode(e.target.value)} rows={14} spellCheck={false} style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 14px', color: '#a8ff78', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          )}

          {agent.endpointUrl != null && (
            <div>
              <label style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Endpoint URL</label>
              <input value={endpointUrl} onChange={e => setUrl(e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          )}

          {error && <div style={{ background: 'rgba(255,68,68,.1)', border: '1px solid rgba(255,68,68,.3)', borderRadius: 8, padding: '10px 14px', color: '#ff6b6b', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 20px', color: '#888', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ background: '#f97316', border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

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

  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ['platform-stats'],
    queryFn:  api.getPlatformStats.bind(api),
  });

  if (!isConnected) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Figtree', sans-serif" }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
            <h2 style={{ fontWeight: 900, fontSize: 24, marginBottom: 8 }}>Connect Your Wallet</h2>
            <p style={{ color: '#666', fontSize: 14 }}>Use the button in the top-right to connect</p>
          </div>
        </main>
      </>
    );
  }

  const totalEarnings = user?.agents?.reduce(
    (sum, a) => sum + parseFloat(a.totalRevenueUsdc?.toString() || '0'), 0
  ) || 0;

  const totalCalls = user?.agents?.reduce(
    (sum, a) => sum + parseInt(a.totalCalls?.toString() || '0'), 0
  ) || 0;

  return (
    <>
    <Navbar />
    <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'Figtree', sans-serif" }}>
      <div className="dash-header" style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-1px' }}>Dashboard</h1>
          <p style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', marginTop: 2, wordBreak: 'break-all' }}>{address}</p>
        </div>
        <a href="/deploy" style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 999, padding: '9px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          + Deploy Agent
        </a>
      </div>

      <div className="dash-body" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>

        {/* ── STAT CARDS ── */}
        <div className="dash-stat-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 40 }}>
          {[
            { label: 'Total Earnings', value: `$${totalEarnings.toFixed(4)}`, unit: 'USDC', color: '#00d4a0' },
            { label: 'Total Calls',    value: totalCalls.toLocaleString(), unit: 'all time', color: '#f97316' },
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
              <a href="/deploy" style={{ color: '#f97316', fontSize: 13, fontWeight: 600 }}>Deploy your first agent →</a>
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
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button onClick={() => setEditingAgent(agent)} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '5px 14px', color: '#ccc', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                    <a href={`/marketplace/${agent.slug}`} style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>View →</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RECENT CALLS ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-.5px', margin: 0 }}>Recent Calls</h2>
            <a href="/calls" style={{ fontSize: 13, color: '#f97316', fontWeight: 600, textDecoration: 'none' }}>View all →</a>
          </div>
          <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, overflow: 'hidden' }}>
            {calls?.calls?.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#444', fontSize: 13 }}>No calls yet</div>
            ) : (
              <div className="dash-calls-list">
                {/* Desktop table header */}
                <div className="dash-calls-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px 110px 90px', gap: 0, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 10, color: '#444', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  <span>Agent</span><span>Tx Hash</span><span>Amount</span><span>Status</span><span>Time</span>
                </div>
                {calls?.calls?.map(call => (
                  <div key={call.id} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    {/* Desktop row */}
                    <div className="dash-calls-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px 110px 90px', gap: 0, padding: '12px 20px', fontSize: 13, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#ccc' }}>{call.agent?.name || '—'}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {call.txHash
                          ? <a href={`${process.env.NEXT_PUBLIC_X_LAYER_EXPLORER || 'https://www.oklink.com/xlayer'}/tx/${call.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#f97316', textDecoration: 'none' }}>{call.txHash.slice(0, 10)}...↗</a>
                          : <span style={{ color: '#555' }}>—</span>}
                      </span>
                      <span style={{ color: '#00d4a0', fontWeight: 600 }}>{parseFloat(call.amountUsdc?.toString() || '0').toFixed(4)} USDC</span>
                      <span style={{ fontSize: 11 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, background: call.status === 'COMPLETED' ? 'rgba(34,197,94,.1)' : call.status === 'FAILED' ? 'rgba(239,68,68,.1)' : 'rgba(255,255,255,.06)', color: call.status === 'COMPLETED' ? '#22c55e' : call.status === 'FAILED' ? '#ef4444' : '#888' }}>
                          {call.status}
                        </span>
                      </span>
                      <span style={{ fontSize: 11, color: '#444' }}>{new Date(call.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>

    {editingAgent && (
      <EditAgentModal
        agent={editingAgent}
        onClose={() => setEditingAgent(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['user', address] })}
      />
    )}
    </>
  );
}

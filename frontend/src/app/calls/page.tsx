'use client';

import { useState } from 'react';
import { useQuery }  from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { api, AgentCall } from '../../lib/api';
import { Navbar }   from '../../components/Navbar';

const FONT    = "'Figtree', sans-serif";
const EXPLORER = process.env.NEXT_PUBLIC_X_LAYER_EXPLORER || 'https://www.oklink.com/xlayer';

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  COMPLETED: { bg: 'rgba(34,197,94,.1)',   color: '#22c55e', label: 'Completed' },
  FAILED:    { bg: 'rgba(239,68,68,.1)',   color: '#ef4444', label: 'Failed'    },
  PENDING:   { bg: 'rgba(255,255,255,.06)', color: '#888',   label: 'Pending'   },
  EXECUTING: { bg: 'rgba(249,115,22,.1)',  color: '#f97316', label: 'Executing' },
  REFUNDED:  { bg: 'rgba(96,165,250,.1)', color: '#60a5fa', label: 'Refunded'  },
};

function CallRow({ call }: { call: AgentCall }) {
  const [open,   setOpen]   = useState(false);
  const [detail, setDetail] = useState<AgentCall | null>(null);
  const [loading, setLoading] = useState(false);

  const s = STATUS_STYLE[call.status] || STATUS_STYLE.PENDING;
  const date = new Date(call.createdAt);

  async function expand() {
    if (!open && !detail) {
      setLoading(true);
      try {
        const d = await api.getCall(call.id);
        setDetail(d);
      } catch { /* redacted or error — use base call */ }
      finally { setLoading(false); }
    }
    setOpen(o => !o);
  }

  const shown = detail || call;

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
      {/* Row */}
      <button onClick={expand} style={{
        width: '100%', textAlign: 'left', padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: '16px',
        cursor: 'pointer', background: 'transparent', border: 'none',
        fontFamily: FONT,
      }}>
        {/* Agent name + category */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {call.agent?.name || 'Unknown Agent'}
          </span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#555' }}>
            {call.agent?.category || ''} · {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Amount + status + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#00d4a0', display: 'block' }}>
              {parseFloat(call.amountUsdc).toFixed(4)} USDC
            </span>
            {call.responseMs && (
              <span style={{ fontSize: 11, color: '#555' }}>{call.responseMs}ms</span>
            )}
          </div>

          <span style={{
            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
            background: s.bg, color: s.color, flexShrink: 0,
          }}>
            {s.label}
          </span>

          <span style={{ color: '#444', fontSize: 12, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>
            ▾
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div style={{
          padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px',
          background: 'rgba(255,255,255,.015)', borderTop: '1px solid rgba(255,255,255,.05)',
        }}>
          {loading && (
            <p style={{ fontSize: 13, paddingTop: 12, color: '#555', margin: 0 }}>Loading details...</p>
          )}

          {/* TX Hash */}
          {call.txHash && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', color: '#555', marginBottom: 8, marginTop: 0 }}>Transaction</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                <code style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', color: '#f97316' }}>
                  {call.txHash}
                </code>
                <a href={`${EXPLORER}/tx/${call.txHash}`} target="_blank" rel="noopener noreferrer"
                  style={{
                    fontSize: 12, fontWeight: 700, textDecoration: 'none', padding: '6px 12px',
                    borderRadius: 8, flexShrink: 0,
                    background: 'rgba(249,115,22,.12)', color: '#f97316', border: '1px solid rgba(249,115,22,.2)',
                  }}>
                  Explorer ↗
                </a>
              </div>
            </div>
          )}

          {/* Error */}
          {call.status === 'FAILED' && (shown as any)?.errorMessage && (
            <div style={{ borderRadius: 12, padding: 12, background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.15)' }}>
              <p style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', color: '#ef4444', marginBottom: 4, marginTop: 0 }}>Error</p>
              <p style={{ fontSize: 12, margin: 0, lineHeight: 1.6, color: '#aaa' }}>
                {(shown as any).errorMessage}
              </p>
            </div>
          )}

          {/* Input */}
          {(shown as any)?.inputPayload && (shown as any).inputPayload !== '[redacted]' && (
            <div>
              <p style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', color: '#555', marginBottom: 8, marginTop: 0 }}>Input</p>
              <pre style={{
                borderRadius: 12, padding: 12, fontSize: 11, fontFamily: 'monospace',
                overflowX: 'auto', lineHeight: 1.6, margin: 0,
                background: '#080808', border: '1px solid rgba(255,255,255,.07)', color: '#ccc',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {JSON.stringify((shown as any).inputPayload, null, 2)}
              </pre>
            </div>
          )}

          {/* Output */}
          {(shown as any)?.outputPayload && (shown as any).outputPayload !== '[redacted]' && (
            <div>
              <p style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', color: '#00d4a0', marginBottom: 8, marginTop: 0 }}>Result</p>
              <pre style={{
                borderRadius: 12, padding: 12, fontSize: 11, fontFamily: 'monospace',
                overflowX: 'auto', lineHeight: 1.6, margin: 0,
                background: '#080808', border: '1px solid rgba(0,212,160,.15)', color: '#00d4a0',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {JSON.stringify((shown as any).outputPayload, null, 2)}
              </pre>
            </div>
          )}

          {/* Settlement info */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {[
              ['Agent earned', `${parseFloat(call.agentEarnedUsdc).toFixed(6)} USDC`],
              ['Platform fee', `${parseFloat(call.platformFeeUsdc).toFixed(6)} USDC`],
              ['Response',     call.responseMs ? `${call.responseMs}ms` : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', color: '#444', marginBottom: 2, marginTop: 0 }}>{k}</p>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#888' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CallsPage() {
  const { isConnected } = useAccount();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['calls', page],
    queryFn:  () => api.listCalls({ page, limit: 20 }),
    enabled:  isConnected,
  });

  if (!isConnected) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808', fontFamily: FONT }}>
          <div style={{ textAlign: 'center', padding: '0 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px', color: '#fff' }}>Connect Your Wallet</h2>
            <p style={{ color: '#555', fontSize: 14, margin: 0 }}>Connect your wallet to see your call history.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: FONT }}>

        {/* Header */}
        <div className="calls-header" style={{
          maxWidth: 900, margin: '0 auto', padding: '40px 32px 16px',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <a href="/dashboard" style={{ fontSize: 13, textDecoration: 'none', color: '#555' }}>← Dashboard</a>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px', margin: '8px 0 4px', color: '#fff' }}>Call History</h1>
            <p style={{ fontSize: 13, margin: 0, color: '#555' }}>
              {data ? `${data.pagination.total} total calls` : "All calls you've made or received"}
            </p>
          </div>
          <a href="/marketplace" style={{
            fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none',
            borderRadius: 999, padding: '10px 20px', background: '#f97316', whiteSpace: 'nowrap',
          }}>
            + Call an Agent
          </a>
        </div>

        {/* Content */}
        <div className="calls-content" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 32px 80px' }}>

          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 12, height: 64, background: '#101010' }} />
              ))}
            </div>
          )}

          {!isLoading && data?.calls.length === 0 && (
            <div style={{ textAlign: 'center', padding: '96px 24px' }}>
              <div style={{ fontSize: 48, opacity: 0.2, marginBottom: 16 }}>📋</div>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 8px', color: '#fff' }}>No calls yet</h2>
              <p style={{ fontSize: 13, marginBottom: 24, color: '#555' }}>
                Your call history will appear here after you call an agent.
              </p>
              <a href="/marketplace" style={{
                fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none',
                borderRadius: 999, padding: '12px 28px', background: '#f97316', display: 'inline-block',
              }}>
                Browse Agents
              </a>
            </div>
          )}

          {!isLoading && data && data.calls.length > 0 && (
            <>
              <div style={{ border: '1px solid rgba(255,255,255,.07)', background: '#101010', borderRadius: 16, overflow: 'hidden' }}>
                {data.calls.map(call => (
                  <CallRow key={call.id} call={call} />
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{
                      fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 999,
                      cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.3 : 1,
                      background: 'transparent', color: '#888', border: '1px solid rgba(255,255,255,.1)', fontFamily: FONT,
                    }}>
                    ← Prev
                  </button>
                  <span style={{ fontSize: 13, color: '#555' }}>
                    Page {page} of {data.pagination.totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))} disabled={page === data.pagination.totalPages}
                    style={{
                      fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 999,
                      cursor: page === data.pagination.totalPages ? 'not-allowed' : 'pointer',
                      opacity: page === data.pagination.totalPages ? 0.3 : 1,
                      background: 'transparent', color: '#888', border: '1px solid rgba(255,255,255,.1)', fontFamily: FONT,
                    }}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <style>{`
        @media (max-width: 640px) {
          .calls-header  { padding: 24px 16px 16px !important; }
          .calls-content { padding: 16px 0 60px !important; }
        }
      `}</style>
    </>
  );
}

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
      <button onClick={expand}
        className="w-full text-left px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 cursor-pointer bg-transparent border-none hover:bg-white/[0.02] transition-colors"
        style={{ fontFamily: FONT }}>

        {/* Agent name + category */}
        <div className="flex-1 min-w-0">
          <span className="text-[14px] font-semibold text-white block truncate">
            {call.agent?.name || 'Unknown Agent'}
          </span>
          <span className="text-[11px] font-mono" style={{ color: '#555' }}>
            {call.agent?.category || ''} · {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-right">
            <span className="text-[14px] font-bold block" style={{ color: '#00d4a0' }}>
              {parseFloat(call.amountUsdc).toFixed(4)} USDC
            </span>
            {call.responseMs && (
              <span className="text-[11px]" style={{ color: '#555' }}>{call.responseMs}ms</span>
            )}
          </div>

          {/* Status badge */}
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: s.bg, color: s.color }}>
            {s.label}
          </span>

          {/* Chevron */}
          <span className="text-[#444] text-[12px] flex-shrink-0 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
            ▾
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 sm:px-5 pb-5 flex flex-col gap-4"
          style={{ background: 'rgba(255,255,255,.015)', borderTop: '1px solid rgba(255,255,255,.05)' }}>

          {loading && (
            <p className="text-[13px] py-3" style={{ color: '#555' }}>Loading details...</p>
          )}

          {/* TX Hash */}
          {call.txHash && (
            <div className="mt-3">
              <p className="text-[10px] font-mono tracking-widest uppercase mb-2" style={{ color: '#555' }}>Transaction</p>
              <div className="flex flex-wrap items-center gap-3">
                <code className="text-[11px] font-mono break-all" style={{ color: '#f97316' }}>
                  {call.txHash}
                </code>
                <a href={`${EXPLORER}/tx/${call.txHash}`} target="_blank" rel="noopener noreferrer"
                  className="text-[12px] font-bold no-underline px-3 py-1.5 rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(249,115,22,.12)', color: '#f97316', border: '1px solid rgba(249,115,22,.2)' }}>
                  Explorer ↗
                </a>
              </div>
            </div>
          )}

          {/* Error */}
          {call.status === 'FAILED' && (shown as any)?.errorMessage && (
            <div className="rounded-xl p-3"
              style={{ background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.15)' }}>
              <p className="text-[11px] font-mono tracking-widest uppercase mb-1" style={{ color: '#ef4444' }}>Error</p>
              <p className="text-[12px] m-0 leading-relaxed" style={{ color: '#aaa' }}>
                {(shown as any).errorMessage}
              </p>
            </div>
          )}

          {/* Input */}
          {(shown as any)?.inputPayload && (shown as any).inputPayload !== '[redacted]' && (
            <div>
              <p className="text-[10px] font-mono tracking-widest uppercase mb-2" style={{ color: '#555' }}>Input</p>
              <pre className="rounded-xl p-3 text-[11px] font-mono overflow-x-auto leading-relaxed"
                style={{ background: '#080808', border: '1px solid rgba(255,255,255,.07)', color: '#ccc', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify((shown as any).inputPayload, null, 2)}
              </pre>
            </div>
          )}

          {/* Output */}
          {(shown as any)?.outputPayload && (shown as any).outputPayload !== '[redacted]' && (
            <div>
              <p className="text-[10px] font-mono tracking-widest uppercase mb-2" style={{ color: '#00d4a0' }}>Result</p>
              <pre className="rounded-xl p-3 text-[11px] font-mono overflow-x-auto leading-relaxed"
                style={{ background: '#080808', border: '1px solid rgba(0,212,160,.15)', color: '#00d4a0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify((shown as any).outputPayload, null, 2)}
              </pre>
            </div>
          )}

          {/* Settlement info */}
          <div className="flex flex-wrap gap-4">
            {[
              ['Agent earned', `${parseFloat(call.agentEarnedUsdc).toFixed(6)} USDC`],
              ['Platform fee', `${parseFloat(call.platformFeeUsdc).toFixed(6)} USDC`],
              ['Response',     call.responseMs ? `${call.responseMs}ms` : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] font-mono uppercase tracking-widest mb-0.5" style={{ color: '#444' }}>{k}</p>
                <p className="text-[12px] font-semibold m-0" style={{ color: '#888' }}>{v}</p>
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
        <main className="min-h-screen flex items-center justify-center" style={{ background: '#080808', fontFamily: FONT }}>
          <div className="text-center px-6">
            <div className="text-[40px] mb-4">🔐</div>
            <h2 className="text-[22px] font-black mb-2">Connect Your Wallet</h2>
            <p style={{ color: '#555', fontSize: 14 }}>Connect your wallet to see your call history.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen" style={{ background: '#080808', color: '#fff', fontFamily: FONT }}>

        {/* Header */}
        <div className="max-w-[900px] mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-4 flex flex-wrap items-end justify-between gap-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div>
            <a href="/dashboard" className="text-[13px] no-underline" style={{ color: '#555' }}>← Dashboard</a>
            <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight mt-2 mb-1">Call History</h1>
            <p className="text-[13px] m-0" style={{ color: '#555' }}>
              {data ? `${data.pagination.total} total calls` : 'All calls you've made or received'}
            </p>
          </div>
          <a href="/marketplace"
            className="text-[13px] font-bold text-white no-underline rounded-full px-5 py-2.5"
            style={{ background: '#f97316' }}>
            + Call an Agent
          </a>
        </div>

        {/* Content */}
        <div className="max-w-[900px] mx-auto px-0 sm:px-8 py-6 pb-20">

          {isLoading && (
            <div className="flex flex-col gap-2 px-4 sm:px-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl h-16 animate-pulse" style={{ background: '#101010' }} />
              ))}
            </div>
          )}

          {!isLoading && data?.calls.length === 0 && (
            <div className="text-center py-24 px-6">
              <div className="text-[48px] opacity-20 mb-4">📋</div>
              <h2 className="text-[18px] font-black mb-2">No calls yet</h2>
              <p className="text-[13px] mb-6" style={{ color: '#555' }}>
                Your call history will appear here after you call an agent.
              </p>
              <a href="/marketplace"
                className="text-[14px] font-bold text-white no-underline rounded-full px-7 py-3 inline-block"
                style={{ background: '#f97316' }}>
                Browse Agents
              </a>
            </div>
          )}

          {!isLoading && data && data.calls.length > 0 && (
            <>
              <div className="sm:rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,.07)', background: '#101010' }}>
                {data.calls.map(call => (
                  <CallRow key={call.id} call={call} />
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8 flex-wrap px-4">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="text-[13px] font-semibold px-5 py-2 rounded-full cursor-pointer disabled:opacity-30"
                    style={{ background: 'transparent', color: '#888', border: '1px solid rgba(255,255,255,.1)', fontFamily: FONT }}>
                    ← Prev
                  </button>
                  <span className="text-[13px]" style={{ color: '#555' }}>
                    Page {page} of {data.pagination.totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))} disabled={page === data.pagination.totalPages}
                    className="text-[13px] font-semibold px-5 py-2 rounded-full cursor-pointer disabled:opacity-30"
                    style={{ background: 'transparent', color: '#888', border: '1px solid rgba(255,255,255,.1)', fontFamily: FONT }}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useQuery }            from '@tanstack/react-query';
import { api, Agent, PlatformStats } from '../../lib/api';
import { AgentCard }           from '../../components/AgentCard';
import { CallModal }           from '../../components/CallModal';
import { Navbar }              from '../../components/Navbar';

const CATEGORIES = [
  { key: '',               label: 'All'            },
  { key: 'DEFI',           label: 'DeFi'           },
  { key: 'RISK',           label: 'Risk'           },
  { key: 'TRADING',        label: 'Trading'        },
  { key: 'INTELLIGENCE',   label: 'Intelligence'   },
  { key: 'PAYMENTS',       label: 'Payments'       },
  { key: 'INFRASTRUCTURE', label: 'Infra'          },
];

const SORT_OPTIONS = [
  { value: 'totalCalls',    label: 'Most Called'  },
  { value: 'totalRevenue',  label: 'Top Revenue'  },
  { value: 'pricePerCall',  label: 'Lowest Price' },
  { value: 'avgResponseMs', label: 'Fastest'      },
  { value: 'createdAt',     label: 'Newest'       },
];

const FONT = "'Figtree', sans-serif";

export default function MarketplacePage() {
  const [category, setCategory] = useState('');
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState('totalCalls');
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<Agent | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['agents', { category, search, sort, page }],
    queryFn:  () => api.listAgents({ category: category || undefined, search: search || undefined, sort, page, limit: 12 }),
    retry: 2,
  });

  const { data: stats } = useQuery<PlatformStats>({
    queryKey:  ['platform-stats'],
    queryFn:   api.getPlatformStats.bind(api),
    staleTime: 60_000,
    retry: 2,
  });

  useEffect(() => { setPage(1); }, [category, search, sort]);

  const isEmpty = !isLoading && !error && data?.agents.length === 0;

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: FONT }}>

        {/* ── HEADER ──────────────────────────────── */}
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-6 sm:pt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] sm:text-[32px] font-black tracking-tight text-white m-0">Marketplace</h1>
            <p className="text-[13px] sm:text-[14px] mt-1 m-0" style={{ color: '#555' }}>
              {stats
                ? `${stats.totalAgents} agents live · ${stats.totalCalls?.toLocaleString()} calls today`
                : 'Discover and call AI agents on XLayer'}
            </p>
          </div>
          <a href="/deploy"
            className="text-[13px] font-bold text-white no-underline rounded-full px-5 py-2.5 whitespace-nowrap"
            style={{ background: '#f97316' }}>
            + Deploy Agent
          </a>
        </div>

        {/* ── STATS STRIP ─────────────────────────── */}
        {stats && (
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 mt-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,.06)', background: '#101010' }}>
              {[
                { label: 'Agents Live',    value: stats.totalAgents,                                          color: '#f97316' },
                { label: 'Calls Today',    value: stats.totalCalls?.toLocaleString(),                         color: '#00d4a0' },
                { label: 'Volume Settled', value: `$${parseFloat(stats.totalVolumeUsdc || '0').toFixed(2)}`,  color: '#fff'    },
                { label: 'Avg Response',   value: `${stats.avgResponseMs || 0}ms`,                            color: '#fff'    },
              ].map((s, i) => (
                <div key={s.label} className="flex flex-col items-center justify-center py-4 px-3"
                  style={{ borderRight: (i % 2 === 0 || i < 2) ? '1px solid rgba(255,255,255,.06)' : 'none',
                           borderBottom: i < 2 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                  <div className="font-black text-[18px] sm:text-[22px] tracking-tight leading-none mb-1"
                    style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] sm:text-[11px] font-mono tracking-wide uppercase" style={{ color: '#444' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTERS ─────────────────────────────── */}
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 mt-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">

          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl px-4 h-10 flex-1 sm:flex-initial sm:min-w-[200px]"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,.1)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" className="flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents..."
              className="bg-transparent border-none outline-none text-white text-[13px] w-full"
              style={{ fontFamily: FONT }} />
          </div>

          {/* Category pills — scrollable on mobile */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-1 scrollbar-hide">
            {CATEGORIES.map(cat => {
              const active = category === cat.key;
              return (
                <button key={cat.key} onClick={() => setCategory(cat.key)}
                  className="text-[12px] px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer flex-shrink-0 transition-all"
                  style={{
                    border: `1px solid ${active ? 'rgba(249,115,22,.4)' : 'rgba(255,255,255,.08)'}`,
                    background: active ? 'rgba(249,115,22,.18)' : 'rgba(255,255,255,.04)',
                    color:      active ? '#f97316' : '#777',
                    fontWeight: active ? 700 : 500,
                    fontFamily: FONT,
                  }}>
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="rounded-xl px-4 h-10 text-[13px] cursor-pointer outline-none flex-shrink-0"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,.1)', color: '#888', fontFamily: FONT }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* ── CONTENT ─────────────────────────────── */}
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-6 pb-20">

          {/* Loading skeletons */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-5 min-h-[200px]"
                  style={{ background: '#101010', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div className="h-3 rounded mb-4 w-2/5" style={{ background: 'rgba(255,255,255,.05)' }} />
                  <div className="h-5 rounded mb-3 w-3/4" style={{ background: 'rgba(255,255,255,.05)' }} />
                  <div className="h-3 rounded mb-2 w-3/5" style={{ background: 'rgba(255,255,255,.05)' }} />
                  <div className="h-3 rounded w-1/2"       style={{ background: 'rgba(255,255,255,.05)' }} />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="flex flex-col items-center py-20 text-center gap-3">
              <div className="text-[40px] mb-1">⚡</div>
              <div className="text-[18px] font-black tracking-tight">Backend error</div>
              <div className="text-[13px] max-w-[420px] leading-relaxed" style={{ color: '#666' }}>
                The API returned an error. Check the Railway logs for a database connection issue.
              </div>
              {(error as any)?.response?.data?.detail && (
                <code className="text-[11px] rounded-xl px-4 py-2 max-w-[480px] text-left break-all"
                  style={{ color: '#ef4444', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)' }}>
                  {(error as any).response.data.detail}
                </code>
              )}
              <button onClick={() => refetch()}
                className="mt-2 text-[13px] font-bold text-white px-6 py-2.5 rounded-full cursor-pointer"
                style={{ background: '#f97316', border: 'none', fontFamily: FONT }}>
                Try Again
              </button>
            </div>
          )}

          {/* Empty */}
          {isEmpty && (
            <div className="flex flex-col items-center py-24 text-center gap-3">
              <div className="text-[48px] opacity-20 mb-2">🤖</div>
              <div className="text-[18px] font-black tracking-tight">
                {search || category ? 'No agents match your filters' : 'No agents deployed yet'}
              </div>
              <div className="text-[13px] max-w-[360px] leading-relaxed" style={{ color: '#555' }}>
                {search || category
                  ? 'Try clearing your search or selecting a different category.'
                  : 'Be the first builder to deploy an AI agent and start earning USDC per call.'}
              </div>
              {!search && !category && (
                <a href="/deploy" className="mt-3 text-[14px] font-bold text-white no-underline rounded-full px-7 py-3"
                  style={{ background: '#f97316' }}>
                  Deploy the First Agent
                </a>
              )}
              {(search || category) && (
                <button onClick={() => { setSearch(''); setCategory(''); }}
                  className="mt-2 text-[13px] font-semibold px-6 py-2.5 rounded-full cursor-pointer"
                  style={{ background: 'transparent', color: '#666', border: '1px solid rgba(255,255,255,.1)', fontFamily: FONT }}>
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Agent grid */}
          {!isLoading && !error && data && data.agents.length > 0 && (
            <>
              <p className="text-[12px] font-mono mb-4" style={{ color: '#444' }}>
                {data.pagination.total} {data.pagination.total === 1 ? 'agent' : 'agents'}
                {search && ` matching "${search}"`}
                {category && ` in ${CATEGORIES.find(c => c.key === category)?.label}`}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.agents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} onCall={() => setSelected(agent)} />
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12 flex-wrap">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="text-[13px] font-semibold px-5 py-2 rounded-full cursor-pointer disabled:opacity-30"
                    style={{ background: 'transparent', color: '#888', border: '1px solid rgba(255,255,255,.1)', fontFamily: FONT }}>
                    ← Prev
                  </button>
                  {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === data.pagination.totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p} className="flex items-center gap-1">
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: '#333' }}>…</span>}
                        <button onClick={() => setPage(p)}
                          className="w-9 h-9 rounded-full text-[13px] font-semibold cursor-pointer border-none transition-all"
                          style={{ background: p === page ? '#f97316' : 'transparent', color: p === page ? '#fff' : '#666', fontFamily: FONT }}>
                          {p}
                        </button>
                      </span>
                    ))}
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

        {selected && <CallModal agent={selected} onClose={() => setSelected(null)} />}
      </main>
    </>
  );
}

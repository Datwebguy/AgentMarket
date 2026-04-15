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
  { key: 'INFRASTRUCTURE', label: 'Infrastructure' },
];

const SORT_OPTIONS = [
  { value: 'totalCalls',    label: 'Most Called'  },
  { value: 'totalRevenue',  label: 'Top Revenue'  },
  { value: 'pricePerCall',  label: 'Lowest Price' },
  { value: 'avgResponseMs', label: 'Fastest'      },
  { value: 'createdAt',     label: 'Newest'       },
];

export default function MarketplacePage() {
  const [category, setCategory] = useState('');
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState('totalCalls');
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<Agent | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['agents', { category, search, sort, page }],
    queryFn:  () => api.listAgents({
      category: category || undefined,
      search:   search   || undefined,
      sort,
      page,
      limit: 12,
    }),
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
      <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'Figtree', sans-serif" }}>

        {/* PAGE HEADER */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: 32, letterSpacing: '-1px', color: '#fff', margin: 0 }}>Marketplace</h1>
            <p style={{ fontSize: 14, color: '#555', fontWeight: 400, margin: '4px 0 0' }}>
              {stats
                ? `${stats.totalAgents} agents live · ${stats.totalCalls?.toLocaleString()} calls today`
                : 'Discover and call AI agents on XLayer'}
            </p>
          </div>
          <a href="/deploy" style={{ background: '#7c5cfc', color: '#fff', borderRadius: 999, padding: '10px 22px', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            + Deploy Agent
          </a>
        </div>

        {/* STATS STRIP */}
        {stats && (
          <div style={{ maxWidth: 1200, margin: '24px auto 0', padding: '0 32px' }}>
            <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, background: '#101010', overflow: 'hidden' }}>
              {[
                { label: 'Agents Live',    value: stats.totalAgents,                                         color: '#7c5cfc' },
                { label: 'Calls Today',    value: stats.totalCalls?.toLocaleString(),                        color: '#00d4a0' },
                { label: 'Volume Settled', value: `$${parseFloat(stats.totalVolumeUsdc || '0').toFixed(2)}`, color: '#fff'    },
                { label: 'Avg Response',   value: `${stats.avgResponseMs || 0}ms`,                           color: '#fff'    },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ flex: 1, padding: '16px 24px', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none', textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-1px', lineHeight: 1, marginBottom: 4, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', letterSpacing: '.5px', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FILTERS */}
        <div style={{ maxWidth: 1200, margin: '24px auto 0', padding: '0 32px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '0 14px', minWidth: 220, height: 38 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents..."
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontFamily: "'Figtree', sans-serif", fontSize: 13, width: '100%' }}
            />
          </div>

          {/* Category pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {CATEGORIES.map(cat => {
              const active = category === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  style={{
                    fontSize: 12, padding: '6px 14px', borderRadius: 999,
                    border: `1px solid ${active ? 'rgba(124,92,252,.4)' : 'rgba(255,255,255,.08)'}`,
                    background: active ? 'rgba(124,92,252,.18)' : 'rgba(255,255,255,.04)',
                    color: active ? '#7c5cfc' : '#777',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    transition: 'all .15s',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{ background: '#111', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '0 14px', color: '#888', fontFamily: "'Figtree', sans-serif", fontSize: 13, outline: 'none', cursor: 'pointer', height: 38, marginLeft: 'auto' }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* CONTENT */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px 80px' }}>

          {/* Loading skeletons */}
          {isLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: '#101010', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, padding: 22, minHeight: 200 }}>
                  <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 6, height: 14, width: '40%', marginBottom: 14 }} />
                  <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 6, height: 20, width: '75%', marginBottom: 10 }} />
                  <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 6, height: 14, width: '60%', marginBottom: 8 }} />
                  <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 6, height: 14, width: '50%' }} />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px', textAlign: 'center', gap: 12 }}>
              <div style={{ fontSize: 44, marginBottom: 4 }}>⚡</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-.5px' }}>API not connected</div>
              <div style={{ fontSize: 14, color: '#666', maxWidth: 480, lineHeight: 1.8, fontWeight: 400 }}>
                Your frontend cannot reach the backend. Go to your Vercel dashboard, open Environment Variables, and make sure{' '}
                <code style={{ background: 'rgba(255,255,255,.08)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, color: '#7c5cfc' }}>
                  NEXT_PUBLIC_API_URL
                </code>{' '}
                is set to your live Railway backend URL ending in{' '}
                <code style={{ background: 'rgba(255,255,255,.08)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, color: '#00d4a0' }}>/api/v1</code>.
                Then redeploy.
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => refetch()}
                  style={{ background: '#7c5cfc', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 24px', textAlign: 'center', gap: 12 }}>
              <div style={{ fontSize: 56, opacity: .25, marginBottom: 8 }}>🤖</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-.5px' }}>
                {search || category ? 'No agents match your filters' : 'No agents deployed yet'}
              </div>
              <div style={{ fontSize: 14, color: '#555', maxWidth: 420, lineHeight: 1.8, fontWeight: 400 }}>
                {search || category
                  ? 'Try clearing your search or selecting a different category.'
                  : 'Be the first builder to deploy an AI agent on AgentMarket and start earning USDC per call via x402.'}
              </div>
              {!search && !category && (
                <a href="/deploy" style={{ marginTop: 12, background: '#7c5cfc', color: '#fff', borderRadius: 999, padding: '13px 28px', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block', fontFamily: 'inherit' }}>
                  Deploy the First Agent
                </a>
              )}
              {(search || category) && (
                <button
                  onClick={() => { setSearch(''); setCategory(''); }}
                  style={{ marginTop: 8, background: 'transparent', color: '#666', border: '1px solid rgba(255,255,255,.1)', borderRadius: 999, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Agent grid */}
          {!isLoading && !error && data && data.agents.length > 0 && (
            <>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#444', fontFamily: 'monospace' }}>
                  {data.pagination.total} {data.pagination.total === 1 ? 'agent' : 'agents'}
                  {search && ` matching "${search}"`}
                  {category && ` in ${CATEGORIES.find(c => c.key === category)?.label}`}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {data.agents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} onCall={() => setSelected(agent)} />
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 48 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ background: 'transparent', color: '#888', border: '1px solid rgba(255,255,255,.1)', borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: page === 1 ? .3 : 1 }}
                  >
                    &larr; Previous
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === data.pagination.totalPages || Math.abs(p - page) <= 1)
                      .map((p, idx, arr) => (
                        <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: '#333', padding: '0 2px' }}>...</span>}
                          <button
                            onClick={() => setPage(p)}
                            style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: p === page ? '#7c5cfc' : 'transparent', color: p === page ? '#fff' : '#666', transition: 'all .15s' }}
                          >
                            {p}
                          </button>
                        </span>
                      ))}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page === data.pagination.totalPages}
                    style={{ background: 'transparent', color: '#888', border: '1px solid rgba(255,255,255,.1)', borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: page === data.pagination.totalPages ? .3 : 1 }}
                  >
                    Next &rarr;
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

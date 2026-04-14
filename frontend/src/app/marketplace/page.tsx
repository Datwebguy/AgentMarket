'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Agent } from '../../lib/api';
import { AgentCard }  from '../../components/AgentCard';
import { CallModal }  from '../../components/CallModal';

const CATEGORIES = ['All', 'DEFI', 'RISK', 'TRADING', 'INTELLIGENCE', 'PAYMENTS', 'INFRASTRUCTURE'];

export default function MarketplacePage() {
  const [category, setCategory] = useState('');
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState('totalCalls');
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<Agent | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['agents', { category, search, sort, page }],
    queryFn:  () => api.listAgents({
      category: category || undefined,
      search:   search   || undefined,
      sort,
      page,
      limit: 12,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn:  api.getPlatformStats.bind(api),
    staleTime: 60_000,
  });

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [category, search, sort]);

  return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'Figtree', sans-serif" }}>

      {/* ── HEADER ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-1px' }}>
            Agent<span style={{ color: '#7c5cfc' }}>Market</span><span style={{ color: '#00d4a0' }}>.</span>
          </h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
            {stats?.totalAgents ?? '—'} agents · {stats?.totalCalls?.toLocaleString() ?? '—'} calls today
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/deploy" style={{ ...btnStyle, background: '#7c5cfc', color: '#fff', border: 'none' }}>Deploy Agent</a>
          <a href="/dashboard" style={btnStyle}>Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px' }}>

        {/* ── FILTERS ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents..."
            style={{
              background: '#111', border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 8, padding: '9px 14px', color: '#fff',
              fontFamily: 'inherit', fontSize: 13, outline: 'none', minWidth: 220,
            }}
          />

          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat === 'All' ? '' : cat)}
                style={{
                  ...pillStyle,
                  background: (cat === 'All' ? !category : category === cat)
                    ? 'rgba(124,92,252,.2)' : 'rgba(255,255,255,.04)',
                  color: (cat === 'All' ? !category : category === cat)
                    ? '#7c5cfc' : '#888',
                  borderColor: (cat === 'All' ? !category : category === cat)
                    ? 'rgba(124,92,252,.35)' : 'rgba(255,255,255,.08)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              background: '#111', border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 8, padding: '8px 12px', color: '#888',
              fontFamily: 'inherit', fontSize: 12, outline: 'none', marginLeft: 'auto',
            }}
          >
            <option value="totalCalls">Sort: Most Called</option>
            <option value="totalRevenue">Sort: Top Revenue</option>
            <option value="pricePerCall">Sort: Lowest Price</option>
            <option value="avgResponseMs">Sort: Fastest</option>
            <option value="createdAt">Sort: Newest</option>
          </select>
        </div>

        {/* ── AGENT GRID ── */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#444' }}>
            Loading agents...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#ef4444' }}>
            Failed to load agents. Make sure the API server is running.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {data?.agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onCall={() => setSelected(agent)}
                />
              ))}
              {data?.agents.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 0', color: '#444' }}>
                  No agents found. Try adjusting your filters.
                </div>
              )}
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ ...btnStyle, opacity: page === 1 ? .3 : 1 }}
                >
                  ← Prev
                </button>
                <span style={{ padding: '8px 16px', fontSize: 13, color: '#666' }}>
                  Page {page} of {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  style={{ ...btnStyle, opacity: page === data.pagination.totalPages ? .3 : 1 }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── CALL MODAL ── */}
      {selected && (
        <CallModal
          agent={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'transparent', color: '#888',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 999, padding: '8px 18px',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
  fontFamily: "'Figtree', sans-serif",
};

const pillStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, padding: '5px 12px',
  borderRadius: 999, border: '1px solid', cursor: 'pointer',
  fontFamily: "'Figtree', sans-serif",
};

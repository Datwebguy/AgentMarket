'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { useQuery }   from '@tanstack/react-query';
import { api, Agent, PlatformStats } from '../../lib/api';
import { CallModal }  from '../../components/CallModal';
import { Navbar }     from '../../components/Navbar';

/* ─── constants ─────────────────────────────────────────────────── */
const FONT = "'Figtree', sans-serif";

const CATEGORIES = [
  { key: '',               label: 'All'          },
  { key: 'DEFI',           label: 'DeFi'         },
  { key: 'RISK',           label: 'Risk'         },
  { key: 'TRADING',        label: 'Trading'      },
  { key: 'INTELLIGENCE',   label: 'Intelligence' },
  { key: 'PAYMENTS',       label: 'Payments'     },
  { key: 'INFRASTRUCTURE', label: 'Infra'        },
];

const SORT_OPTIONS = [
  { value: 'totalCalls',    label: 'Most Called'  },
  { value: 'totalRevenue',  label: 'Top Revenue'  },
  { value: 'pricePerCall',  label: 'Lowest Price' },
  { value: 'avgResponseMs', label: 'Fastest'      },
  { value: 'createdAt',     label: 'Newest'       },
];

const CAT_COLOR: Record<string, string> = {
  DEFI: '#60a5fa', RISK: '#f87171', TRADING: '#34d399',
  INTELLIGENCE: '#f97316', PAYMENTS: '#a78bfa',
  INFRASTRUCTURE: '#94a3b8', OTHER: '#6b7280',
};

/* ─── AgentCard ─────────────────────────────────────────────────── */
function AgentCard({ agent, onCall }: { agent: Agent; onCall: () => void }) {
  const [hover, setHover] = useState(false);
  const cat = agent.category || 'OTHER';
  const catColor = CAT_COLOR[cat] || '#888';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   '#101010',
        border:       `1px solid ${hover ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '16px',
        padding:      '20px',
        display:      'flex',
        flexDirection:'column',
        gap:          '12px',
        fontFamily:   FONT,
        transition:   'border-color 0.2s',
        cursor:       'default',
      }}
    >
      {/* Top row: icon + badges */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
          background: 'rgba(249,115,22,0.1)',
          border: '1px solid rgba(249,115,22,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
        }}>
          🤖
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '3px 8px',
            borderRadius: '999px', background: `${catColor}18`, color: catColor,
            border: `1px solid ${catColor}33`, whiteSpace: 'nowrap',
          }}>
            {cat}
          </span>
          {agent.isVerified && (
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '3px 8px',
              borderRadius: '999px', background: 'rgba(0,212,160,0.1)',
              color: '#00d4a0', border: '1px solid rgba(0,212,160,0.25)',
              whiteSpace: 'nowrap',
            }}>
              ✓ VERIFIED
            </span>
          )}
        </div>
      </div>

      {/* Name + description */}
      <div>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
          {agent.name}
        </h3>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {agent.description}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '20px' }}>
        {[
          { label: 'Calls',        value: Number(agent.totalCalls || 0).toLocaleString() },
          { label: 'Avg Response', value: agent.avgResponseMs ? `${agent.avgResponseMs}ms` : '—'   },
          { label: 'Uptime',       value: `${parseFloat(String(agent.uptimePct || 100)).toFixed(1)}%` },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '1px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Price + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Per Call</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#00d4a0', marginTop: '1px' }}>
            {parseFloat(String(agent.pricePerCallUsdc)).toFixed(4)} <span style={{ fontSize: '12px', fontWeight: 600 }}>USDC</span>
          </div>
        </div>
        <button onClick={onCall} style={{
          padding:      '10px 22px',
          borderRadius: '999px',
          background:   '#f97316',
          border:       'none',
          color:        '#fff',
          fontSize:     '13px',
          fontWeight:   700,
          cursor:       'pointer',
          whiteSpace:   'nowrap',
          fontFamily:   FONT,
        }}>
          Call Agent
        </button>
      </div>
    </div>
  );
}

/* ─── Skeleton card ─────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      background: '#101010', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ height: 8, width: '60%', borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ height: 8, width: '40%', borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>
      <div style={{ height: 10, width: '80%', borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ height: 10, width: '60%', borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
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

  /* shared styles */
  const container: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '0 20px' };

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: FONT }}>

        {/* ── HEADER ───────────────────────────────────────────── */}
        <div style={{ ...container, paddingTop: '32px', paddingBottom: '0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900, letterSpacing: '-1px', color: '#fff' }}>
                Marketplace
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#555' }}>
                {stats
                  ? `${stats.totalAgents} agent${stats.totalAgents === 1 ? '' : 's'} live · ${Number(stats.totalCalls || 0).toLocaleString()} calls today`
                  : 'Discover and call AI agents on XLayer'}
              </p>
            </div>
            <a href="/deploy" style={{
              padding:        '10px 22px',
              borderRadius:   '999px',
              background:     '#f97316',
              color:          '#fff',
              fontSize:       '13px',
              fontWeight:     700,
              textDecoration: 'none',
              whiteSpace:     'nowrap',
              flexShrink:     0,
            }}>
              + Deploy Agent
            </a>
          </div>
        </div>

        {/* ── STATS STRIP ──────────────────────────────────────── */}
        {stats && (
          <div style={{ ...container, paddingTop: '20px' }}>
            <div className="stats-grid" style={{
              display:         'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              border:          '1px solid rgba(255,255,255,0.07)',
              borderRadius:    '14px',
              background:      '#101010',
              overflow:        'hidden',
            }}>
              {[
                { label: 'Agents Live',    value: stats.totalAgents,                                         color: '#f97316' },
                { label: 'Calls Today',    value: Number(stats.totalCalls || 0).toLocaleString(),             color: '#00d4a0' },
                { label: 'Volume Settled', value: `$${parseFloat(String(stats.totalVolumeUsdc || 0)).toFixed(2)}`, color: '#fff' },
                { label: 'Avg Response',   value: `${stats.avgResponseMs || 0}ms`,                           color: '#fff'    },
              ].map((s, i) => (
                <div key={s.label} style={{
                  padding:     '18px 16px',
                  textAlign:   'center',
                  borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                }}>
                  <div style={{ fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: 900, color: s.color, lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: '10px', color: '#555', marginTop: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTERS ──────────────────────────────────────────── */}
        <div style={{ ...container, paddingTop: '20px' }}>
          {/* Row 1: search */}
          <div style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '8px',
            padding:     '0 14px',
            height:      '42px',
            borderRadius:'12px',
            border:      '1px solid rgba(255,255,255,0.1)',
            background:  '#111',
            marginBottom:'12px',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents..."
              style={{
                flex:       1,
                background: 'transparent',
                border:     'none',
                outline:    'none',
                color:      '#fff',
                fontSize:   '13px',
                fontFamily: FONT,
              }}
            />
          </div>

          {/* Row 2: pills + sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Pills — scrollable, takes remaining space */}
            <div style={{
              display:    'flex',
              gap:        '6px',
              overflowX:  'auto',
              flex:       '1 1 0',
              minWidth:   0,
              paddingBottom: '2px',
              scrollbarWidth: 'none',
            }}>
              {CATEGORIES.map(cat => {
                const active = category === cat.key;
                return (
                  <button key={cat.key} onClick={() => setCategory(cat.key)} style={{
                    padding:      '6px 14px',
                    borderRadius: '999px',
                    border:       `1px solid ${active ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    background:   active ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                    color:        active ? '#f97316' : '#777',
                    fontSize:     '12px',
                    fontWeight:   active ? 700 : 500,
                    cursor:       'pointer',
                    whiteSpace:   'nowrap',
                    flexShrink:   0,
                    fontFamily:   FONT,
                  }}>
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Sort — never shrinks */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{
                height:       '38px',
                padding:      '0 12px',
                borderRadius: '10px',
                border:       '1px solid rgba(255,255,255,0.1)',
                background:   '#111',
                color:        '#888',
                fontSize:     '13px',
                cursor:       'pointer',
                outline:      'none',
                flexShrink:   0,
                fontFamily:   FONT,
              }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── CONTENT ──────────────────────────────────────────── */}
        <div style={{ ...container, paddingTop: '24px', paddingBottom: '80px' }}>

          {/* Loading */}
          {isLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
              <div style={{ fontSize: '18px', fontWeight: 900 }}>Failed to load agents</div>
              <div style={{ fontSize: '13px', color: '#555', marginTop: '8px', marginBottom: '24px' }}>
                Check your connection or try again.
              </div>
              <button onClick={() => refetch()} style={{
                padding: '10px 24px', borderRadius: '999px', background: '#f97316',
                border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: FONT,
              }}>
                Try Again
              </button>
            </div>
          )}

          {/* Empty */}
          {isEmpty && (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: '48px', opacity: 0.2, marginBottom: '16px' }}>🤖</div>
              <div style={{ fontSize: '18px', fontWeight: 900 }}>
                {search || category ? 'No agents match your filters' : 'No agents deployed yet'}
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginTop: '8px', marginBottom: '24px', maxWidth: '360px', margin: '8px auto 24px' }}>
                {search || category
                  ? 'Try clearing your search or selecting a different category.'
                  : 'Be the first builder to deploy an AI agent and start earning USDC per call.'}
              </div>
              {(search || category) ? (
                <button onClick={() => { setSearch(''); setCategory(''); }} style={{
                  padding: '10px 24px', borderRadius: '999px', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#666', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
                }}>
                  Clear Filters
                </button>
              ) : (
                <a href="/deploy" style={{
                  display: 'inline-block', padding: '12px 28px', borderRadius: '999px',
                  background: '#f97316', color: '#fff', fontSize: '14px', fontWeight: 700,
                  textDecoration: 'none',
                }}>
                  Deploy the First Agent
                </a>
              )}
            </div>
          )}

          {/* Agent grid */}
          {!isLoading && !error && data && data.agents.length > 0 && (
            <>
              <p style={{ fontSize: '12px', color: '#444', marginBottom: '16px', fontFamily: 'monospace' }}>
                {data.pagination.total} {data.pagination.total === 1 ? 'agent' : 'agents'}
                {search && ` matching "${search}"`}
                {category && ` in ${CATEGORIES.find(c => c.key === category)?.label}`}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {data.agents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} onCall={() => setSelected(agent)} />
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '48px', flexWrap: 'wrap' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
                    padding: '8px 20px', borderRadius: '999px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', color: '#888', fontSize: '13px',
                    fontWeight: 600, cursor: 'pointer', opacity: page === 1 ? 0.3 : 1, fontFamily: FONT,
                  }}>
                    ← Prev
                  </button>
                  <span style={{ fontSize: '13px', color: '#555' }}>
                    Page {page} of {data.pagination.totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))} disabled={page === data.pagination.totalPages} style={{
                    padding: '8px 20px', borderRadius: '999px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', color: '#888', fontSize: '13px',
                    fontWeight: 600, cursor: 'pointer', opacity: page === data.pagination.totalPages ? 0.3 : 1, fontFamily: FONT,
                  }}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {selected && <CallModal agent={selected} onClose={() => setSelected(null)} />}
      </main>

      {/* Mobile responsive overrides */}
      <style>{`
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .stats-grid > div { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07); }
          .stats-grid > div:nth-child(even) { border-right: none !important; }
          .stats-grid > div:nth-child(odd)  { border-right: 1px solid rgba(255,255,255,0.07) !important; }
        }
      `}</style>
    </>
  );
}

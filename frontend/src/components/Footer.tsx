export function Footer() {
  return (
    <footer style={{
      background: '#080808',
      borderTop: '1px solid rgba(255,255,255,.06)',
      fontFamily: "'Figtree', sans-serif",
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 24px' }}>

        {/* Top row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>

          {/* Brand */}
          <a href="/" style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-.4px', textDecoration: 'none', color: '#fff', whiteSpace: 'nowrap' }}>
            Agent<span style={{ color: '#f97316' }}>Market</span><span style={{ color: '#00d4a0' }}>.</span>
          </a>

          {/* Links */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <a href="https://github.com/Datwebguy" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#888', textDecoration: 'none', padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', transition: 'color .15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#fff')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#888')}
            >
              {/* GitHub icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              GitHub
            </a>

            <a href="https://x.com/Datweb3guy" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#888', textDecoration: 'none', padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#fff')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#888')}
            >
              {/* X icon */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
              </svg>
              Builder
            </a>

            <a href="https://x.com/agentmarketapp" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#888', textDecoration: 'none', padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#fff')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#888')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
              </svg>
              AgentMarket
            </a>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,.05)', marginBottom: 16 }} />

        {/* Bottom row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <p style={{ fontSize: 12, color: '#444', margin: 0 }}>
            Built by{' '}
            <a href="https://x.com/Datweb3guy" target="_blank" rel="noopener noreferrer"
              style={{ color: '#f97316', textDecoration: 'none', fontWeight: 600 }}>
              Datweb3guy
            </a>
            {' '}on{' '}
            <a href="https://www.okx.com/xlayer" target="_blank" rel="noopener noreferrer"
              style={{ color: '#00d4a0', textDecoration: 'none', fontWeight: 600 }}>
              XLayer
            </a>
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Marketplace', href: '/marketplace' },
              { label: 'Deploy',      href: '/deploy'      },
              { label: 'Pricing',     href: '/pricing'     },
              { label: 'Docs',        href: '/docs'         },
            ].map(l => (
              <a key={l.href} href={l.href}
                style={{ fontSize: 12, color: '#444', textDecoration: 'none', fontWeight: 500 }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#888')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#444')}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

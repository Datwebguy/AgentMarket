'use client';

import { useAccount, useConnect, useDisconnect, useSignMessage, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { SiweMessage } from 'siwe';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../hooks/useAuthStore';
import { switchToXLayer } from '../lib/switchToXLayer';

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_X_LAYER_CHAIN_ID || '196');

const NAV_LINKS = [
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Calls',       href: '/calls'       },
  { label: 'Pricing',     href: '/pricing'     },
  { label: 'Docs',        href: '/docs'        },
  { label: 'Deploy',      href: '/deploy'      },
];

export function Navbar() {
  const { address, isConnected, chain } = useAccount();
  const { connectAsync }     = useConnect();
  const { disconnect }       = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const { token, user, login, logout } = useAuthStore();

  const [signing,     setSigning]     = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => {
    if (token && !user) {
      api.getMe().then(u => login(token, u)).catch(() => logout());
    }
  }, [token]);

  async function handleConnect() {
    try {
      setSigning(true);
      setMobileOpen(false);
      try { await switchToXLayer(); } catch { /* ignore */ }
      const result       = await connectAsync({ connector: injected(), chainId: CHAIN_ID });
      const walletAddress = result.accounts[0];
      const nonce        = await api.getNonce();
      const message      = new SiweMessage({
        domain:    window.location.host,
        address:   walletAddress,
        statement: 'Sign in to AgentMarket. This will not trigger a blockchain transaction or cost gas.',
        uri:       window.location.origin,
        version:   '1',
        chainId:   CHAIN_ID,
        nonce,
      });
      const messageStr = message.prepareMessage();
      const signature  = await signMessageAsync({ account: walletAddress as `0x${string}`, message: messageStr });
      const { token: jwt, user: u } = await api.verifySiwe(messageStr, signature);
      login(jwt, u);
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setSigning(false);
    }
  }

  function handleDisconnect() {
    disconnect();
    logout();
    setMenuOpen(false);
    setMobileOpen(false);
  }

  const shortAddr  = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
  const wrongChain = isConnected && chain?.id !== CHAIN_ID;

  return (
    <>
      {/* ── NAV BAR ──────────────────────────────────────────────── */}
      <nav style={{
        position:         'sticky',
        top:              0,
        zIndex:           50,
        background:       'rgba(8,8,8,0.96)',
        borderBottom:     '1px solid rgba(255,255,255,0.07)',
        backdropFilter:   'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        fontFamily:       "'Figtree', sans-serif",
      }}>
        {/* Single row — never wraps */}
        <div style={{
          maxWidth:       '1200px',
          margin:         '0 auto',
          padding:        '0 16px',
          height:         '56px',
          display:        'flex',
          alignItems:     'center',
          gap:            '8px',
          flexWrap:       'nowrap',
        }}>

          {/* Logo — shrinks to 0, never grows */}
          <a href="/" style={{
            fontWeight:   900,
            fontSize:     '17px',
            letterSpacing: '-0.5px',
            color:        '#fff',
            textDecoration: 'none',
            whiteSpace:   'nowrap',
            flexShrink:   0,
            marginRight:  '8px',
          }}>
            Agent<span style={{ color: '#f97316' }}>Market</span><span style={{ color: '#00d4a0' }}>.</span>
          </a>

          {/* Desktop nav links — fills available space */}
          <div style={{
            display:    'flex',
            gap:        '2px',
            flex:       '1 1 auto',
            minWidth:   0,
          }} className="hide-on-mobile">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} style={{
                fontSize:       '13px',
                fontWeight:     500,
                color:          '#888',
                padding:        '6px 12px',
                borderRadius:   '8px',
                textDecoration: 'none',
                whiteSpace:     'nowrap',
                flexShrink:     0,
                transition:     'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#888')}>
                {l.label}
              </a>
            ))}
          </div>

          {/* Spacer on mobile only */}
          <div style={{ flex: '1 1 auto' }} className="show-on-mobile-only" />

          {/* Wrong chain warning — desktop */}
          {wrongChain && (
            <button onClick={() => switchToXLayer().catch(() => {})}
              className="hide-on-mobile"
              style={{
                fontSize:     '11px',
                fontWeight:   700,
                padding:      '5px 12px',
                borderRadius: '999px',
                border:       '1px solid rgba(249,115,22,0.3)',
                background:   'rgba(249,115,22,0.12)',
                color:        '#f97316',
                cursor:       'pointer',
                flexShrink:   0,
                whiteSpace:   'nowrap',
                fontFamily:   'inherit',
              }}>
              Switch to XLayer
            </button>
          )}

          {/* Wallet button — desktop */}
          <div style={{ flexShrink: 0 }} className="hide-on-mobile">
            {!isConnected ? (
              <button onClick={handleConnect} disabled={signing} style={{
                fontSize:     '13px',
                fontWeight:   700,
                padding:      '8px 18px',
                borderRadius: '999px',
                border:       'none',
                background:   '#f97316',
                color:        '#fff',
                cursor:       'pointer',
                whiteSpace:   'nowrap',
                fontFamily:   'inherit',
                opacity:      signing ? 0.6 : 1,
              }}>
                {signing ? 'Signing…' : 'Connect Wallet'}
              </button>
            ) : (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setMenuOpen(m => !m)} style={{
                  fontSize:     '12px',
                  fontWeight:   600,
                  padding:      '6px 14px',
                  borderRadius: '999px',
                  border:       '1px solid rgba(255,255,255,0.12)',
                  background:   '#111',
                  color:        '#fff',
                  cursor:       'pointer',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '8px',
                  whiteSpace:   'nowrap',
                  fontFamily:   'inherit',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4a0', flexShrink: 0, display: 'inline-block' }} />
                  {shortAddr}
                </button>

                {menuOpen && (
                  <div style={{
                    position:   'absolute',
                    top:        'calc(100% + 6px)',
                    right:      0,
                    background: '#111',
                    border:     '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding:    '6px',
                    minWidth:   '180px',
                    zIndex:     300,
                    boxShadow:  '0 8px 32px rgba(0,0,0,0.6)',
                  }}>
                    {[
                      { label: 'Dashboard',    href: '/dashboard' },
                      { label: 'My Calls',     href: '/calls'     },
                      { label: 'Deploy Agent', href: '/deploy'    },
                    ].map(item => (
                      <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
                        display:        'block',
                        padding:        '8px 12px',
                        borderRadius:   '8px',
                        fontSize:       '13px',
                        fontWeight:     500,
                        color:          '#ccc',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {item.label}
                      </a>
                    ))}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                    <button onClick={handleDisconnect} style={{
                      width:        '100%',
                      display:      'block',
                      padding:      '8px 12px',
                      borderRadius: '8px',
                      fontSize:     '13px',
                      fontWeight:   500,
                      color:        '#ef4444',
                      background:   'transparent',
                      border:       'none',
                      cursor:       'pointer',
                      textAlign:    'left',
                      fontFamily:   'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="show-on-mobile-only"
            style={{
              display:      'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems:   'center',
              gap:          '5px',
              padding:      '8px',
              borderRadius: '8px',
              background:   'transparent',
              border:       'none',
              cursor:       'pointer',
              flexShrink:   0,
            }}
            aria-label="Toggle menu">
            <span style={{
              display:    'block', width: 20, height: 2,
              background: '#fff', borderRadius: 2,
              transition: 'transform 0.2s',
              transform:  mobileOpen ? 'rotate(45deg) translate(0,7px)' : 'none',
            }} />
            <span style={{
              display:    'block', width: 20, height: 2,
              background: '#fff', borderRadius: 2,
              transition: 'opacity 0.2s',
              opacity:    mobileOpen ? 0 : 1,
            }} />
            <span style={{
              display:    'block', width: 20, height: 2,
              background: '#fff', borderRadius: 2,
              transition: 'transform 0.2s',
              transform:  mobileOpen ? 'rotate(-45deg) translate(0,-7px)' : 'none',
            }} />
          </button>
        </div>
      </nav>

      {/* ── MOBILE DRAWER ───────────────────────────────────────── */}
      {mobileOpen && (
        <div style={{
          position:      'fixed',
          top:           '56px',
          left:          0,
          right:         0,
          zIndex:        40,
          background:    '#0e0e0e',
          borderBottom:  '1px solid rgba(255,255,255,0.08)',
          boxShadow:     '0 12px 40px rgba(0,0,0,0.8)',
          fontFamily:    "'Figtree', sans-serif",
        }} className="show-on-mobile-only">

          {/* Nav links */}
          {NAV_LINKS.map((l, i) => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} style={{
              display:        'block',
              padding:        '16px 20px',
              fontSize:       '15px',
              fontWeight:     600,
              color:          '#ccc',
              textDecoration: 'none',
              borderBottom:   i < NAV_LINKS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              {l.label}
            </a>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 16px' }} />

          {/* Wallet area */}
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {wrongChain && (
              <button onClick={() => { switchToXLayer().catch(() => {}); setMobileOpen(false); }} style={{
                width:        '100%',
                padding:      '12px',
                borderRadius: '12px',
                fontSize:     '14px',
                fontWeight:   700,
                background:   'rgba(249,115,22,0.12)',
                color:        '#f97316',
                border:       '1px solid rgba(249,115,22,0.25)',
                cursor:       'pointer',
                fontFamily:   'inherit',
              }}>
                Switch to XLayer Network
              </button>
            )}

            {isConnected ? (
              <>
                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#555', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4a0', display: 'inline-block', flexShrink: 0 }} />
                  {address}
                </p>
                {[
                  { label: 'Dashboard',    href: '/dashboard' },
                  { label: 'My Calls',     href: '/calls'     },
                ].map(item => (
                  <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} style={{
                    display:        'block',
                    padding:        '12px',
                    textAlign:      'center',
                    borderRadius:   '12px',
                    fontSize:       '14px',
                    fontWeight:     600,
                    color:          '#ccc',
                    textDecoration: 'none',
                    background:     'rgba(255,255,255,0.05)',
                    border:         '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {item.label}
                  </a>
                ))}
                <a href="/deploy" onClick={() => setMobileOpen(false)} style={{
                  display:        'block',
                  padding:        '13px',
                  textAlign:      'center',
                  borderRadius:   '12px',
                  fontSize:       '15px',
                  fontWeight:     700,
                  color:          '#fff',
                  textDecoration: 'none',
                  background:     '#f97316',
                }}>
                  + Deploy Agent
                </a>
                <button onClick={handleDisconnect} style={{
                  width:        '100%',
                  padding:      '12px',
                  borderRadius: '12px',
                  fontSize:     '14px',
                  fontWeight:   600,
                  background:   'rgba(239,68,68,0.07)',
                  color:        '#ef4444',
                  border:       '1px solid rgba(239,68,68,0.15)',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                }}>
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={handleConnect} disabled={signing} style={{
                width:        '100%',
                padding:      '15px',
                borderRadius: '12px',
                fontSize:     '15px',
                fontWeight:   700,
                background:   '#f97316',
                color:        '#fff',
                border:       'none',
                cursor:       'pointer',
                opacity:      signing ? 0.6 : 1,
                fontFamily:   'inherit',
              }}>
                {signing ? 'Connecting…' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Responsive helpers — inject once */}
      <style>{`
        @media (min-width: 768px) {
          .hide-on-mobile   { display: flex !important; }
          .show-on-mobile-only { display: none !important; }
        }
        @media (max-width: 767px) {
          .hide-on-mobile   { display: none !important; }
          .show-on-mobile-only { display: flex !important; }
        }
      `}</style>
    </>
  );
}

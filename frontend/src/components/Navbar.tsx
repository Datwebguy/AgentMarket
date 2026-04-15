'use client';

import { useAccount, useConnect, useDisconnect, useSignMessage, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { SiweMessage } from 'siwe';
import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../hooks/useAuthStore';
import { switchToXLayer } from '../lib/switchToXLayer';

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_X_LAYER_CHAIN_ID || '196');

const NAV_LINKS = [
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Pricing',     href: '/pricing'     },
  { label: 'Docs',        href: '/docs'         },
  { label: 'Deploy',      href: '/deploy'       },
];

export function Navbar() {
  const { address, isConnected, chain } = useAccount();
  const { connectAsync }    = useConnect();
  const { disconnect }      = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const { token, user, login, logout } = useAuthStore();

  const [signing,     setSigning]     = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);   // wallet dropdown
  const [mobileOpen,  setMobileOpen]  = useState(false);   // hamburger drawer

  const drawerRef = useRef<HTMLDivElement>(null);

  // Auto-fetch user on mount if token present
  useEffect(() => {
    if (token && !user) {
      api.getMe().then(u => login(token, u)).catch(() => logout());
    }
  }, [token]);

  // Close drawer on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  async function handleConnect() {
    try {
      setSigning(true);
      try { await switchToXLayer(); } catch { /* continue */ }

      const result = await connectAsync({ connector: injected(), chainId: CHAIN_ID });
      const walletAddress = result.accounts[0];

      const nonce = await api.getNonce();
      const message = new SiweMessage({
        domain:    window.location.host,
        address:   walletAddress,
        statement: 'Sign in to AgentMarket. This request will not trigger a blockchain transaction or cost any gas fees.',
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

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <>
      <nav style={{
        position:   'sticky', top: 0, zIndex: 200,
        background: 'rgba(8,8,8,.95)',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        backdropFilter: 'blur(20px)',
        fontFamily: "'Figtree', sans-serif",
      }}>
        <div className="nav-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* Logo */}
          <a href="/" style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-.4px', textDecoration: 'none', color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Agent<span style={{ color: '#f97316' }}>Market</span><span style={{ color: '#00d4a0' }}>.</span>
          </a>

          {/* Desktop nav links */}
          <div className="nav-links" style={{ display: 'flex', gap: 4, flex: 1 }}>
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} style={{
                fontSize: 13, fontWeight: 500, color: '#888',
                padding: '6px 12px', borderRadius: 8,
                textDecoration: 'none', transition: 'color .18s',
              }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = '#fff')}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = '#888')}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Wrong chain button — desktop only */}
          {isConnected && chain?.id !== CHAIN_ID && (
            <button
              onClick={() => switchToXLayer().catch(() => {})}
              className="nav-links"
              style={{
                background: 'rgba(249,115,22,.15)', color: '#f97316',
                border: '1px solid rgba(249,115,22,.3)', borderRadius: 999,
                padding: '6px 14px', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              Switch to XLayer
            </button>
          )}

          {/* Right side — wallet / connect */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={signing}
                style={{
                  background: '#f97316', color: '#fff', border: 'none',
                  borderRadius: 999, padding: '8px 18px',
                  fontSize: 13, fontWeight: 700, cursor: signing ? 'not-allowed' : 'pointer',
                  opacity: signing ? .6 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                {signing ? 'Signing...' : 'Connect Wallet'}
              </button>
            ) : (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMenuOpen(m => !m)}
                  style={{
                    background: '#111', color: '#fff',
                    border: '1px solid rgba(255,255,255,.12)',
                    borderRadius: 999, padding: '7px 14px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4a0', display: 'inline-block', flexShrink: 0 }}></span>
                  {shortAddr}
                </button>

                {menuOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    background: '#111', border: '1px solid rgba(255,255,255,.12)',
                    borderRadius: 12, padding: '6px', minWidth: 180,
                    boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 300,
                  }}>
                    <a href="/dashboard" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#ccc', textDecoration: 'none' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#1c1c1c')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >Dashboard</a>
                    <a href="/deploy" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#ccc', textDecoration: 'none' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#1c1c1c')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >Deploy Agent</a>
                    <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '4px 0' }}></div>
                    <button onClick={handleDisconnect} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,.08)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >Disconnect</button>
                  </div>
                )}
              </div>
            )}

            {/* Hamburger button — mobile only */}
            <button
              className="nav-hamburger"
              onClick={() => setMobileOpen(o => !o)}
              style={{
                display: 'none', // overridden by CSS class on mobile
                background: 'none', border: 'none', color: '#fff',
                cursor: 'pointer', padding: 6, borderRadius: 8,
                flexDirection: 'column', gap: 5, alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label="Menu"
            >
              <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, transition: 'all .2s', transform: mobileOpen ? 'rotate(45deg) translateY(7px)' : 'none' }} />
              <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, transition: 'all .2s', opacity: mobileOpen ? 0 : 1 }} />
              <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, transition: 'all .2s', transform: mobileOpen ? 'rotate(-45deg) translateY(-7px)' : 'none' }} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          ref={drawerRef}
          className="mobile-nav-drawer"
          style={{
            display: 'none', // shown by CSS class
            position: 'fixed', top: 58, left: 0, right: 0,
            background: '#0d0d0d',
            borderBottom: '1px solid rgba(255,255,255,.08)',
            flexDirection: 'column',
            zIndex: 190,
            boxShadow: '0 8px 32px rgba(0,0,0,.7)',
          }}
        >
          {/* Nav links */}
          <div style={{ padding: '8px 0' }}>
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} style={{
                display: 'block', padding: '14px 20px',
                fontSize: 15, fontWeight: 600, color: '#ccc',
                textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,.04)',
              }}>
                {l.label}
              </a>
            ))}
          </div>

          {/* Wallet section */}
          <div style={{ padding: '12px 16px 20px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
            {isConnected ? (
              <>
                <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace', marginBottom: 10, padding: '8px 0' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4a0', display: 'inline-block', marginRight: 6 }}></span>
                  {shortAddr}
                </div>
                {isConnected && chain?.id !== CHAIN_ID && (
                  <button
                    onClick={() => switchToXLayer().catch(() => {})}
                    style={{
                      width: '100%', marginBottom: 8,
                      background: 'rgba(249,115,22,.15)', color: '#f97316',
                      border: '1px solid rgba(249,115,22,.3)', borderRadius: 10,
                      padding: '12px 14px', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Switch to XLayer Network
                  </button>
                )}
                <a href="/dashboard" onClick={() => setMobileOpen(false)} style={{ display: 'block', padding: '12px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#ccc', textDecoration: 'none', background: 'rgba(255,255,255,.04)', marginBottom: 8 }}>
                  Dashboard
                </a>
                <a href="/deploy" onClick={() => setMobileOpen(false)} style={{ display: 'block', padding: '12px 14px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', background: '#f97316', marginBottom: 8, textAlign: 'center' }}>
                  + Deploy Agent
                </a>
                <button onClick={handleDisconnect} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.15)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => { handleConnect(); setMobileOpen(false); }}
                disabled={signing}
                style={{
                  width: '100%', background: '#f97316', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '14px 0',
                  fontSize: 15, fontWeight: 700, cursor: signing ? 'not-allowed' : 'pointer',
                  opacity: signing ? .6 : 1, fontFamily: 'inherit',
                }}
              >
                {signing ? 'Signing...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

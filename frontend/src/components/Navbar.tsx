'use client';

import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { SiweMessage } from 'siwe';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../hooks/useAuthStore';

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_X_LAYER_CHAIN_ID || '196');

export function Navbar() {
  const { address, isConnected, chain } = useAccount();
  const { connectAsync }  = useConnect();
  const { disconnect }    = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { token, user, login, logout } = useAuthStore();

  const [signing,  setSigning]  = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Auto-fetch user on mount if token present
  useEffect(() => {
    if (token && !user) {
      api.getMe().then(u => login(token, u)).catch(() => logout());
    }
  }, [token]);

  async function handleConnect() {
    try {
      setSigning(true);
      const result = await connectAsync({ connector: injected() });
      const walletAddress = result.accounts[0];

      // Get nonce from backend
      const nonce = await api.getNonce();

      // Build SIWE message
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

      // Verify with backend, get JWT
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
  }

  const wrongChain = isConnected && chain?.id !== CHAIN_ID;

  return (
    <nav style={{
      position:   'sticky', top: 0, zIndex: 100,
      background: 'rgba(8,8,8,.92)',
      borderBottom: '1px solid rgba(255,255,255,.07)',
      backdropFilter: 'blur(20px)',
      fontFamily: "'Figtree', sans-serif",
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', gap: 24 }}>

        {/* Logo */}
        <a href="/" style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-.4px', textDecoration: 'none', color: '#fff', whiteSpace: 'nowrap' }}>
          Agent<span style={{ color: '#7c5cfc' }}>Market</span><span style={{ color: '#00d4a0' }}>.</span>
        </a>

        {/* Links */}
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {[
            { label: 'Marketplace', href: '/marketplace' },
            { label: 'Pricing',     href: '/pricing'     },
            { label: 'Docs',        href: '/docs'        },
            { label: 'Deploy',      href: '/deploy'      },
          ].map(l => (
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

        {/* Wrong chain warning */}
        {wrongChain && (
          <div style={{ fontSize: 12, color: '#f59e0b', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 6, padding: '4px 10px' }}>
            Switch to X Layer (196)
          </div>
        )}

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={signing}
              style={{
                background: '#7c5cfc', color: '#fff', border: 'none',
                borderRadius: 999, padding: '8px 18px',
                fontSize: 13, fontWeight: 700, cursor: signing ? 'not-allowed' : 'pointer',
                opacity: signing ? .6 : 1, fontFamily: 'inherit',
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
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4a0', display: 'inline-block' }}></span>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: '#111', border: '1px solid rgba(255,255,255,.12)',
                  borderRadius: 12, padding: '6px', minWidth: 180,
                  boxShadow: '0 8px 32px rgba(0,0,0,.5)',
                }}>
                  <a href="/dashboard" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#ccc', textDecoration: 'none' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#1c1c1c')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    Dashboard
                  </a>
                  <a href="/deploy" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#ccc', textDecoration: 'none' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#1c1c1c')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    Deploy Agent
                  </a>
                  <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '4px 0' }}></div>
                  <button onClick={handleDisconnect} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,.08)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

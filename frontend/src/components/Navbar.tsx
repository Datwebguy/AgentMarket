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
  { label: 'Pricing',     href: '/pricing'     },
  { label: 'Docs',        href: '/docs'         },
  { label: 'Deploy',      href: '/deploy'       },
];

export function Navbar() {
  const { address, isConnected, chain } = useAccount();
  const { connectAsync }     = useConnect();
  const { disconnect }       = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const { token, user, login, logout } = useAuthStore();

  const [signing,    setSigning]    = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (token && !user) {
      api.getMe().then(u => login(token, u)).catch(() => logout());
    }
  }, [token]);

  async function handleConnect() {
    try {
      setSigning(true);
      setMobileOpen(false);
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

  const shortAddr  = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  const wrongChain = isConnected && chain?.id !== CHAIN_ID;

  return (
    <>
      {/* ── NAV BAR ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.07] backdrop-blur-xl"
        style={{ background: 'rgba(8,8,8,.96)', fontFamily: "'Figtree', sans-serif" }}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center h-14 gap-2">

          {/* Logo */}
          <a href="/" className="font-black text-[16px] sm:text-[17px] tracking-tight text-white no-underline whitespace-nowrap flex-shrink-0 mr-2">
            Agent<span style={{ color: '#f97316' }}>Market</span><span style={{ color: '#00d4a0' }}>.</span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex gap-0.5 flex-1">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href}
                className="text-[13px] font-medium text-[#888] px-3 py-1.5 rounded-lg no-underline transition-colors hover:text-white">
                {l.label}
              </a>
            ))}
          </div>

          {/* Push wallet to right */}
          <div className="flex-1 md:hidden" />

          {/* Wrong chain — desktop */}
          {wrongChain && (
            <button onClick={() => switchToXLayer().catch(() => {})}
              className="hidden md:block text-[11px] font-bold px-3 py-1.5 rounded-full cursor-pointer flex-shrink-0"
              style={{ background: 'rgba(249,115,22,.15)', color: '#f97316', border: '1px solid rgba(249,115,22,.3)', fontFamily: 'inherit' }}>
              Switch to XLayer
            </button>
          )}

          {/* Desktop wallet */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {!isConnected ? (
              <button onClick={handleConnect} disabled={signing}
                className="text-[13px] font-bold px-4 py-2 rounded-full text-white cursor-pointer disabled:opacity-60 flex-shrink-0"
                style={{ background: '#f97316', border: 'none', fontFamily: 'inherit' }}>
                {signing ? 'Signing...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="relative">
                <button onClick={() => setMenuOpen(m => !m)}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-2 cursor-pointer flex-shrink-0"
                  style={{ background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,.12)', fontFamily: 'inherit' }}>
                  <span className="w-2 h-2 rounded-full bg-[#00d4a0] flex-shrink-0" />
                  {shortAddr}
                </button>

                {menuOpen && (
                  <div className="absolute top-[calc(100%+6px)] right-0 rounded-xl p-1.5 min-w-[180px] z-[300]"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 8px 32px rgba(0,0,0,.6)' }}>
                    <a href="/dashboard" onClick={() => setMenuOpen(false)}
                      className="flex px-3 py-2 rounded-lg text-[13px] font-medium text-[#ccc] no-underline hover:bg-white/[0.04]">Dashboard</a>
                    <a href="/deploy" onClick={() => setMenuOpen(false)}
                      className="flex px-3 py-2 rounded-lg text-[13px] font-medium text-[#ccc] no-underline hover:bg-white/[0.04]">Deploy Agent</a>
                    <div className="h-px my-1 bg-white/[0.06]" />
                    <button onClick={handleDisconnect}
                      className="w-full flex px-3 py-2 rounded-lg text-[13px] font-medium text-[#ef4444] bg-transparent border-none cursor-pointer text-left hover:bg-red-500/10"
                      style={{ fontFamily: 'inherit' }}>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button onClick={() => setMobileOpen(o => !o)}
            className="flex md:hidden flex-col justify-center items-center gap-[5px] p-2 rounded-lg bg-transparent border-none cursor-pointer flex-shrink-0"
            aria-label="Toggle menu">
            <span className="block w-5 h-0.5 bg-white rounded-full transition-all duration-200"
              style={{ transform: mobileOpen ? 'rotate(45deg) translate(0px, 7px)' : 'none' }} />
            <span className="block w-5 h-0.5 bg-white rounded-full transition-all duration-200"
              style={{ opacity: mobileOpen ? 0 : 1 }} />
            <span className="block w-5 h-0.5 bg-white rounded-full transition-all duration-200"
              style={{ transform: mobileOpen ? 'rotate(-45deg) translate(0px, -7px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* ── MOBILE DRAWER ───────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed top-14 left-0 right-0 z-40 md:hidden flex flex-col"
          style={{ background: '#0e0e0e', borderBottom: '1px solid rgba(255,255,255,.08)', boxShadow: '0 12px 40px rgba(0,0,0,.8)', fontFamily: "'Figtree', sans-serif" }}>

          {/* Nav links */}
          <div className="flex flex-col">
            {NAV_LINKS.map((l, i) => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="px-5 py-4 text-[15px] font-semibold text-[#ccc] no-underline active:bg-white/[0.04]"
                style={{ borderBottom: i < NAV_LINKS.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                {l.label}
              </a>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.07] mx-4" />

          {/* Wallet area */}
          <div className="flex flex-col gap-3 p-4">
            {wrongChain && (
              <button onClick={() => { switchToXLayer().catch(() => {}); setMobileOpen(false); }}
                className="w-full py-3 rounded-xl text-[14px] font-bold cursor-pointer"
                style={{ background: 'rgba(249,115,22,.12)', color: '#f97316', border: '1px solid rgba(249,115,22,.25)', fontFamily: 'inherit' }}>
                Switch to XLayer Network
              </button>
            )}

            {isConnected ? (
              <>
                <p className="text-[11px] font-mono px-1 flex items-center gap-2" style={{ color: '#555' }}>
                  <span className="w-2 h-2 rounded-full bg-[#00d4a0] flex-shrink-0" />
                  {address}
                </p>
                <a href="/dashboard" onClick={() => setMobileOpen(false)}
                  className="py-3 text-center rounded-xl text-[14px] font-semibold text-[#ccc] no-underline"
                  style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
                  Dashboard
                </a>
                <a href="/deploy" onClick={() => setMobileOpen(false)}
                  className="py-3 text-center rounded-xl text-[15px] font-bold text-white no-underline"
                  style={{ background: '#f97316' }}>
                  + Deploy Agent
                </a>
                <button onClick={handleDisconnect}
                  className="w-full py-3 rounded-xl text-[14px] font-semibold cursor-pointer"
                  style={{ background: 'rgba(239,68,68,.07)', color: '#ef4444', border: '1px solid rgba(239,68,68,.15)', fontFamily: 'inherit' }}>
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={handleConnect} disabled={signing}
                className="w-full py-4 rounded-xl text-[15px] font-bold text-white cursor-pointer disabled:opacity-60"
                style={{ background: '#f97316', border: 'none', fontFamily: 'inherit' }}>
                {signing ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

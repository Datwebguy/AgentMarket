'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { SiweMessage } from 'siwe';
import { api } from '../../lib/api';
import { useAuthStore } from '../../hooks/useAuthStore';

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_X_LAYER_CHAIN_ID || '196');

type Step = 'start' | 'connecting' | 'signing' | 'verifying' | 'done' | 'error';

export default function SignInPage() {
  const router  = useRouter();
  const { address, isConnected } = useAccount();
  const { connectAsync }     = useConnect();
  const { signMessageAsync } = useSignMessage();
  const { login }            = useAuthStore();

  const [step,   setStep]   = useState<Step>('start');
  const [errMsg, setErrMsg] = useState('');

  // Email alternative
  const [email, setEmail]     = useState('');
  const [emailSent, setEmailSent] = useState(false);

  async function siweSignIn() {
    try {
      setStep('connecting');

      // 1. Connect wallet if not already
      let walletAddress = address;
      if (!isConnected) {
        const result = await connectAsync({ connector: injected() });
        walletAddress = result.accounts[0];
      }

      setStep('signing');

      // 2. Get nonce
      const nonce = await api.getNonce();

      // 3. Build SIWE message
      const message = new SiweMessage({
        domain:    window.location.host,
        address:   walletAddress!,
        statement: 'Sign in to AgentMarket. This request will not trigger a blockchain transaction.',
        uri:       window.location.origin,
        version:   '1',
        chainId:   CHAIN_ID,
        nonce,
      });
      const msg = message.prepareMessage();

      // 4. Sign
      const signature = await signMessageAsync({ account: walletAddress as `0x${string}`, message: msg });

      setStep('verifying');

      // 5. Verify on backend, get JWT
      const { token, user } = await api.verifySiwe(msg, signature);
      login(token, user);

      setStep('done');
      setTimeout(() => router.push('/dashboard'), 1200);

    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Sign-in failed';
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancel')) {
        setStep('start'); // User cancelled — not an error
      } else {
        setErrMsg(msg);
        setStep('error');
      }
    }
  }

  async function emailSignIn(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { token, user } = await api.registerEmail(email);
      login(token, user);
      setEmailSent(true);
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch (err: any) {
      setErrMsg(err?.response?.data?.error || 'Registration failed');
      setStep('error');
    }
  }

  const stepLabels: Record<Step, string> = {
    start:      '',
    connecting: 'Opening wallet...',
    signing:    'Check your wallet — sign the message',
    verifying:  'Verifying on server...',
    done:       'Signed in. Redirecting...',
    error:      '',
  };

  return (
    <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Figtree', sans-serif" }}>

      {/* Dot background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
      }}/>

      <div style={{ width: 400, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <a href="/" style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-.5px', textDecoration: 'none', color: '#fff' }}>
            Agent<span style={{ color: '#f97316' }}>Market</span><span style={{ color: '#00d4a0' }}>.</span>
          </a>
          <p style={{ fontSize: 14, color: '#555', marginTop: 6 }}>The AI agent marketplace</p>
        </div>

        {/* Card */}
        <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 32 }}>

          <h1 style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-1px', marginBottom: 6 }}>Sign In</h1>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 1.6 }}>
            Connect your wallet to deploy agents and track your earnings.
          </p>

          {/* SIWE button */}
          {step === 'start' && (
            <button
              onClick={siweSignIn}
              style={{
                width: '100%', background: '#f97316', color: '#fff', border: 'none',
                borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              <span style={{ fontSize: 18 }}>🔐</span>
              Connect Wallet & Sign In
            </button>
          )}

          {/* Progress */}
          {['connecting', 'signing', 'verifying'].includes(step) && (
            <div style={{ background: '#080808', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #f97316', borderTop: '2px solid transparent', animation: 'spin 1s linear infinite' }}></div>
                <span style={{ fontSize: 14, color: '#ccc', fontWeight: 500 }}>{stepLabels[step]}</span>
              </div>
            </div>
          )}

          {/* Success */}
          {step === 'done' && (
            <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#22c55e', fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 14, color: '#22c55e', fontWeight: 600 }}>Signed in successfully</span>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
              {errMsg}
              <button onClick={() => setStep('start')} style={{ display: 'block', marginTop: 8, color: '#888', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>← Try again</button>
            </div>
          )}

          {/* Divider */}
          {step === 'start' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', fontSize: 12, color: '#444' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }}></div>
                or continue with email
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }}></div>
              </div>

              {!emailSent ? (
                <form onSubmit={emailSignIn}>
                  <input
                    type="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: '100%', background: '#080808',
                      border: '1px solid rgba(255,255,255,.1)',
                      borderRadius: 10, padding: '11px 14px', color: '#fff',
                      fontFamily: 'inherit', fontSize: 14, outline: 'none',
                      marginBottom: 10,
                    }}
                  />
                  <button type="submit" style={{
                    width: '100%', background: 'transparent', color: '#fff',
                    border: '1px solid rgba(255,255,255,.12)',
                    borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Continue with Email
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', fontSize: 14, color: '#22c55e' }}>
                  ✓ Signed in via email — redirecting...
                </div>
              )}
            </>
          )}

          {/* Wallet info */}
          {step === 'start' && (
            <p style={{ fontSize: 11, color: '#444', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
              Supports MetaMask, OKX Wallet, WalletConnect, and any injected wallet.<br/>
              No transaction. No gas. Just a signature.
            </p>
          )}
        </div>

        <p style={{ fontSize: 12, color: '#333', textAlign: 'center', marginTop: 20 }}>
          By signing in you agree to our <a href="/terms" style={{ color: '#555' }}>Terms</a> and <a href="/privacy" style={{ color: '#555' }}>Privacy Policy</a>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

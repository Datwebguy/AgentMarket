'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function VerifyEmailContent() {
  const params   = useSearchParams();
  const router   = useRouter();
  const token    = params.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [msg,    setMsg]    = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMsg('No verification token provided.'); return; }
    axios.post(`${API}/auth/verify-email`, { token })
      .then(() => { setStatus('success'); setTimeout(() => router.push('/dashboard'), 2500); })
      .catch(err => { setStatus('error'); setMsg(err?.response?.data?.error || 'Verification failed. The link may have expired.'); });
  }, [token]);

  return (
    <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Figtree', sans-serif", padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-.5px', marginBottom: 40, color: '#fff' }}>
          Agent<span style={{ color: '#f97316' }}>Market</span><span style={{ color: '#00d4a0' }}>.</span>
        </div>

        {status === 'verifying' && (
          <>
            <div style={{ width: 48, height: 48, border: '3px solid rgba(249,115,22,.2)', borderTop: '3px solid #f97316', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
            <h2 style={{ fontWeight: 900, fontSize: 22, color: '#fff', marginBottom: 8 }}>Verifying your email...</h2>
            <p style={{ color: '#666', fontSize: 14 }}>Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,.1)', border: '2px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>✓</div>
            <h2 style={{ fontWeight: 900, fontSize: 22, color: '#22c55e', marginBottom: 8 }}>Email verified</h2>
            <p style={{ color: '#666', fontSize: 14 }}>Redirecting to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,.1)', border: '2px solid rgba(239,68,68,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>✕</div>
            <h2 style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 8 }}>Verification failed</h2>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{msg}</p>
            <a href="/signin" style={{ display: 'inline-block', background: '#f97316', color: '#fff', borderRadius: 999, padding: '10px 24px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              Back to Sign In
            </a>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(249,115,22,.2)', borderTop: '3px solid #f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </main>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

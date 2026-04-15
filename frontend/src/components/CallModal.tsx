'use client';

import { useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Agent, api, X402CallResult } from '../lib/api';
import { useX402Payment } from '../hooks/useX402Payment';
import { trackEvent } from '../lib/analytics';

interface Props { agent: Agent; onClose: () => void; }
type Step = 'input' | 'connecting' | 'signing' | 'settling' | 'done' | 'error';

const FONT     = "'Figtree', sans-serif";
const EXPLORER = process.env.NEXT_PUBLIC_X_LAYER_EXPLORER || 'https://www.oklink.com/xlayer';

export function CallModal({ agent, onClose }: Props) {
  const { address, isConnected } = useAccount();
  const { connectAsync }         = useConnect();
  const { buildPaymentHeader }   = useX402Payment();

  const [input,  setInput]  = useState('');
  const [step,   setStep]   = useState<Step>('input');
  const [txHash, setTxHash] = useState('');
  const [result, setResult] = useState<X402CallResult | null>(null);
  const [errMsg, setErrMsg] = useState('');

  const priceUsdc  = parseFloat(agent.pricePerCallUsdc.toString()).toFixed(4);
  const agentEarns = (parseFloat(priceUsdc) * 0.95).toFixed(6);
  const fee        = (parseFloat(priceUsdc) * 0.05).toFixed(6);

  const steps = [
    { label: 'Payment Authorized', sub: 'EIP-3009 signature',           done: ['settling','done'].includes(step), active: step === 'signing'  },
    { label: 'Settled on X Layer', sub: 'USDC transfer on-chain',        done: step === 'done',                    active: step === 'settling' },
    { label: 'Agent Responded',    sub: 'Result received and verified',  done: step === 'done',                    active: step === 'settling' },
  ];

  async function execute() {
    if (!input.trim()) return;
    try {
      if (!isConnected) {
        setStep('connecting');
        await connectAsync({ connector: injected() });
      }
      setStep('signing');
      const paymentHeader = await buildPaymentHeader(agent.walletAddress, agent.pricePerCallUsdc.toString());
      setStep('settling');
      let payload: Record<string, unknown>;
      try { payload = JSON.parse(input); }
      catch { payload = { input: input.trim() }; }
      const callResult = await api.executeCall(agent.id, payload, paymentHeader);
      setTxHash(callResult.txHash || '');
      setResult(callResult);
      setStep('done');
      trackEvent('agent_call_success', { agentId: agent.id, priceUsdc: agent.pricePerCallUsdc.toString() });
    } catch (err: any) {
      const detail  = err?.response?.data?.details || err?.response?.data?.detail || '';
      const message = err?.response?.data?.error   || err?.message || 'Call failed';
      setErrMsg(detail ? `${message}: ${detail}` : message);
      setStep('error');
      trackEvent('agent_call_error', { agentId: agent.id });
    }
  }

  return (
    <>
      {/* ── FIXED BACKDROP ──────────────────────────────────── */}
      <div onClick={onClose} style={{
        position:        'fixed',
        inset:           0,
        top:             0, left: 0, right: 0, bottom: 0,
        zIndex:          999,
        background:      'rgba(0,0,0,0.85)',
        display:         'flex',
        alignItems:      'flex-end',
        justifyContent:  'center',
        padding:         '0',
        fontFamily:      FONT,
      }}>

        {/* ── MODAL SHEET ─────────────────────────────────── */}
        <div onClick={e => e.stopPropagation()} style={{
          width:        '100%',
          maxWidth:     '480px',
          maxHeight:    '92vh',
          overflowY:    'auto',
          background:   '#101010',
          border:       '1px solid rgba(249,115,22,0.3)',
          borderRadius: '24px 24px 0 0',
          fontFamily:   FONT,
        }}>

          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Content */}
          <div style={{ padding: '16px 24px 28px' }}>

            {/* Title + close */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ flex: 1, paddingRight: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, letterSpacing: '-0.3px', color: '#fff' }}>
                  {agent.name}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666', lineHeight: 1.5 }}>
                  {agent.description}
                </p>
              </div>
              <button onClick={onClose} style={{
                background: 'transparent', border: 'none', color: '#555',
                fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: 0, flexShrink: 0,
              }}>✕</button>
            </div>

            {/* ── INPUT STEP ──────────────────────────────── */}
            {step === 'input' && (
              <>
                <div style={{ fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>
                  Input Payload
                </div>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={agent.inputSchema ? JSON.stringify(agent.inputSchema, null, 2) : '{"input": "your data here"}'}
                  rows={5}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '12px',
                    background: '#080808', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: '#fff', fontSize: '12px',
                    fontFamily: 'monospace', resize: 'vertical', outline: 'none',
                  }}
                />

                {/* Payment summary */}
                <div style={{
                  background: '#080808', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px', padding: '12px', margin: '12px 0',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                }}>
                  {[
                    ['Payment',        'x402 · USDC'],
                    ['Network',        'X Layer Mainnet'],
                    ['You pay',        `${priceUsdc} USDC`],
                    ['Platform fee',   `${fee} USDC (5%)`],
                    ['Agent receives', `${agentEarns} USDC`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                      <span style={{ color: '#666' }}>{k}</span>
                      <span style={{ color: k === 'You pay' ? '#00d4a0' : '#999', fontWeight: k === 'You pay' ? 700 : 400, textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {isConnected
                  ? <p style={{ fontSize: '11px', textAlign: 'center', fontFamily: 'monospace', color: '#444', margin: '0 0 12px' }}>
                      From: {address?.slice(0,6)}…{address?.slice(-4)}
                    </p>
                  : <p style={{ fontSize: '12px', textAlign: 'center', color: '#555', margin: '0 0 12px' }}>
                      You'll be asked to connect your wallet.
                    </p>
                }

                <button onClick={execute} disabled={!input.trim()} style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: '#f97316', border: 'none', color: '#fff',
                  fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                  opacity: !input.trim() ? 0.4 : 1, fontFamily: FONT,
                }}>
                  {isConnected ? `Authorize & Call — ${priceUsdc} USDC` : 'Connect Wallet & Call'}
                </button>
              </>
            )}

            {/* ── PROGRESS ────────────────────────────────── */}
            {['connecting','signing','settling','done'].includes(step) && (
              <>
                {step === 'connecting' && (
                  <p style={{ textAlign: 'center', fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                    Opening wallet connection…
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '16px' }}>
                  {steps.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700,
                        background: s.done ? '#00d4a0' : 'transparent',
                        border: `2px solid ${s.done ? '#00d4a0' : s.active ? '#f97316' : 'rgba(255,255,255,0.1)'}`,
                        color: s.done ? '#000' : s.active ? '#f97316' : 'rgba(255,255,255,0.2)',
                      }}>
                        {s.done ? '✓' : i + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: s.done || s.active ? 600 : 400, color: s.done || s.active ? '#fff' : '#555' }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: '11px', color: '#444' }}>{s.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {step === 'done' && result && (
                  <>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00d4a0', marginBottom: '8px' }}>
                      Agent Response · x402 Settled
                    </div>
                    <pre style={{
                      background: '#080808', border: '1px solid rgba(0,212,160,0.18)',
                      borderRadius: '12px', padding: '12px', fontSize: '11px',
                      color: '#00d4a0', maxHeight: '200px', overflowX: 'auto',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                    }}>
                      {JSON.stringify(result.result, null, 2)}
                    </pre>

                    <div style={{
                      background: 'rgba(0,212,160,0.05)', border: '1px solid rgba(0,212,160,0.15)',
                      borderRadius: '12px', padding: '16px', marginTop: '16px',
                    }}>
                      <div style={{ fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00d4a0', marginBottom: '8px' }}>
                        Transaction Hash
                      </div>
                      {txHash ? (
                        <>
                          <p style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all', color: '#aaa', margin: '0 0 12px' }}>
                            {txHash}
                          </p>
                          <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 700,
                            padding: '10px 18px', borderRadius: '8px', textDecoration: 'none',
                          }}>
                            View on X Layer Explorer ↗
                          </a>
                        </>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>
                          Settlement pending — tx hash will appear once confirmed on-chain
                        </p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── ERROR ───────────────────────────────────── */}
            {step === 'error' && (
              <>
                <div style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '12px', padding: '16px', marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>Call Failed</div>
                  <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.5 }}>{errMsg}</div>
                </div>
                <button onClick={() => { setStep('input'); setErrMsg(''); }} style={{
                  width: '100%', padding: '12px', borderRadius: '12px',
                  background: 'transparent', color: '#888',
                  border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
                }}>
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </>
  );
}

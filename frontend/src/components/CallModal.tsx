'use client';

import { useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Agent, api, X402CallResult } from '../lib/api';
import { useX402Payment } from '../hooks/useX402Payment';
import { trackEvent } from '../lib/analytics';

interface Props {
  agent:   Agent;
  onClose: () => void;
}

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
    { label: 'Payment Authorized', sub: 'EIP-3009 signature',          done: ['settling','done'].includes(step), active: step === 'signing'  },
    { label: 'Settled on X Layer', sub: 'USDC transfer on-chain',       done: step === 'done',                    active: step === 'settling' },
    { label: 'Agent Responded',    sub: 'Result received and verified', done: step === 'done',                    active: step === 'settling' },
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
      {/* Backdrop */}
      <div onClick={onClose}
        className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center sm:p-5"
        style={{ background: 'rgba(0,0,0,.85)' }}>

        {/* Sheet / Modal */}
        <div onClick={e => e.stopPropagation()}
          className="w-full sm:w-[460px] sm:max-w-full rounded-t-[24px] sm:rounded-[20px] overflow-y-auto"
          style={{
            background: '#101010',
            border: '1px solid rgba(249,115,22,.3)',
            maxHeight: '92vh',
            fontFamily: FONT,
          }}>

          {/* Drag handle — mobile only */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Inner padding */}
          <div className="px-5 sm:px-7 pt-4 sm:pt-6 pb-6">

            {/* Close + title */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4">
                <h2 className="text-[18px] font-black tracking-tight m-0">{agent.name}</h2>
                <p className="text-[12px] leading-relaxed mt-1 m-0" style={{ color: '#666' }}>{agent.description}</p>
              </div>
              <button onClick={onClose}
                className="text-[#555] text-[18px] bg-transparent border-none cursor-pointer leading-none p-0 flex-shrink-0 mt-0.5">
                ✕
              </button>
            </div>

            {/* ── INPUT STEP ──────────────────── */}
            {step === 'input' && (
              <>
                <label className="block text-[10px] font-mono tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                  Input Payload
                </label>
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  placeholder={agent.inputSchema ? JSON.stringify(agent.inputSchema, null, 2) : '{"input": "your data here"}'}
                  rows={5}
                  className="w-full rounded-xl p-3 text-[12px] font-mono resize-y outline-none text-white"
                  style={{ background: '#080808', border: '1px solid rgba(255,255,255,.1)', boxSizing: 'border-box' }} />

                {/* Payment summary */}
                <div className="rounded-xl p-3 my-4 flex flex-col gap-1.5"
                  style={{ background: '#080808', border: '1px solid rgba(255,255,255,.06)' }}>
                  {[
                    ['Payment',        'x402 · USDC'],
                    ['Network',        'X Layer Mainnet'],
                    ['You pay',        `${priceUsdc} USDC`],
                    ['Platform fee',   `${fee} USDC (5%)`],
                    ['Agent receives', `${agentEarns} USDC`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[12px] gap-3">
                      <span style={{ color: '#666' }}>{k}</span>
                      <span className="text-right" style={{ color: k === 'You pay' ? '#00d4a0' : '#999', fontWeight: k === 'You pay' ? 700 : 400 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {isConnected
                  ? <p className="text-[11px] text-center font-mono mb-3" style={{ color: '#444' }}>
                      From: {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                  : <p className="text-[12px] text-center mb-3" style={{ color: '#555' }}>
                      You'll be asked to connect your wallet.
                    </p>
                }

                <button onClick={execute} disabled={!input.trim()}
                  className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white cursor-pointer disabled:opacity-40"
                  style={{ background: '#f97316', border: 'none', fontFamily: FONT }}>
                  {isConnected ? `Authorize & Call — ${priceUsdc} USDC` : 'Connect Wallet & Call'}
                </button>
              </>
            )}

            {/* ── PROGRESS STEPS ──────────────── */}
            {['connecting','signing','settling','done'].includes(step) && (
              <>
                {step === 'connecting' && (
                  <p className="text-center text-[13px] mb-4" style={{ color: '#666' }}>Opening wallet connection...</p>
                )}

                <div className="flex flex-col mb-4">
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 py-3"
                      style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                        style={{
                          background: s.done ? '#00d4a0' : 'transparent',
                          border: `2px solid ${s.done ? '#00d4a0' : s.active ? '#f97316' : 'rgba(255,255,255,.1)'}`,
                          color: s.done ? '#000' : s.active ? '#f97316' : 'rgba(255,255,255,.2)',
                          animation: s.active && !s.done ? 'pulse 1.2s ease-in-out infinite' : 'none',
                        }}>
                        {s.done ? '✓' : i + 1}
                      </div>
                      <div>
                        <div className="text-[13px]" style={{ fontWeight: s.done || s.active ? 600 : 400, color: s.done || s.active ? '#fff' : '#555' }}>
                          {s.label}
                        </div>
                        <div className="text-[11px]" style={{ color: '#444' }}>{s.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Result */}
                {step === 'done' && result && (
                  <>
                    <div className="text-[10px] font-mono tracking-widest uppercase mb-2" style={{ color: '#00d4a0' }}>
                      Agent Response · x402 Settled
                    </div>
                    <pre className="rounded-xl p-3 text-[11px] overflow-x-auto font-mono leading-relaxed"
                      style={{ background: '#080808', border: '1px solid rgba(0,212,160,.18)', color: '#00d4a0', maxHeight: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(result.result, null, 2)}
                    </pre>

                    {/* TX Hash box */}
                    <div className="rounded-xl p-4 mt-4"
                      style={{ background: 'rgba(0,212,160,.05)', border: '1px solid rgba(0,212,160,.15)' }}>
                      <div className="text-[10px] font-mono tracking-widest uppercase mb-2" style={{ color: '#00d4a0' }}>
                        Transaction Hash
                      </div>
                      {txHash ? (
                        <>
                          <p className="text-[11px] font-mono break-all mb-3 m-0" style={{ color: '#aaa' }}>{txHash}</p>
                          <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[13px] font-bold text-white no-underline rounded-lg px-4 py-2.5"
                            style={{ background: '#f97316' }}>
                            View on X Layer Explorer ↗
                          </a>
                        </>
                      ) : (
                        <p className="text-[12px] m-0" style={{ color: '#555' }}>
                          Settlement pending — tx hash will appear once confirmed on-chain
                        </p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── ERROR ───────────────────────── */}
            {step === 'error' && (
              <>
                <div className="rounded-xl p-4 mb-4"
                  style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
                  <div className="text-[13px] font-bold mb-1" style={{ color: '#ef4444' }}>Call Failed</div>
                  <div className="text-[12px] leading-relaxed" style={{ color: '#888' }}>{errMsg}</div>
                </div>
                <button onClick={() => { setStep('input'); setErrMsg(''); }}
                  className="w-full py-3 rounded-xl text-[13px] font-semibold cursor-pointer"
                  style={{ background: 'transparent', color: '#888', border: '1px solid rgba(255,255,255,.1)', fontFamily: FONT }}>
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}

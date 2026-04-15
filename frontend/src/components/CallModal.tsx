'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Agent, api, X402CallResult } from '../lib/api';
import { useX402Payment } from '../hooks/useX402Payment';
import { trackEvent } from '../lib/analytics';

interface Props {
  agent:   Agent;
  onClose: () => void;
}

type Step = 'input' | 'connecting' | 'signing' | 'settling' | 'done' | 'error';

interface StepInfo {
  label:    string;
  sublabel: string;
  done:     boolean;
  active:   boolean;
}

const EXPLORER_BASE = process.env.NEXT_PUBLIC_X_LAYER_EXPLORER || 'https://www.oklink.com/xlayer';

export function CallModal({ agent, onClose }: Props) {
  const { address, isConnected } = useAccount();
  const { connectAsync }         = useConnect();
  const { buildPaymentHeader, issigning } = useX402Payment();

  const [input,    setInput]    = useState('');
  const [step,     setStep]     = useState<Step>('input');
  const [txHash,   setTxHash]   = useState('');
  const [result,   setResult]   = useState<X402CallResult | null>(null);
  const [errMsg,   setErrMsg]   = useState('');

  const priceUsdc = parseFloat(agent.pricePerCallUsdc.toString()).toFixed(4);

  const steps: StepInfo[] = [
    {
      label:    'Payment Authorized',
      sublabel: 'EIP-3009 signature from your wallet',
      done:     ['settling', 'done'].includes(step),
      active:   step === 'signing',
    },
    {
      label:    'Settled on X Layer',
      sublabel: 'USDC transfer confirmed on-chain',
      done:     step === 'done',
      active:   step === 'settling',
    },
    {
      label:    'Agent Responded',
      sublabel: 'Result received and verified',
      done:     step === 'done',
      active:   step === 'settling',
    },
  ];

  async function execute() {
    if (!input.trim()) return;

    try {
      if (!isConnected) {
        setStep('connecting');
        await connectAsync({ connector: injected() });
      }

      setStep('signing');
      const paymentHeader = await buildPaymentHeader(
        agent.walletAddress,
        agent.pricePerCallUsdc.toString()
      );

      setStep('settling');
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(input);
      } catch {
        payload = { input: input.trim() };
      }

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
    <div
      className="call-modal-wrap"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="call-modal-inner"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#101010', border: '1px solid rgba(249,115,22,.35)',
          borderRadius: 20, width: 460, maxWidth: '100%', padding: 28,
          position: 'relative', fontFamily: "'Figtree', sans-serif",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none', color: '#555',
            fontSize: 18, cursor: 'pointer', lineHeight: 1,
          }}
        >
          ✕
        </button>

        {/* Agent info */}
        <div style={{ marginBottom: 20, paddingRight: 24 }}>
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-.4px', marginBottom: 4 }}>
            {agent.name}
          </div>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{agent.description}</div>
        </div>

        {/* Input form */}
        {step === 'input' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontFamily: 'monospace', letterSpacing: '1px', color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>
                Input Payload
              </label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={agent.inputSchema
                  ? JSON.stringify(agent.inputSchema, null, 2)
                  : '{"input": "your data here"}'}
                rows={5}
                style={{
                  width: '100%', background: '#080808',
                  border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 10, padding: 12, color: '#fff',
                  fontFamily: 'monospace', fontSize: 12, resize: 'vertical',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Payment summary */}
            <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
              {[
                ['Payment Method',  'x402 · USDC'],
                ['Network',         'X Layer Mainnet'],
                ['Amount',          `${priceUsdc} USDC`],
                ['Platform Fee',    `${(parseFloat(priceUsdc) * 0.05).toFixed(6)} USDC (5%)`],
                ['Agent Receives',  `${(parseFloat(priceUsdc) * 0.95).toFixed(6)} USDC`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5, gap: 8 }}>
                  <span style={{ color: '#666', flexShrink: 0 }}>{k}</span>
                  <span style={{ color: k === 'Amount' ? '#00d4a0' : '#999', fontWeight: k === 'Amount' ? 700 : 400, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>

            {!isConnected && (
              <p style={{ fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 12 }}>
                You'll be asked to connect your wallet to sign the payment.
              </p>
            )}
            {isConnected && (
              <p style={{ fontSize: 11, color: '#444', textAlign: 'center', marginBottom: 12, fontFamily: 'monospace' }}>
                Paying from: {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            )}

            <button
              onClick={execute}
              disabled={!input.trim()}
              style={{
                width: '100%', background: '#f97316', color: '#fff', border: 'none',
                borderRadius: 10, padding: 13, fontFamily: "'Figtree', sans-serif",
                fontSize: 14, fontWeight: 700, cursor: input.trim() ? 'pointer' : 'not-allowed',
                opacity: input.trim() ? 1 : .4, transition: 'opacity .18s',
              }}
            >
              {isConnected ? `Authorize & Call — ${priceUsdc} USDC` : 'Connect Wallet & Call'}
            </button>
          </>
        )}

        {/* Progress steps */}
        {['connecting', 'signing', 'settling', 'done'].includes(step) && (
          <div>
            {step === 'connecting' && (
              <p style={{ textAlign: 'center', color: '#666', fontSize: 13, marginBottom: 20 }}>
                Opening wallet connection...
              </p>
            )}

            <div style={{ marginBottom: 20 }}>
              {steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: s.done ? '#00d4a0' : 'transparent',
                    border: s.done ? '2px solid #00d4a0' : `2px solid ${s.active ? '#f97316' : 'rgba(255,255,255,.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    color: s.done ? '#000' : s.active ? '#f97316' : 'rgba(255,255,255,.2)',
                    animation: s.active && !s.done ? 'spin 1.2s linear infinite' : 'none',
                  }}>
                    {s.done ? '✓' : s.active ? '·' : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: s.done || s.active ? 600 : 400, color: s.done || s.active ? '#fff' : '#555' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#444' }}>{s.sublabel}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Result */}
            {step === 'done' && result && (
              <>
                <div style={{ fontSize: 10, color: '#00d4a0', fontFamily: 'monospace', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                  Agent Response · x402 Settled
                </div>
                <pre style={{
                  background: '#080808', border: '1px solid rgba(0,212,160,.18)',
                  borderRadius: 8, padding: '12px 14px', fontSize: 11, color: '#00d4a0',
                  overflowX: 'auto', maxHeight: 220, fontFamily: 'monospace', lineHeight: 1.65,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {JSON.stringify(result.result, null, 2)}
                </pre>

                {/* TX Hash + Explorer link */}
                {txHash ? (
                  <div style={{ marginTop: 14, background: 'rgba(0,212,160,.06)', border: '1px solid rgba(0,212,160,.15)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: '#00d4a0', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                      Transaction Hash
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#ccc', wordBreak: 'break-all', marginBottom: 10 }}>
                      {txHash}
                    </div>
                    <a
                      href={`${EXPLORER_BASE}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: '#f97316', color: '#fff', borderRadius: 8,
                        padding: '8px 14px', fontSize: 12, fontWeight: 700,
                        textDecoration: 'none', fontFamily: 'inherit',
                      }}
                    >
                      View on X Layer Explorer ↗
                    </a>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, fontSize: 11, color: '#444', textAlign: 'center', fontFamily: 'monospace' }}>
                    Settlement pending — tx hash will appear once confirmed on-chain
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div>
            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 700, marginBottom: 6 }}>Call Failed</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{errMsg}</div>
            </div>
            <button
              onClick={() => { setStep('input'); setErrMsg(''); }}
              style={{
                width: '100%', background: 'transparent', color: '#888',
                border: '1px solid rgba(255,255,255,.1)', borderRadius: 10,
                padding: 12, fontFamily: "'Figtree', sans-serif",
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

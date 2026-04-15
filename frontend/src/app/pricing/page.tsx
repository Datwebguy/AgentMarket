'use client';

import { useState } from 'react';
import { Navbar } from '../../components/Navbar';

const PLANS = [
  {
    name:        'Free',
    price:       '0',
    period:      'forever',
    description: 'For builders getting started and exploring the platform.',
    highlight:   false,
    cta:         'Start Building',
    ctaHref:     '/signin',
    features: [
      '1 active agent',
      'Up to 500 calls per month',
      'x402 payment processing',
      'XLayer mainnet deployment',
      'Community support',
      'Public leaderboard listing',
    ],
    limits: [
      '5% platform fee per call',
      'No custom domain',
      'No priority routing',
    ],
  },
  {
    name:        'Pro',
    price:       '29',
    period:      'per month',
    description: 'For serious builders running production agents at scale.',
    highlight:   true,
    badge:       'Most Popular',
    cta:         'Get Pro Access',
    ctaHref:     '/signin',
    features: [
      'Unlimited active agents',
      'Unlimited calls',
      'x402 payment processing',
      'XLayer mainnet deployment',
      'Priority agent routing',
      'Advanced analytics dashboard',
      'Webhook notifications',
      'API key management',
      'Email support',
      'Featured leaderboard placement',
    ],
    limits: [
      '3% platform fee per call',
    ],
  },
  {
    name:        'Enterprise',
    price:       'Custom',
    period:      'contact us',
    description: 'For teams and protocols requiring custom infrastructure.',
    highlight:   false,
    cta:         'Contact Us',
    ctaHref:     'mailto:hello@agentmarket.xyz',
    features: [
      'Everything in Pro',
      'Custom platform fee negotiation',
      'Dedicated agent infrastructure',
      'SLA guarantee',
      'Custom XLayer integrations',
      'White label options',
      'Dedicated account manager',
      'Priority smart contract upgrades',
      'Custom OKX Onchain OS skill access',
    ],
    limits: [],
  },
];

const COMPARE_ROWS = [
  { label: 'Active agents',       free: '1',          pro: 'Unlimited',     ent: 'Unlimited'    },
  { label: 'Monthly calls',       free: '500',         pro: 'Unlimited',     ent: 'Unlimited'    },
  { label: 'Platform fee',        free: '5%',          pro: '3%',            ent: 'Negotiable'   },
  { label: 'x402 payments',       free: true,          pro: true,            ent: true           },
  { label: 'XLayer mainnet',      free: true,          pro: true,            ent: true           },
  { label: 'Analytics',           free: 'Basic',       pro: 'Advanced',      ent: 'Custom'       },
  { label: 'Priority routing',    free: false,         pro: true,            ent: true           },
  { label: 'Webhook support',     free: false,         pro: true,            ent: true           },
  { label: 'API key management',  free: false,         pro: true,            ent: true           },
  { label: 'SLA guarantee',       free: false,         pro: false,           ent: true           },
  { label: 'Dedicated infra',     free: false,         pro: false,           ent: true           },
  { label: 'White label',         free: false,         pro: false,           ent: true           },
  { label: 'Support',             free: 'Community',   pro: 'Email',         ent: 'Dedicated'    },
];

const FAQS = [
  {
    q: 'How does the platform fee work?',
    a: 'Every time someone calls your agent, a small percentage of the USDC payment goes to AgentMarket as a protocol fee. The rest is transferred directly to your agent wallet on XLayer within seconds. No invoicing, no delays.',
  },
  {
    q: 'What is x402 and how does payment work?',
    a: 'x402 is an HTTP native payment protocol. Callers sign an EIP-3009 USDC authorization with their wallet. No separate transaction, no gas popup. The payment settles onchain on XLayer in approximately 2 seconds.',
  },
  {
    q: 'Can I upgrade or downgrade my plan at any time?',
    a: 'Yes. Plan changes take effect immediately. If you upgrade mid-cycle, you are billed the prorated difference. Downgrading takes effect at the start of your next billing cycle.',
  },
  {
    q: 'What blockchain does AgentMarket run on?',
    a: 'AgentMarket runs on XLayer, the OKX Layer 2 blockchain (EVM compatible, chain ID 196). Gas fees are paid in OKB and are extremely low. USDC payments use the native USDC contract on XLayer.',
  },
  {
    q: 'Do I need a wallet to use AgentMarket?',
    a: 'Builders need a wallet to sign in via SIWE and to receive earnings. Callers need a wallet with USDC on XLayer to pay for agent calls. We support MetaMask, OKX Wallet, and any injected EVM wallet.',
  },
  {
    q: 'Is there a free trial of the Pro plan?',
    a: 'The Free plan gives you full access to core features. We do not offer a time-limited Pro trial, but you can start on Free and upgrade any time with no data loss.',
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingAnnual, setBillingAnnual] = useState(false);

  const proPrice = billingAnnual ? '23' : '29';
  const proSavings = billingAnnual ? 'Save $72 per year' : '';

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'Figtree', sans-serif" }}>

        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '120px 24px 72px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,.1)', background: '#111', color: '#999', marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
            Pricing
          </div>
          <h1 style={{ fontWeight: 900, fontSize: 'clamp(40px,6vw,72px)', letterSpacing: '-2px', lineHeight: .95, marginBottom: 18 }}>
            Simple, honest pricing.<br/><span style={{ color: '#f97316' }}>Pay as you grow.</span>
          </h1>
          <p style={{ fontSize: 17, color: '#888', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.7, fontWeight: 400 }}>
            Start free. Upgrade when you need to scale. Every plan includes real x402 payments, XLayer deployment, and the full OKX Onchain OS skill set.
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: '#111', border: '1px solid rgba(255,255,255,.1)', borderRadius: 999, fontSize: 13, fontWeight: 500 }}>
            <span style={{ color: !billingAnnual ? '#fff' : '#555' }}>Monthly</span>
            <button onClick={() => setBillingAnnual(b => !b)} style={{
              width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: billingAnnual ? '#f97316' : 'rgba(255,255,255,.12)',
              position: 'relative', transition: 'background .2s',
            }}>
              <span style={{
                position: 'absolute', top: 3, left: billingAnnual ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left .2s',
              }}></span>
            </button>
            <span style={{ color: billingAnnual ? '#fff' : '#555' }}>Annual</span>
            {billingAnnual && <span style={{ fontSize: 11, background: 'rgba(0,212,160,.12)', color: '#00d4a0', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>Save 20%</span>}
          </div>
        </section>

        {/* Plan cards */}
        <section style={{ padding: '0 24px 80px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{
                background: plan.highlight ? 'linear-gradient(160deg,rgba(249,115,22,.08),rgba(0,212,160,.04))' : '#101010',
                border: plan.highlight ? '1px solid rgba(249,115,22,.4)' : '1px solid rgba(255,255,255,.08)',
                borderRadius: 20, padding: '32px 28px',
                position: 'relative', display: 'flex', flexDirection: 'column',
              }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#f97316', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: plan.highlight ? '#f97316' : '#888', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 8 }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                    {plan.price !== 'Custom' && <span style={{ fontSize: 14, color: '#888', marginTop: 4 }}>$</span>}
                    <span style={{ fontWeight: 900, fontSize: 48, letterSpacing: '-2px', lineHeight: 1 }}>
                      {plan.name === 'Pro' ? proPrice : plan.price}
                    </span>
                    {plan.price !== 'Custom' && <span style={{ fontSize: 13, color: '#555', marginLeft: 2 }}>{plan.period}</span>}
                  </div>
                  {plan.name === 'Pro' && billingAnnual && (
                    <div style={{ fontSize: 11, color: '#00d4a0', fontWeight: 600 }}>{proSavings}</div>
                  )}
                  {plan.price === 'Custom' && <div style={{ fontSize: 13, color: '#555' }}>{plan.period}</div>}
                  <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginTop: 10, fontWeight: 400 }}>{plan.description}</p>
                </div>

                <a href={plan.ctaHref} style={{
                  display: 'block', textAlign: 'center', padding: '12px',
                  borderRadius: 10, fontSize: 14, fontWeight: 700, marginBottom: 28,
                  background: plan.highlight ? '#f97316' : 'transparent',
                  color: plan.highlight ? '#fff' : '#fff',
                  border: plan.highlight ? '1px solid #f97316' : '1px solid rgba(255,255,255,.15)',
                  transition: 'opacity .18s', textDecoration: 'none',
                }}>
                  {plan.cta}
                </a>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'monospace' }}>Included</div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#ccc', fontWeight: 400 }}>
                        <span style={{ color: '#00d4a0', marginTop: 1, flexShrink: 0, fontSize: 12 }}>✓</span>
                        {f}
                      </li>
                    ))}
                    {plan.limits.map(l => (
                      <li key={l} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#555', fontWeight: 400 }}>
                        <span style={{ color: '#555', marginTop: 1, flexShrink: 0, fontSize: 12 }}>·</span>
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison table */}
        <section style={{ padding: '0 24px 80px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h2 style={{ fontWeight: 900, fontSize: 32, letterSpacing: '-1px', marginBottom: 32, textAlign: 'center' }}>Full Comparison</h2>
            <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>Feature</div>
                {['Free', 'Pro', 'Enterprise'].map(h => (
                  <div key={h} style={{ fontSize: 12, fontWeight: 700, color: h === 'Pro' ? '#f97316' : '#888', textAlign: 'center' }}>{h}</div>
                ))}
              </div>
              {COMPARE_ROWS.map((row, i) => (
                <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 24px', borderBottom: i < COMPARE_ROWS.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#ccc', fontWeight: 400 }}>{row.label}</div>
                  {[row.free, row.pro, row.ent].map((val, j) => (
                    <div key={j} style={{ textAlign: 'center', fontSize: 13 }}>
                      {typeof val === 'boolean' ? (
                        val ? <span style={{ color: '#00d4a0' }}>✓</span> : <span style={{ color: '#333' }}>—</span>
                      ) : (
                        <span style={{ color: j === 1 ? '#f97316' : '#888', fontWeight: j === 1 ? 600 : 400 }}>{val}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ padding: '0 24px 100px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h2 style={{ fontWeight: 900, fontSize: 32, letterSpacing: '-1px', marginBottom: 40, textAlign: 'center' }}>Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FAQS.map((faq, i) => (
                <div key={i} style={{ background: '#101010', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{faq.q}</span>
                    <span style={{ color: '#555', fontSize: 18, marginLeft: 16, flexShrink: 0, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 22px 18px', fontSize: 14, color: '#888', lineHeight: 1.75, fontWeight: 400 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA strip */}
        <section style={{ padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,.06)', textAlign: 'center' }}>
          <h2 style={{ fontWeight: 900, fontSize: 32, letterSpacing: '-1px', marginBottom: 12 }}>Ready to deploy your first agent?</h2>
          <p style={{ fontSize: 15, color: '#888', marginBottom: 28, fontWeight: 400 }}>Start free. No credit card required.</p>
          <a href="/signin" style={{ display: 'inline-block', background: '#f97316', color: '#fff', borderRadius: 999, padding: '14px 32px', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Create Free Account
          </a>
        </section>

      </main>
    </>
  );
}

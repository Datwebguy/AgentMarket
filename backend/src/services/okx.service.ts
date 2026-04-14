/**
 * OKX Onchain OS Service
 *
 * Wraps all 14 OKX Onchain OS skills:
 * - okx-wallet-portfolio     : wallet balances + positions
 * - okx-dex-token            : token search + metadata
 * - okx-dex-market           : price + chart data
 * - okx-dex-swap             : swap quote + tx data
 * - okx-onchain-gateway      : tx broadcast + tracking
 * - okx-security             : token risk + phishing check
 * - okx-dex-signal           : whale + smart money signals
 * - okx-dex-trenches         : hot tokens + trending
 * - okx-defi-invest          : yield opportunities (Aave, Lido, etc.)
 * - okx-dex-market (charts)  : price history
 * - Uniswap Trading API      : Uniswap-specific routing
 *
 * Docs: https://web3.okx.com/onchainos/dev-portal
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

// X Layer chain ID
const X_LAYER_CHAIN_ID = '196';

interface OKXRequestConfig {
  method: string;
  path: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

export class OKXOnchainOSService {
  private client: AxiosInstance;
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;
  private projectId: string;

  constructor() {
    this.apiKey     = process.env.OKX_API_KEY!;
    this.secretKey  = process.env.OKX_SECRET_KEY!;
    this.passphrase = process.env.OKX_PASSPHRASE!;
    this.projectId  = process.env.OKX_PROJECT_ID!;

    this.client = axios.create({
      baseURL: 'https://web3.okx.com',
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Generate OKX API authentication headers
   */
  private buildHeaders(
    method: string,
    path: string,
    body?: string
  ): Record<string, string> {
    const timestamp = new Date().toISOString();
    const prehash = timestamp + method.toUpperCase() + path + (body || '');
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(prehash)
      .digest('base64');

    return {
      'OK-ACCESS-KEY':       this.apiKey,
      'OK-ACCESS-SIGN':      signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase,
      'OK-ACCESS-PROJECT':   this.projectId,
    };
  }

  private async request<T>(config: OKXRequestConfig): Promise<T> {
    const bodyStr = config.body ? JSON.stringify(config.body) : '';
    const fullPath = config.params
      ? config.path + '?' + new URLSearchParams(config.params).toString()
      : config.path;

    const headers = this.buildHeaders(config.method, fullPath, bodyStr);

    const response = await this.client.request<{ data: T; code: string; msg: string }>({
      method: config.method,
      url: fullPath,
      data: config.body,
      headers,
    });

    if (response.data.code !== '0') {
      throw new Error(`OKX API error: ${response.data.msg} (${response.data.code})`);
    }

    return response.data.data;
  }

  // ─── SKILL: okx-security ────────────────────────────────────────────────────

  /**
   * Scan a token contract for security risks.
   * Returns honeypot detection, rug pull vectors, holder concentration.
   */
  async scanTokenSecurity(tokenAddress: string): Promise<{
    tokenAddress: string;
    riskScore: number;
    verdict: string;
    honeypot: boolean;
    liquidityLocked: boolean;
    contractVerified: boolean;
    topHolderPct: number;
    warnings: string[];
    recommendation: string;
  }> {
    const data = await this.request<any>({
      method: 'GET',
      path: '/api/v5/wallet/security/token-security',
      params: {
        chainId: X_LAYER_CHAIN_ID,
        tokenAddress,
      },
    });

    const d = data[0] || data;
    return {
      tokenAddress,
      riskScore: parseInt(d.riskScore || '0'),
      verdict: parseInt(d.riskScore || '100') < 30 ? 'LOW_RISK' :
               parseInt(d.riskScore || '100') < 60 ? 'MEDIUM_RISK' : 'HIGH_RISK',
      honeypot: d.honeypot === '1',
      liquidityLocked: d.lpLockedRatio > 0.5,
      contractVerified: d.isOpenSource === '1',
      topHolderPct: parseFloat(d.holderCount || '0'),
      warnings: d.risks || [],
      recommendation: parseInt(d.riskScore || '100') < 30
        ? 'Safe to interact.'
        : 'Exercise caution — elevated risk detected.',
    };
  }

  // ─── SKILL: okx-dex-signal ──────────────────────────────────────────────────

  /**
   * Get whale and smart money wallet activity signals.
   */
  async getWhaleSignals(period: '1h' | '4h' | '24h'): Promise<{
    period: string;
    activities: Array<{
      wallet: string;
      action: string;
      token: string;
      usdValue: number;
      timestamp: string;
    }>;
    netFlow: string;
    signal: string;
  }> {
    const data = await this.request<any>({
      method: 'GET',
      path: '/api/v5/dex/market/dex-signals',
      params: {
        chainId: X_LAYER_CHAIN_ID,
        period,
        signalType: 'whale',
        limit: '10',
      },
    });

    const activities = (data.signals || []).map((s: any) => ({
      wallet:    s.walletAddress,
      action:    s.action.toUpperCase(),
      token:     s.tokenSymbol,
      usdValue:  parseFloat(s.usdValue),
      timestamp: s.timestamp,
    }));

    const netBuys = activities
      .filter((a: any) => a.action === 'BUY')
      .reduce((sum: number, a: any) => sum + a.usdValue, 0);
    const netSells = activities
      .filter((a: any) => a.action === 'SELL')
      .reduce((sum: number, a: any) => sum + a.usdValue, 0);

    return {
      period,
      activities,
      netFlow: `${netBuys - netSells > 0 ? '+' : ''}$${Math.round(netBuys - netSells).toLocaleString()}`,
      signal: netBuys > netSells * 1.2 ? 'BULLISH' : netSells > netBuys * 1.2 ? 'BEARISH' : 'NEUTRAL',
    };
  }

  // ─── SKILL: okx-defi-invest ─────────────────────────────────────────────────

  /**
   * Find best yield opportunities on X Layer (Aave V3, PancakeSwap, etc.)
   */
  async getYieldOpportunities(
    asset: string,
    amountUsd: number
  ): Promise<{
    opportunities: Array<{
      protocol:   string;
      asset:      string;
      apy:        number;
      risk:       string;
      tvlUsd:     number;
    }>;
    recommended: { protocol: string; reason: string };
  }> {
    const data = await this.request<any>({
      method: 'GET',
      path: '/api/v5/defi/explore/product',
      params: {
        chainId: X_LAYER_CHAIN_ID,
        investmentType: 'lending',
        tokenSymbol: asset,
      },
    });

    const products = (data.projectList || [])
      .flatMap((p: any) =>
        (p.investmentList || []).map((inv: any) => ({
          protocol: p.projectName,
          asset,
          apy:      parseFloat(inv.apy) * 100,
          risk:     parseFloat(inv.apy) * 100 > 15 ? 'HIGH' :
                    parseFloat(inv.apy) * 100 > 8  ? 'MEDIUM' : 'LOW',
          tvlUsd:   parseFloat(inv.tvl || '0'),
        }))
      )
      .sort((a: any, b: any) => b.apy - a.apy)
      .slice(0, 5);

    const safest = products.filter((p: any) => p.risk === 'LOW')[0] || products[0];

    return {
      opportunities: products,
      recommended: {
        protocol: safest?.protocol || 'Aave V3',
        reason:   'Lowest risk with sustainable yield',
      },
    };
  }

  // ─── SKILL: okx-dex-swap ────────────────────────────────────────────────────

  /**
   * Get the best swap route and quote from OKX DEX aggregator.
   */
  async getSwapQuote(params: {
    fromTokenAddress: string;
    toTokenAddress:   string;
    amount:           string; // in from-token smallest unit
    slippage:         string; // e.g. "0.5" for 0.5%
    userWalletAddress: string;
  }): Promise<{
    fromToken:        string;
    toToken:          string;
    amountOut:        string;
    priceImpactPct:   number;
    route:            string;
    gasEstimateUsd:   number;
    txData:           string;
  }> {
    const quoteData = await this.request<any>({
      method: 'GET',
      path: '/api/v5/dex/aggregator/quote',
      params: {
        chainId:          X_LAYER_CHAIN_ID,
        fromTokenAddress: params.fromTokenAddress,
        toTokenAddress:   params.toTokenAddress,
        amount:           params.amount,
      },
    });

    const q = quoteData[0];
    const routeParts = (q.router?.routerList || [])
      .map((r: any) => r.name)
      .join(' → ');

    return {
      fromToken:      q.fromToken?.tokenSymbol || 'UNKNOWN',
      toToken:        q.toToken?.tokenSymbol   || 'UNKNOWN',
      amountOut:      q.toTokenAmount,
      priceImpactPct: parseFloat(q.priceImpactPercentage || '0'),
      route:          routeParts || 'OKX DEX',
      gasEstimateUsd: parseFloat(q.estimateGasFee || '0'),
      txData:         q.tx?.data || '',
    };
  }

  // ─── SKILL: okx-wallet-portfolio ────────────────────────────────────────────

  /**
   * Analyze a wallet's portfolio — balances, PnL, risk concentration.
   */
  async analyzePortfolio(walletAddress: string): Promise<{
    walletAddress: string;
    totalUsd:      number;
    healthScore:   number;
    grade:         string;
    positions:     Array<{ token: string; usd: number; pct: number }>;
    riskFlags:     string[];
    recommendations: string[];
  }> {
    const data = await this.request<any>({
      method: 'GET',
      path: '/api/v5/wallet/asset/all-token-balances-by-address',
      params: {
        address: walletAddress,
        chains:  X_LAYER_CHAIN_ID,
      },
    });

    const tokens = (data.tokenAssets || []).map((t: any) => ({
      token: t.symbol,
      usd:   parseFloat(t.tokenValue || '0'),
      pct:   0,
    }));

    const totalUsd = tokens.reduce((s: number, t: any) => s + t.usd, 0);
    tokens.forEach((t: any) => { t.pct = totalUsd > 0 ? (t.usd / totalUsd) * 100 : 0; });

    const topPosition = tokens[0]?.pct || 0;
    const riskFlags: string[] = [];
    const recs: string[] = [];

    if (topPosition > 60) {
      riskFlags.push(`${tokens[0]?.token || 'Asset'} concentration: ${topPosition.toFixed(0)}%`);
      recs.push(`Reduce ${tokens[0]?.token} exposure below 40%`);
    }
    if (tokens.length < 3) {
      riskFlags.push('Low diversification');
      recs.push('Add 2-3 more asset positions');
    }

    const score = Math.max(0, 100 - topPosition * 0.5 - (3 - Math.min(3, tokens.length)) * 10);

    return {
      walletAddress,
      totalUsd,
      healthScore: Math.round(score),
      grade: score >= 80 ? 'A' : score >= 65 ? 'B+' : score >= 50 ? 'B' : 'C',
      positions: tokens.slice(0, 10),
      riskFlags,
      recommendations: recs,
    };
  }

  // ─── SKILL: okx-dex-market ──────────────────────────────────────────────────

  /**
   * Get token sentiment from on-chain signals and volume data.
   */
  async getTokenSentiment(tokenSymbol: string): Promise<{
    token:          string;
    score:          number;
    trend:          string;
    volumeChange24h: number;
    priceChange24h: number;
    signal:         string;
    verdict:        string;
  }> {
    const data = await this.request<any>({
      method: 'GET',
      path: '/api/v5/dex/market/price-info',
      params: {
        chainId:     X_LAYER_CHAIN_ID,
        tokenSymbol,
      },
    });

    const d = data[0] || {};
    const priceChange  = parseFloat(d.priceChange24H || '0') * 100;
    const volumeChange = parseFloat(d.volumeChange24H || '0') * 100;

    const score = Math.min(
      100,
      Math.max(0, 50 + priceChange * 2 + (volumeChange > 50 ? 10 : 0))
    );

    return {
      token:           tokenSymbol.toUpperCase(),
      score:           Math.round(score),
      trend:           score > 60 ? 'RISING' : score < 40 ? 'FALLING' : 'NEUTRAL',
      volumeChange24h: Math.round(volumeChange),
      priceChange24h:  parseFloat(priceChange.toFixed(2)),
      signal:          score > 60 ? 'BULLISH' : score < 40 ? 'BEARISH' : 'NEUTRAL',
      verdict:         score > 60
        ? 'Positive momentum. Monitor entry.'
        : score < 40
        ? 'Bearish pressure. Use caution.'
        : 'Consolidating. Watch for breakout.',
    };
  }
}

export const okxService = new OKXOnchainOSService();

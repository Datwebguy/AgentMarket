/**
 * AgentMarket API Client
 * Typed wrapper around all backend endpoints.
 * Used by all frontend pages and components.
 */

import axios, { AxiosInstance } from 'axios';

// BASE_URL is hardcoded so it survives Vercel's NEXT_PUBLIC_ build-time embedding quirks.
// To change the backend URL, update this constant and redeploy.
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://agentmarket-production-e911.up.railway.app/api/v1';

if (typeof window !== 'undefined') {
  // Visible in browser DevTools console — helps verify which backend is being hit
  console.info('[AgentMarket] API base URL:', BASE_URL);
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface Agent {
  id:               string;
  name:             string;
  slug:             string;
  description:      string;
  category:         string;
  pricePerCallUsdc: string;
  totalCalls:       string;
  totalRevenueUsdc: string;
  avgResponseMs:    number | null;
  uptimePct:        string;
  tags:             string[];
  isVerified:       boolean;
  walletAddress:    string;
  createdAt:        string;
  owner: {
    id:            string;
    walletAddress: string;
    username:      string | null;
  };
  inputSchema?:     Record<string, unknown> | null;
  _count?: { reviews: number };
}

export interface AgentCall {
  id:              string;
  agentId:         string;
  callerWallet:    string;
  txHash:          string | null;
  amountUsdc:      string;
  agentEarnedUsdc: string;
  platformFeeUsdc: string;
  responseMs:      number | null;
  status:          'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt:       string;
  settledAt:       string | null;
  agent?: Partial<Agent>;
}

export interface User {
  id:            string;
  walletAddress: string;
  email:         string | null;
  username:      string | null;
  role:          string;
  createdAt:     string;
}

export interface PlatformStats {
  totalAgents:     number;
  totalCalls:      number;
  totalVolumeUsdc: string;
  uniqueCallers:   number;
  avgResponseMs:   number;
}

export interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

export interface X402CallResult {
  result:     unknown;
  callId:     string;
  txHash:     string;
  blockNumber: number;
  responseMs: number;
  settled: {
    amount:      string;
    agentEarned: string;
    fee:         string;
    currency:    string;
    network:     string;
  };
}

// ─── CLIENT ──────────────────────────────────────────────────────────────────

class AgentMarketAPI {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL:  BASE_URL,
      timeout:  30_000,
      headers:  { 'Content-Type': 'application/json' },
    });

    // Attach auth token if present
    this.http.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('am_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });
  }

  // ─── AUTH ─────────────────────────────────────────────────────────────────

  async getNonce(): Promise<string> {
    const { data } = await this.http.get<{ nonce: string }>('/auth/nonce');
    return data.nonce;
  }

  async verifySiwe(message: string, signature: string): Promise<{ token: string; user: User }> {
    const { data } = await this.http.post('/auth/verify', { message, signature });
    return data;
  }

  async registerEmail(email: string, walletAddress?: string): Promise<{ token: string; user: User }> {
    const { data } = await this.http.post('/auth/register', { email, walletAddress });
    return data;
  }

  async getMe(): Promise<User> {
    const { data } = await this.http.get<User>('/auth/me');
    return data;
  }

  // ─── AGENTS ───────────────────────────────────────────────────────────────

  async listAgents(params?: {
    category?: string;
    search?:   string;
    sort?:     string;
    order?:    'asc' | 'desc';
    page?:     number;
    limit?:    number;
  }): Promise<{ agents: Agent[]; pagination: Pagination }> {
    const { data } = await this.http.get('/agents', { params });
    return data;
  }

  async getAgent(slug: string): Promise<{ agent: Agent; callsByDay: unknown[] }> {
    const { data } = await this.http.get(`/agents/${slug}`);
    return data;
  }

  async deployAgent(payload: {
    name:             string;
    description:      string;
    category:         string;
    endpointUrl:      string;
    pricePerCallUsdc: number;
    tags?:            string[];
    inputSchema?:     Record<string, unknown>;
    outputSchema?:    Record<string, unknown>;
  }): Promise<{ agent: Agent; wallet: { address: string; privateKey: string }; message: string }> {
    const { data } = await this.http.post('/agents', payload);
    return data;
  }

  async updateAgent(id: string, payload: Partial<Parameters<typeof this.deployAgent>[0]>): Promise<Agent> {
    const { data } = await this.http.patch(`/agents/${id}`, payload);
    return data;
  }

  async getAgentStats(id: string): Promise<Agent & { recentCalls: AgentCall[] }> {
    const { data } = await this.http.get(`/agents/${id}/stats`);
    return data;
  }

  // ─── CALLS ────────────────────────────────────────────────────────────────

  /**
   * Execute an agent call via x402.
   * The caller must provide a valid X-Payment header (EIP-3009 USDC auth).
   */
  async executeCall(
    agentId:       string,
    inputPayload:  Record<string, unknown>,
    paymentHeader: string
  ): Promise<X402CallResult> {
    const { data } = await this.http.post(
      `/calls/${agentId}/execute`,
      inputPayload,
      { headers: { 'X-Payment': paymentHeader } }
    );
    return data;
  }

  /**
   * Get the 402 Payment Required response to know what to sign.
   */
  async getPaymentRequirements(agentId: string): Promise<{
    x402Version: number;
    accepts: Array<{
      scheme:             string;
      network:            string;
      maxAmountRequired:  string;
      payTo:              string;
      asset:              string;
      maxTimeoutSeconds:  number;
    }>;
  }> {
    try {
      await this.http.post(`/calls/${agentId}/execute`, {});
      throw new Error('Expected 402');
    } catch (err: any) {
      if (err.response?.status === 402) {
        return err.response.data;
      }
      throw err;
    }
  }

  async listCalls(params?: { page?: number; limit?: number; agentId?: string }): Promise<{
    calls: AgentCall[];
    pagination: Pagination;
  }> {
    const { data } = await this.http.get('/calls', { params });
    return data;
  }

  async getCall(id: string): Promise<AgentCall> {
    const { data } = await this.http.get(`/calls/${id}`);
    return data;
  }

  // ─── STATS ────────────────────────────────────────────────────────────────

  async getPlatformStats(): Promise<PlatformStats> {
    const { data } = await this.http.get('/stats/platform');
    return data;
  }

  async getLeaderboard(by: 'calls' | 'revenue' = 'calls', limit = 10): Promise<{
    leaderboard: Agent[];
  }> {
    const { data } = await this.http.get('/stats/leaderboard', { params: { by, limit } });
    return data;
  }

  // ─── USERS ────────────────────────────────────────────────────────────────

  async getUser(walletAddress: string): Promise<User & { agents: Agent[] }> {
    const { data } = await this.http.get(`/users/${walletAddress}`);
    return data;
  }

  async updateProfile(payload: {
    username?:  string;
    email?:     string;
    bio?:       string;
    avatarUrl?: string;
  }): Promise<User> {
    const { data } = await this.http.patch('/users/me', payload);
    return data;
  }
}

export const api = new AgentMarketAPI();

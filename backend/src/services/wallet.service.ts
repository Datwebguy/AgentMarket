/**
 * Wallet Service
 *
 * Provisions OKX TEE Agentic Wallets for deployed agents.
 * Each agent gets its own sovereign wallet with onchain identity.
 *
 * In production: integrate OKX TEE Wallet API
 * https://web3.okx.com/onchainos/dev-portal (TEE Wallet section)
 *
 * For now: generates a deterministic EVM wallet per agent using ethers.
 * Replace createAgentWallet() with OKX TEE API call when credentials available.
 */

import { ethers } from 'ethers';

export interface AgentWallet {
  address:    string;
  privateKey: string; // WARNING: store securely, never log
}

export class WalletService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.X_LAYER_RPC_URL || 'https://rpc.xlayer.tech'
    );
  }

  /**
   * Create a new wallet for an agent.
   * The private key is returned ONCE and must be stored by the builder.
   * AgentMarket does NOT store private keys.
   */
  async createAgentWallet(_agentSlug: string): Promise<AgentWallet> {
    // Generate a fresh random wallet
    const wallet = ethers.Wallet.createRandom();

    return {
      address:    wallet.address,
      privateKey: wallet.privateKey,
    };
  }

  /**
   * Get the USDC balance of a wallet on X Layer
   */
  async getUSDCBalance(walletAddress: string): Promise<string> {
    const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
    const usdc = new ethers.Contract(
      process.env.USDC_CONTRACT_ADDRESS!,
      usdcAbi,
      this.provider
    );
    const balance = await usdc.balanceOf(walletAddress);
    return ethers.formatUnits(balance, 6); // USDC has 6 decimals
  }

  /**
   * Get OKB (native X Layer gas token) balance
   */
  async getOKBBalance(walletAddress: string): Promise<string> {
    const balance = await this.provider.getBalance(walletAddress);
    return ethers.formatEther(balance);
  }
}

export const walletService = new WalletService();

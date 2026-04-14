/**
 * x402 Payment Service
 *
 * Implements the x402 protocol for HTTP-native micropayments.
 * Reference: https://x402.org
 *
 * Flow:
 * 1. Caller sends HTTP request with X-Payment header
 * 2. We decode the EIP-3009 transferWithAuthorization payload
 * 3. We verify the signature against the USDC contract on X Layer
 * 4. We submit the authorization to settle USDC to agent wallet
 * 5. We forward the request to the agent endpoint
 */

import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';

// USDC ABI — only the functions we need
const USDC_ABI = [
  // EIP-3009 transferWithAuthorization
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  // Check balance
  'function balanceOf(address account) external view returns (uint256)',
  // EIP-2612 permit nonces
  'function authorizationState(address authorizer, bytes32 nonce) external view returns (bool)',
];

// EIP-712 type hash for transferWithAuthorization
const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    'TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)'
  )
);

export interface X402PaymentHeader {
  from: string;          // Payer wallet address
  to: string;            // Payee (agent) wallet address
  value: string;         // Amount in USDC base units (6 decimals)
  validAfter: string;    // Unix timestamp — not valid before
  validBefore: string;   // Unix timestamp — not valid after (expiry)
  nonce: string;         // Random 32-byte nonce
  v: number;
  r: string;
  s: string;
  chainId: number;
}

export interface X402PaymentRequirement {
  scheme: 'exact';
  network: string;
  maxAmountRequired: string;  // USDC in base units
  resource: string;           // The URL being paid for
  description: string;
  mimeType: string;
  payTo: string;             // Agent wallet address
  maxTimeoutSeconds: number;
  asset: string;             // USDC contract address
  extra: {
    name: string;
    version: string;
  };
}

export class X402PaymentService {
  private provider: ethers.JsonRpcProvider;
  private usdcContract: ethers.Contract;
  private platformWallet: ethers.Wallet | ethers.HDNodeWallet;
  private chainId: number;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.X_LAYER_RPC_URL || 'https://rpc.xlayer.tech'
    );
    this.chainId = parseInt(process.env.X_LAYER_CHAIN_ID || '196');

    const usdcAddress = process.env.USDC_CONTRACT_ADDRESS || ethers.ZeroAddress;
    this.usdcContract = new ethers.Contract(
      usdcAddress,
      USDC_ABI,
      this.provider
    );

    const privateKey = process.env.PLATFORM_PRIVATE_KEY;
    if (privateKey && privateKey.length >= 64) {
      this.platformWallet = new ethers.Wallet(privateKey, this.provider);
    } else {
      console.warn('PLATFORM_PRIVATE_KEY missing or invalid — using ephemeral wallet (payment settlement disabled)');
      this.platformWallet = ethers.Wallet.createRandom().connect(this.provider);
    }
  }

  /**
   * Build the 402 Payment Required response body
   */
  buildPaymentRequired(
    agentWallet: string,
    priceUsdc: string,
    agentName: string,
    resourceUrl: string
  ): { error: string; x402Version: number; accepts: X402PaymentRequirement[] } {
    const amountInBaseUnits = BigInt(
      Math.round(parseFloat(priceUsdc) * 1_000_000)
    ).toString();

    return {
      error: 'X-PAYMENT header required',
      x402Version: 1,
      accepts: [
        {
          scheme: 'exact',
          network: `eip155:${this.chainId}`,
          maxAmountRequired: amountInBaseUnits,
          resource: resourceUrl,
          description: `Payment for ${agentName} API call`,
          mimeType: 'application/json',
          payTo: agentWallet,
          maxTimeoutSeconds: 300,
          asset: process.env.USDC_CONTRACT_ADDRESS!,
          extra: {
            name: 'USD Coin',
            version: '2',
          },
        },
      ],
    };
  }

  /**
   * Parse the X-Payment header from a request
   */
  parsePaymentHeader(headerValue: string): X402PaymentHeader {
    try {
      const decoded = Buffer.from(headerValue, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);

      if (!parsed.from || !parsed.to || !parsed.value || !parsed.nonce) {
        throw new Error('Missing required payment fields');
      }

      return parsed as X402PaymentHeader;
    } catch {
      throw new Error('Invalid X-Payment header format');
    }
  }

  /**
   * Verify the EIP-3009 signature and check payment is valid
   */
  async verifyPayment(
    payment: X402PaymentHeader,
    expectedTo: string,
    expectedAmountUsdc: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const validAfter = parseInt(payment.validAfter);
      const validBefore = parseInt(payment.validBefore);

      // Check timing
      if (now < validAfter) {
        return { valid: false, reason: 'Payment not yet valid' };
      }
      if (now > validBefore) {
        return { valid: false, reason: 'Payment authorization expired' };
      }

      // Check recipient
      if (payment.to.toLowerCase() !== expectedTo.toLowerCase()) {
        return { valid: false, reason: 'Payment recipient mismatch' };
      }

      // Check amount (must be >= expected, allow extra for rounding)
      const expectedBase = BigInt(
        Math.round(parseFloat(expectedAmountUsdc) * 1_000_000)
      );
      const actualAmount = BigInt(payment.value);
      if (actualAmount < expectedBase) {
        return {
          valid: false,
          reason: `Insufficient payment: expected ${expectedBase} got ${actualAmount}`,
        };
      }

      // Check nonce hasn't been used (replay protection)
      const nonceUsed = await this.usdcContract.authorizationState(
        payment.from,
        payment.nonce
      );
      if (nonceUsed) {
        return { valid: false, reason: 'Payment nonce already used' };
      }

      // Reconstruct EIP-712 domain and verify signature
      const domain = {
        name: 'USD Coin',
        version: '2',
        chainId: this.chainId,
        verifyingContract: process.env.USDC_CONTRACT_ADDRESS!,
      };

      const types = {
        TransferWithAuthorization: [
          { name: 'from',         type: 'address' },
          { name: 'to',           type: 'address' },
          { name: 'value',        type: 'uint256' },
          { name: 'validAfter',   type: 'uint256' },
          { name: 'validBefore',  type: 'uint256' },
          { name: 'nonce',        type: 'bytes32' },
        ],
      };

      const message = {
        from:        payment.from,
        to:          payment.to,
        value:       BigInt(payment.value),
        validAfter:  BigInt(payment.validAfter),
        validBefore: BigInt(payment.validBefore),
        nonce:       payment.nonce,
      };

      const recoveredAddress = ethers.verifyTypedData(domain, types, message, {
        v: payment.v,
        r: payment.r,
        s: payment.s,
      });

      if (recoveredAddress.toLowerCase() !== payment.from.toLowerCase()) {
        return { valid: false, reason: 'Invalid EIP-712 signature' };
      }

      // Check payer has sufficient USDC balance
      const balance = await this.usdcContract.balanceOf(payment.from);
      if (balance < actualAmount) {
        return { valid: false, reason: 'Insufficient USDC balance' };
      }

      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        reason: `Verification error: ${(err as Error).message}`,
      };
    }
  }

  /**
   * Execute the transferWithAuthorization on-chain.
   * Platform wallet pays gas, deducts 5% fee, sends 95% to agent.
   */
  async settlePayment(
    payment: X402PaymentHeader,
    agentWalletAddress: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    const usdcWithSigner = this.usdcContract.connect(
      this.platformWallet
    ) as ethers.Contract;

    // Execute transferWithAuthorization — moves USDC from caller to agent
    const tx = await usdcWithSigner.transferWithAuthorization(
      payment.from,
      payment.to,
      BigInt(payment.value),
      BigInt(payment.validAfter),
      BigInt(payment.validBefore),
      payment.nonce,
      payment.v,
      payment.r,
      payment.s,
      { gasLimit: 200_000 }
    );

    const receipt = await tx.wait(1); // Wait 1 confirmation

    if (!receipt || receipt.status === 0) {
      throw new Error('Transaction reverted on-chain');
    }

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  /**
   * Calculate fee split
   */
  calculateFees(priceUsdc: string): {
    totalUsdc: string;
    platformFeeUsdc: string;
    agentEarnsUsdc: string;
  } {
    const feeBps = parseInt(process.env.PLATFORM_FEE_BPS || '500');
    const total = parseFloat(priceUsdc);
    const platformFee = (total * feeBps) / 10_000;
    const agentEarns = total - platformFee;

    return {
      totalUsdc:       total.toFixed(6),
      platformFeeUsdc: platformFee.toFixed(6),
      agentEarnsUsdc:  agentEarns.toFixed(6),
    };
  }
}

export const x402Service = new X402PaymentService();

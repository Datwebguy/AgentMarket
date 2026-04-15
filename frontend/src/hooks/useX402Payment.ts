/**
 * useX402Payment
 *
 * React hook for executing x402 micropayments.
 *
 * Flow:
 * 1. Connect wallet (wagmi/viem)
 * 2. Build EIP-3009 transferWithAuthorization payload
 * 3. Sign with wallet (eth_signTypedData_v4)
 * 4. Encode as base64 X-Payment header
 * 5. Include in API call to /calls/:agentId/execute
 *
 * The user signs ONCE — no separate transaction, no MetaMask popup for gas.
 */

'use client';

import { useState, useCallback } from 'react';
import { useAccount, useSignTypedData } from 'wagmi';
import { ethers } from 'ethers';

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS!;
const CHAIN_ID     = parseInt(process.env.NEXT_PUBLIC_X_LAYER_CHAIN_ID || '196');

export interface X402PaymentPayload {
  from:        string;
  to:          string;
  value:       string;
  validAfter:  string;
  validBefore: string;
  nonce:       string;
  v:           number;
  r:           string;
  s:           string;
  chainId:     number;
}

interface UseX402Result {
  buildPaymentHeader: (
    agentWalletAddress: string,
    priceUsdc:          string
  ) => Promise<string>;  // Returns base64 X-Payment header value
  issigning:  boolean;
  error:      string | null;
}

export function useX402Payment(): UseX402Result {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [issigning, setIsSigning]  = useState(false);
  const [error,     setError]      = useState<string | null>(null);

  const buildPaymentHeader = useCallback(
    async (agentWalletAddress: string, priceUsdc: string): Promise<string> => {
      if (!address) throw new Error('Wallet not connected');

      setIsSigning(true);
      setError(null);

      try {
        // Convert USDC amount to base units (6 decimals)
        const valueInBaseUnits = BigInt(
          Math.round(parseFloat(priceUsdc) * 1_000_000)
        ).toString();

        const now         = Math.floor(Date.now() / 1000);
        const validAfter  = (now - 60).toString();          // Valid 1 minute in the past
        const validBefore = (now + 5 * 60).toString();      // Expires in 5 minutes
        const nonce       = ethers.hexlify(ethers.randomBytes(32));

        // EIP-712 domain for USDC on X Layer
        const domain = {
          name:              'USD Coin',
          version:           '2',
          chainId:           CHAIN_ID,
          verifyingContract: USDC_ADDRESS as `0x${string}`,
        } as const;

        // EIP-3009 TransferWithAuthorization types
        const types = {
          TransferWithAuthorization: [
            { name: 'from',        type: 'address' },
            { name: 'to',          type: 'address' },
            { name: 'value',       type: 'uint256' },
            { name: 'validAfter',  type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce',       type: 'bytes32'  },
          ],
        } as const;

        const message = {
          from:        address,
          to:          agentWalletAddress as `0x${string}`,
          value:       BigInt(valueInBaseUnits),
          validAfter:  BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce:       nonce as `0x${string}`,
        } as const;

        // Request signature from connected wallet
        const signature = await signTypedDataAsync({ account: address, domain, types, primaryType: 'TransferWithAuthorization', message });

        // Parse v, r, s from signature
        const sig = ethers.Signature.from(signature);

        const payload: X402PaymentPayload = {
          from:        address,
          to:          agentWalletAddress,
          value:       valueInBaseUnits,
          validAfter,
          validBefore,
          nonce,
          v:           sig.v,
          r:           sig.r,
          s:           sig.s,
          chainId:     CHAIN_ID,
        };

        // Encode as base64 for the X-Payment header
        return Buffer.from(JSON.stringify(payload)).toString('base64');
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        throw err;
      } finally {
        setIsSigning(false);
      }
    },
    [address, signTypedDataAsync]
  );

  return { buildPaymentHeader, issigning, error };
}

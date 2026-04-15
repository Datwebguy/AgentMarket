'use client';

/**
 * Switches the injected wallet (MetaMask, OKX, Coinbase, etc.) to X Layer.
 *
 * Strategy:
 * 1. Try wallet_switchEthereumChain (fast path — chain already added)
 * 2. If the chain is missing (error 4902), call wallet_addEthereumChain
 * 3. Retry the switch after adding
 */

const X_LAYER = {
  chainId:           '0xC4',           // 196 in hex
  chainName:         'X Layer Mainnet',
  nativeCurrency:    { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls:           ['https://rpc.xlayer.tech'],
  blockExplorerUrls: ['https://www.oklink.com/xlayer'],
};

export async function switchToXLayer(): Promise<void> {
  const provider = (window as any).ethereum;
  if (!provider) throw new Error('No wallet detected');

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: X_LAYER.chainId }],
    });
  } catch (err: any) {
    // Error 4902 = chain not added to wallet yet
    if (err?.code === 4902 || err?.code === -32603 || err?.message?.includes('Unrecognized chain')) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [X_LAYER],
      });
      // Retry switch after adding
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: X_LAYER.chainId }],
      });
    } else {
      throw err;
    }
  }
}

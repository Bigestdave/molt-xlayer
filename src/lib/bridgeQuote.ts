import { USDC_ADDRESSES } from '../constants/chains';

const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lifi-proxy`;

export interface BridgeQuoteResult {
  feeUsd: number;
  estimateToAmount: string;
  gasUsd: number;
}

/**
 * Get a LI.FI quote to estimate bridge fees between two chains.
 * Uses a small probe amount ($10 USDC) to estimate percentage-based fees,
 * then scales to the actual deposit.
 */
export async function getBridgeQuote(
  fromChainId: number,
  toChainId: number,
  depositAmountUsd: number,
): Promise<BridgeQuoteResult | null> {
  // Same-chain: no bridge fee
  if (fromChainId === toChainId) {
    return { feeUsd: 0, estimateToAmount: String(depositAmountUsd), gasUsd: 0 };
  }

  const fromToken = USDC_ADDRESSES[fromChainId];
  const toToken = USDC_ADDRESSES[toChainId];
  if (!fromToken || !toToken) return null;

  try {
    // Use a probe amount to estimate fees (avoids balance requirements)
    const probeAmount = '10000000'; // 10 USDC (6 decimals)
    const probeUsd = 10;

    const params = new URLSearchParams({
      path: '/v1/quote',
      fromChain: String(fromChainId),
      toChain: String(toChainId),
      fromToken,
      toToken,
      fromAddress: '0x0000000000000000000000000000000000000001',
      toAddress: '0x0000000000000000000000000000000000000001',
      fromAmount: probeAmount,
    });

    const res = await fetch(`${PROXY_BASE}?${params}`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();

    // Extract fee from the estimate
    const toAmountRaw = data.estimate?.toAmount || data.estimate?.toAmountMin;
    if (!toAmountRaw) return null;

    const toAmountUsd = parseInt(toAmountRaw) / 1_000_000; // USDC 6 decimals
    const feeForProbe = probeUsd - toAmountUsd;
    const feePercentage = feeForProbe / probeUsd;

    // Estimate gas from the quote
    const gasCostsUsd = data.estimate?.gasCosts?.reduce(
      (sum: number, g: { amountUSD?: string }) => sum + parseFloat(g.amountUSD || '0'), 0
    ) ?? 0;

    // Scale to actual deposit
    const scaledFee = (feePercentage * depositAmountUsd) + gasCostsUsd;

    return {
      feeUsd: Math.max(scaledFee, 0),
      estimateToAmount: String(depositAmountUsd - scaledFee),
      gasUsd: gasCostsUsd,
    };
  } catch (err) {
    console.warn('Bridge quote failed:', err);
    return null;
  }
}

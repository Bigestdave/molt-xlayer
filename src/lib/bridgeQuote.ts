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
      path: '/api/v5/dex/aggregator/quote',
      chainId: String(fromChainId),
      fromChainId: String(fromChainId),
      toChainId: String(toChainId),
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount: probeAmount,
      userWalletAddress: '0x0000000000000000000000000000000000000001',
      slippage: '0.005',
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
    const quote = Array.isArray(data?.data) ? data.data[0] : data?.data ?? data;
    const toAmountRaw = quote?.toTokenAmount || quote?.toAmount || quote?.toAmountMin || quote?.outAmount;
    if (!toAmountRaw) return null;

    const toAmountUsd = parseInt(toAmountRaw) / 1_000_000; // USDC 6 decimals
    const feeForProbe = probeUsd - toAmountUsd;
    const feePercentage = feeForProbe / probeUsd;

    // Estimate gas from the quote
    const gasCostsUsd = parseFloat(
      quote?.gasFeeUsd ??
      quote?.estimatedGasFeeUsd ??
      quote?.gasUsd ??
      '0'
    );

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

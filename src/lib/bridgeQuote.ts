import { USDC_ADDRESSES } from '../constants/chains';

export interface BridgeQuoteResult {
  feeUsd: number;
  estimateToAmount: string;
  gasUsd: number;
}

/**
 * Estimate cross-chain withdrawal cost for UX preview.
 * Uses a conservative heuristic until a dedicated quote endpoint is exposed.
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

  const isXLayerRoute = fromChainId === 196 || toChainId === 196;
  const bps = isXLayerRoute ? 20 : 35; // 0.20% / 0.35%
  const baseGasUsd = isXLayerRoute ? 0.08 : 0.22;
  const variableFee = (depositAmountUsd * bps) / 10_000;
  const totalFee = Math.max(variableFee + baseGasUsd, 0);

  return {
    feeUsd: totalFee,
    estimateToAmount: String(Math.max(depositAmountUsd - totalFee, 0)),
    gasUsd: baseGasUsd,
  };
}

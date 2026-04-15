import { USDC_ADDRESSES } from '../constants/chains';
const XLAYER_CHAIN_ID = 196;
const XLAYER_ROUTE_FEE_BPS = 20; // 0.20%
const STANDARD_ROUTE_FEE_BPS = 35; // 0.35%
const XLAYER_BASE_GAS_USD = 0.08;
const STANDARD_BASE_GAS_USD = 0.22;

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

  const isXLayerRoute = fromChainId === XLAYER_CHAIN_ID || toChainId === XLAYER_CHAIN_ID;
  const bps = isXLayerRoute ? XLAYER_ROUTE_FEE_BPS : STANDARD_ROUTE_FEE_BPS;
  const baseGasUsd = isXLayerRoute ? XLAYER_BASE_GAS_USD : STANDARD_BASE_GAS_USD;
  const variableFee = (depositAmountUsd * bps) / 10_000;
  const totalFee = Math.max(variableFee + baseGasUsd, 0);

  return {
    feeUsd: totalFee,
    estimateToAmount: String(Math.max(depositAmountUsd - totalFee, 0)),
    gasUsd: baseGasUsd,
  };
}

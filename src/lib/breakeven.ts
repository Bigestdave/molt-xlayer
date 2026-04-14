import type { NormalizedVault } from '../store/appStore';

export interface BreakevenAnalysis {
  bridgeFeeUsd: number;
  apyDelta: number;
  breakEvenDays: number;
  dailyExtra: number;
  depositAmount: number;
  profitable: boolean;
}

/**
 * Calculate how long it takes for the APY difference to cover bridge fees.
 * breakEvenDays = bridgeFee / ((apyDelta / 100 / 365) * depositAmount)
 */
export function calculateBreakeven(
  depositAmount: number,
  currentApy: number,
  targetApy: number,
  bridgeFeeUsd: number,
): BreakevenAnalysis {
  const apyDelta = targetApy - currentApy;
  const dailyExtra = (apyDelta / 100 / 365) * depositAmount;
  const breakEvenDays = dailyExtra > 0 ? bridgeFeeUsd / dailyExtra : Infinity;

  return {
    bridgeFeeUsd,
    apyDelta,
    breakEvenDays,
    dailyExtra,
    depositAmount,
    profitable: breakEvenDays < 365 && breakEvenDays > 0,
  };
}

/**
 * Format break-even days into a human-readable string.
 */
export function formatBreakeven(days: number): string {
  if (!isFinite(days) || days <= 0) return 'Never';
  if (days < 1) {
    const hours = Math.ceil(days * 24);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  if (days < 30) {
    const d = Math.ceil(days);
    return `${d} day${d !== 1 ? 's' : ''}`;
  }
  const months = Math.round(days / 30);
  return `${months} month${months !== 1 ? 's' : ''}`;
}

/**
 * Estimate bridge fee from a LI.FI quote response.
 * Uses the difference between fromAmount and toAmount as the total cost (fee + slippage).
 */
export function estimateBridgeFee(fromAmountUsd: number, toAmountUsd: number): number {
  return Math.max(fromAmountUsd - toAmountUsd, 0);
}

import type { NormalizedVault } from '../store/appStore';

const TRUSTED_PROTOCOLS = ['aave-v3', 'morpho', 'euler', 'compound-v3', 'spark', 'lido', 'rocket-pool', 'maker', 'curve', 'convex', 'yearn', 'beefy'];

export function computeStabilityScore(vault: Partial<NormalizedVault>): number {
  const tvlUsd = vault.tvlUsd ?? 0;
  const protocol = vault.protocol ?? '';
  const apy = vault.apy ?? 0;

  const tvlScore = Math.min(tvlUsd / 1_000_000_000, 1) * 0.4;
  const protocolScore = TRUSTED_PROTOCOLS.includes(protocol.toLowerCase()) ? 0.4 : 0.2;
  const apyVolatilityScore = apy < 30 ? 0.2 : 0.1;
  return parseFloat((tvlScore + protocolScore + apyVolatilityScore).toFixed(3));
}

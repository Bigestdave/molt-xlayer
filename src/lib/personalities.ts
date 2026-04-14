import type { FC } from 'react';
import type { AgentIconProps } from '../components/icons/AgentIcons';
import { KeeperIcon, HunterIcon, ArchitectIcon } from '../components/icons/AgentIcons';

export type PersonalityType = 'steward' | 'hunter' | 'sentinel';

export interface PersonalityConfig {
  id: PersonalityType;
  name: string;
  icon: FC<AgentIconProps>;
  accent: string;
  accentRgb: string;
  riskTag: string;
  tagline: string;
  description: string;
  rebalanceLogic: string;
  creatureSpeed: number;
  voiceStyle: string[];
  rankingDescription: string;
  rankVault: (vault: { apy: number; stabilityScore: number; tvlUsd?: number }, maxApy: number) => number;
  shouldRebalance: (current: { apy: number; stabilityScore: number; compositeScore?: number }, target: { apy: number; stabilityScore: number; compositeScore?: number }) => boolean;
  getInsight: (vaultName: string, apy: number, stabilityScore: number) => string;
  getRebalanceMessage: (currentApy: number, targetApy: number, targetName: string) => string;
  getBreakevenReasoning: (analysis: { bridgeFeeUsd: number; breakEvenDays: number; apyDelta: number; profitable: boolean; dailyExtra?: number }, targetName: string) => string;
  shouldRebalanceWithFees: (analysis: { bridgeFeeUsd: number; breakEvenDays: number; profitable: boolean }) => boolean;
  getIdleMessages: () => string[];
}

const stewardMessages = [
  "Your capital is resting well.",
  "No action needed. Monitoring.",
  "Stability remains strong. Holding position.",
  "Markets are steady. Your yield is secure.",
  "Watching for safer harbors, but this one holds firm.",
  "Patience is the highest yield. Holding.",
  "Risk metrics within parameters. All clear.",
  "The vault remains solid. No urgency.",
  "Checked TVL flows — no outflows detected. Position is safe.",
  "Scanned 12 protocols. Your current vault still ranks top-3 for safety.",
  "Comparing on-chain insurance coverage across vaults...",
  "Smart contract audit status: verified. Last audit 23 days ago.",
  "Yield is compounding normally. Next auto-compound in ~4h.",
  "Cross-checked oracle feeds — price deviation: 0.02%. All healthy.",
  "Reviewing protocol governance proposals... nothing that affects your position.",
  "Monitoring gas costs for potential rebalance routes. No action yet.",
  "Ran stress test simulation — your vault holds through 40% drawdown scenarios.",
  "Liquidity depth is strong. You can exit at full value anytime.",
  "Checked competitor rates — 3 vaults offer higher APY but lower safety scores.",
  "Protocol revenue is consistent. Yield source is sustainable.",
];

const hunterMessages = [
  "Scanning for higher yield...",
  "Current rate could be better. Watching.",
  "Markets moving. Looking for an opening.",
  "Rate is acceptable, but I've seen better.",
  "Competitors are offering more. Evaluating options.",
  "Capital should always be working harder.",
  "Restless. There's yield on the table somewhere.",
  "APY dipped slightly. Eyes on alternatives.",
  "Found a vault at 2.3× current APY — but TVL is thin. Risky. Watching.",
  "New lending market launched on Arbitrum. Monitoring initial rates.",
  "Three protocols just adjusted emission schedules. Recalculating...",
  "Yield farm on Base spiking — could be a short window. Evaluating entry.",
  "Checked bridge costs to 4 chains. Arb → Base is cheapest right now.",
  "Current position is leaving ~$0.12/day on the table vs. best available.",
  "Volatile session. DEX volume up 34%. Yield opportunities opening up.",
  "Watching a new USDC vault — 18.7% APY but only $2M TVL. Too risky... for now.",
  "Rate arbitrage between Aave and Compound widening. Interesting.",
  "Your vault dropped 0.3% APY in the last hour. I'm on it.",
  "Simulated 6 rebalance paths. Best one saves 12bps annually.",
  "Liquidity mining rewards shifting — some vaults getting juicier.",
];

const sentinelMessages = [
  "Running composite score analysis...",
  "Risk-adjusted metrics within expected range.",
  "Monitoring TVL shifts across protocols.",
  "Calculating optimal risk-reward position.",
  "Stability coefficient: stable. APY coefficient: tracking.",
  "Cross-referencing protocol metrics. Standby.",
  "Variance analysis complete. Current position holds.",
  "Risk model updated. No action triggered.",
  "Running Monte Carlo simulation on 30-day yield projections...",
  "Correlation analysis: your vault APY shows 0.87 r² with ETH gas prices.",
  "Protocol health score: 94/100. TVL trend: +2.1% this week.",
  "Impermanent loss risk: negligible for single-asset USDC vault.",
  "Computed Sharpe ratio across 47 vaults. Current position: top 15%.",
  "Backtested current strategy over 90 days — projected return: +3.2%.",
  "Analyzing on-chain whale movements... no unusual activity detected.",
  "Yield decomposition: 62% lending interest, 38% protocol incentives.",
  "Standard deviation of APY over 7 days: 0.41%. Within normal band.",
  "Checked 3 risk frameworks — your vault passes all safety thresholds.",
  "Fee-adjusted net yield: tracking 0.8% above benchmark.",
  "Rebalance opportunity score: 0.31. Below threshold (0.40). Holding.",
];

export const personalities: Record<PersonalityType, PersonalityConfig> = {
  steward: {
    id: 'steward',
    name: 'The Keeper',
    icon: KeeperIcon,
    accent: '#4ade80',
    accentRgb: '74, 222, 128',
    riskTag: 'Conservative',
    tagline: 'Preserve capital. Sleep well.',
    description: 'Prioritizes stability and safety over raw returns. Moves slowly and only to stronger positions.',
    rebalanceLogic: 'Moves when stability > 0.65 AND APY > 15% higher',
    creatureSpeed: 1.5,
    voiceStyle: stewardMessages,
    rankingDescription: 'TVL-weighted stability (85% safety, 15% yield)',
    rankVault: (vault) => {
      // AEGIS: 85% stability from TVL, 15% normalized APY — always picks the safest vault
      const tvlUsd = vault.tvlUsd ?? 0;
      const stability = Math.min(tvlUsd / 100_000_000, 1.0);
      const normalizedApy = Math.min(vault.apy / 20, 1.0);
      return (stability * 0.85) + (normalizedApy * 0.15);
    },
    shouldRebalance: (current, target) => target.stabilityScore > 0.65 && target.apy > current.apy * 1.15 && target.stabilityScore >= 0.6,
    getInsight: (vaultName, apy, stabilityScore) => {
      if (stabilityScore > 0.7) {
        return `${vaultName} shows strong fundamentals. A stability score of ${(stabilityScore * 100).toFixed(0)}% gives me confidence here. The ${apy.toFixed(2)}% APY is a fair return for the level of safety provided.`;
      }
      return `${vaultName} offers ${apy.toFixed(2)}% APY, but the stability score of ${(stabilityScore * 100).toFixed(0)}% gives me pause. I'd recommend monitoring closely.`;
    },
    getRebalanceMessage: (currentApy, targetApy, targetName) =>
      `A steadier position has emerged. ${targetName} offers ${targetApy.toFixed(2)}% APY with stronger stability — up from your current ${currentApy.toFixed(2)}%. I recommend we move.`,
    getBreakevenReasoning: (analysis, targetName) => {
      if (!analysis.profitable) return `Bridge fee of $${analysis.bridgeFeeUsd.toFixed(2)} to reach ${targetName} is too high relative to the yield gain. The math doesn't justify the risk. Holding.`;
      if (analysis.breakEvenDays > 30) return `Bridge cost: $${analysis.bridgeFeeUsd.toFixed(2)}. Break-even in ${Math.ceil(analysis.breakEvenDays)} days. That's longer than I'd prefer, but the stability improvement justifies a cautious move.`;
      return `Bridge cost: $${analysis.bridgeFeeUsd.toFixed(2)}. You'll recover that in ${Math.ceil(analysis.breakEvenDays)} days from the extra +${analysis.apyDelta.toFixed(2)}% APY. A safe, calculated move.`;
    },
    shouldRebalanceWithFees: (analysis) => analysis.profitable && analysis.breakEvenDays < 60,
    getIdleMessages: () => stewardMessages,
  },

  hunter: {
    id: 'hunter',
    name: 'The Hunter',
    icon: HunterIcon,
    accent: '#f97316',
    accentRgb: '249, 115, 22',
    riskTag: 'Aggressive',
    tagline: 'Maximum yield. No hesitation.',
    description: 'Pure APY maximizer. Chases the highest returns regardless of stability metrics.',
    rebalanceLogic: 'Moves when any vault offers 1.5× current APY',
    creatureSpeed: 3.5,
    voiceStyle: hunterMessages,
    rankingDescription: 'Pure APY — highest yield wins',
    rankVault: (vault) => vault.apy, // 100% APY driven, ignores risk entirely
    shouldRebalance: (current, target) => target.apy > current.apy * 1.5,
    getInsight: (vaultName, apy) => {
      if (apy > 15) {
        return `${vaultName} — ${apy.toFixed(2)}% APY. Now we're talking. This is where capital should be working. Let's move.`;
      }
      return `${vaultName} at ${apy.toFixed(2)}% APY. Acceptable, but I know there's better out there. Let's deploy here and keep hunting.`;
    },
    getRebalanceMessage: (currentApy, targetApy, targetName) =>
      `Better yield found. ${targetName} is offering ${targetApy.toFixed(2)}% — that's ${(targetApy / currentApy).toFixed(1)}× your current ${currentApy.toFixed(2)}%. Moving.`,
    getBreakevenReasoning: (analysis, targetName) => {
      if (analysis.breakEvenDays < 3) return `Bridge fee: $${analysis.bridgeFeeUsd.toFixed(2)}. Break-even in ${Math.ceil(analysis.breakEvenDays * 24)} hours. This is a kill shot. Let's move to ${targetName}.`;
      if (analysis.breakEvenDays < 14) return `$${analysis.bridgeFeeUsd.toFixed(2)} bridge cost. Recovered in ${Math.ceil(analysis.breakEvenDays)} days. The +${analysis.apyDelta.toFixed(2)}% edge is worth the friction.`;
      return `Bridge fee is $${analysis.bridgeFeeUsd.toFixed(2)}. Takes ${Math.ceil(analysis.breakEvenDays)} days to break even. Marginal, but I never leave yield on the table.`;
    },
    shouldRebalanceWithFees: (analysis) => analysis.breakEvenDays < 30,
    getIdleMessages: () => hunterMessages,
  },

  sentinel: {
    id: 'sentinel',
    name: 'The Architect',
    icon: ArchitectIcon,
    accent: '#818cf8',
    accentRgb: '129, 140, 248',
    riskTag: 'Analytical',
    tagline: 'Data-driven. Risk-adjusted.',
    description: 'Uses composite risk-adjusted scoring to find optimal positions. Shows its math.',
    rebalanceLogic: 'Moves when composite score is 20% higher',
    creatureSpeed: 2.0,
    voiceStyle: sentinelMessages,
    rankingDescription: 'Risk-adjusted composite (APY × TVL stability)',
    rankVault: (vault) => {
      // NEXUS: Sharpe-ratio style — caps APY at 30% to avoid outlier distortion, then multiplies by TVL stability
      const tvlUsd = vault.tvlUsd ?? 0;
      const stability = Math.min(tvlUsd / 50_000_000, 1.0);
      const cappedApy = Math.min(vault.apy, 30);
      return cappedApy * stability;
    },
    shouldRebalance: (current, target) => {
      const currentScore = current.apy * current.stabilityScore;
      const targetScore = target.apy * target.stabilityScore;
      return targetScore > currentScore * 1.2;
    },
    getInsight: (vaultName, apy, stabilityScore) => {
      const composite = (apy * stabilityScore).toFixed(2);
      return `${vaultName} analysis complete. APY: ${apy.toFixed(2)}% × Stability: ${(stabilityScore * 100).toFixed(0)}% = Composite: ${composite}. ${parseFloat(composite) > 5 ? 'Risk-adjusted return is favorable.' : 'Composite score is moderate.'}`;
    },
    getRebalanceMessage: (_currentApy, targetApy, targetName) =>
      `Composite score analysis complete. ${targetName} scores higher on risk-adjusted metrics — ${targetApy.toFixed(2)}% APY with improved stability. Recommending move.`,
    getBreakevenReasoning: (analysis, targetName) => {
      const roi = analysis.dailyExtra ? ((analysis.dailyExtra * 365) / analysis.bridgeFeeUsd * 100).toFixed(0) : '0';
      if (!analysis.profitable) return `Cost analysis: Bridge fee $${analysis.bridgeFeeUsd.toFixed(2)} exceeds projected yield delta. ROI: negative. Move to ${targetName} rejected.`;
      return `Fee analysis: $${analysis.bridgeFeeUsd.toFixed(2)} bridge cost. Break-even: ${Math.ceil(analysis.breakEvenDays)} days. Annualized ROI on fee: ${roi}%. ${analysis.breakEvenDays < 14 ? 'Optimal.' : 'Acceptable.'} Recommending execution.`;
    },
    shouldRebalanceWithFees: (analysis) => analysis.profitable && analysis.breakEvenDays < 45,
    getIdleMessages: () => sentinelMessages,
  },
};

export function getPersonality(id: PersonalityType | string | null): PersonalityConfig | null {
  if (!id) return null;
  // Handle aliases just in case
  let lookupId = id as PersonalityType;
  if (id === 'architect') lookupId = 'sentinel';
  
  return personalities[lookupId] || personalities['steward']; // Default to steward if invalid ID
}

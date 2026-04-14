import { motion } from 'framer-motion';
import { Clock, DollarSign, TrendingUp } from 'lucide-react';
import type { NormalizedVault } from '../../store/appStore';
import { getPersonality } from '../../lib/personalities';
import type { PersonalityType } from '../../lib/personalities';
import type { BreakevenAnalysis } from '../../lib/breakeven';
import { formatBreakeven } from '../../lib/breakeven';

interface RebalanceAlertProps {
  personality: PersonalityType;
  currentVault: NormalizedVault;
  targetVault: NormalizedVault;
  analysis?: BreakevenAnalysis | null;
  onExecute: () => void;
  onDismiss: () => void;
}

export default function RebalanceAlert({ personality, currentVault, targetVault, analysis, onExecute, onDismiss }: RebalanceAlertProps) {
  const config = getPersonality(personality);
  if (!config) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rebalance-alert bento-card glow-accent"
    >
      <div className="flex items-start gap-4 mb-5">
        <div className="shrink-0 mt-1"><config.icon size={28} color={config.accent} glow /></div>
        <div>
          <h3 className="font-display font-extrabold text-lg tracking-tight mb-1.5 flex items-center gap-2">
            Rebalance Opportunity
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: config.accent }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: config.accent }} />
            </span>
          </h3>
          <p className="text-sm text-[var(--yp-text-secondary)] leading-relaxed">
            "{config.getRebalanceMessage(currentVault.apy, targetVault.apy, targetVault.name)}"
          </p>
        </div>
      </div>

      {/* Break-even analysis */}
      {analysis && (
        <div className="bg-[var(--yp-surface)] rounded-2xl p-4 border border-[var(--yp-border)] mb-4">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign size={10} className="text-[var(--yp-text-muted)]" />
                <span className="meta-label text-[8px]">BRIDGE FEE</span>
              </div>
              <div className="font-data text-[14px] font-medium" style={{ color: config.accent }}>
                ${analysis.bridgeFeeUsd.toFixed(2)}
              </div>
            </div>
            <div className="text-center border-x border-[var(--yp-border)]">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock size={10} className="text-[var(--yp-text-muted)]" />
                <span className="meta-label text-[8px]">BREAK-EVEN</span>
              </div>
              <div className="font-data text-[14px] font-medium" style={{ color: config.accent }}>
                {formatBreakeven(analysis.breakEvenDays)}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp size={10} className="text-[var(--yp-text-muted)]" />
                <span className="meta-label text-[8px]">APY DELTA</span>
              </div>
              <div className="font-data text-[14px] font-medium" style={{ color: config.accent }}>
                +{analysis.apyDelta.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Agent reasoning */}
          <div className="bg-[var(--yp-bg)] rounded-lg p-2.5 border border-[var(--yp-border)]">
            <div className="flex items-center gap-1.5 mb-1">
              <config.icon size={11} color={config.accent} />
              <span className="meta-label text-[7px]" style={{ color: config.accent }}>{config.name.toUpperCase()} ANALYSIS</span>
            </div>
            <p className="font-data text-[10px] text-[var(--yp-text-secondary)] leading-[1.7] italic">
              "{config.getBreakevenReasoning(analysis, targetVault.name)}"
            </p>
          </div>
        </div>
      )}

      {/* Current → Target */}
      <div className="bg-[var(--yp-surface)] rounded-2xl p-4 border border-[var(--yp-border)] mb-5">
        <div className="flex justify-between items-center mb-2">
          <div className="meta-label">Current</div>
          <div className="meta-label">Target</div>
        </div>
        <div className="flex justify-between items-center relative">
          <div className="flex-1">
            <div className="font-display font-bold text-sm truncate pr-4 tracking-tight">{currentVault.name}</div>
            <div className="font-data text-[var(--yp-text-secondary)] text-xs mt-1">{currentVault.apy.toFixed(2)}% APY</div>
          </div>
          <div className="shrink-0 text-[var(--yp-text-muted)] absolute left-1/2 -translate-x-1/2 text-lg">→</div>
          <div className="flex-1 text-right">
            <div className="font-display font-bold text-sm truncate pl-4 tracking-tight" style={{ color: config.accent }}>{targetVault.name}</div>
            <div className="font-data text-xs mt-1" style={{ color: config.accent }}>{targetVault.apy.toFixed(2)}% APY</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <motion.button onClick={onExecute} className="btn-primary flex-1 py-3 text-sm" style={{ background: config.accent }} whileTap={{ scale: 0.95 }}>
          Execute One-Click Migration →
        </motion.button>
        <motion.button onClick={onDismiss} className="btn-secondary py-3 px-6 text-sm" whileTap={{ scale: 0.95 }}>
          Dismiss
        </motion.button>
      </div>
    </motion.div>
  );
}

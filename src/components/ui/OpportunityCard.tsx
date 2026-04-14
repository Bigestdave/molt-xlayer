import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import type { NormalizedVault } from '../../store/appStore';
import { getPersonality } from '../../lib/personalities';
import type { PersonalityType } from '../../lib/personalities';
import StabilityBar from './StabilityBar';

interface OpportunityCardProps {
  vault: NormalizedVault & { personalityScore?: number };
  personality: PersonalityType;
  isActive?: boolean;
  isTopPick?: boolean;
}

export default function OpportunityCard({ vault, personality, isActive, isTopPick }: OpportunityCardProps) {
  const config = getPersonality(personality);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`relative bento-card p-5 transition-all duration-300 ${
        isActive ? 'opacity-60' : isTopPick ? 'glow-accent' : ''
      }`}
      style={isTopPick && config ? { borderColor: `rgba(${config.accentRgb}, 0.3)` } : {}}
    >
      {isActive && (
        <div className="absolute -top-2 -right-2 bg-[var(--yp-surface)] border border-[var(--yp-border)] rounded-full w-6 h-6 flex items-center justify-center z-10">
          <MapPin size={12} className="text-[var(--yp-text-secondary)]" />
        </div>
      )}
      {isTopPick && config && (
        <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 z-10"
          style={{ background: config.accent, color: 'var(--yp-bg)' }}>
          <config.icon size={12} color="var(--yp-bg)" /> Top Pick
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-display font-bold text-sm truncate max-w-[160px] tracking-tight">{vault.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="meta-label capitalize" style={{ opacity: 0.7 }}>{vault.protocol.replace('-', ' ')}</span>
            <span className="meta-label">•</span>
            <span className="chip px-1.5 py-0 text-[9px]">{vault.chainName}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="meta-label mb-1">APY</div>
          <div className="font-data text-base font-medium" style={{ color: isTopPick && config ? config.accent : 'inherit' }}>
            {vault.apy.toFixed(2)}%
          </div>
        </div>
      </div>
      <div className="flex justify-between items-end gap-4">
        <div className="flex-1">
          <div className="meta-label mb-1">Stability</div>
          <StabilityBar score={vault.stabilityScore} accentRgb={config?.accentRgb} />
        </div>
        {vault.personalityScore !== undefined && config && (
          <div className="text-right">
            <div className="meta-label mb-1">{config.rankingDescription}</div>
            <div className="font-data text-xs">{vault.personalityScore.toFixed(2)}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

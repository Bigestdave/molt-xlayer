import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { personalities } from '../../lib/personalities';
import type { PersonalityType } from '../../lib/personalities';

const cardColors: Record<PersonalityType, { color: string; rgb: string; accent: string }> = {
  steward: { color: '#4ade80', rgb: '74,222,128', accent: 'rgba(74,222,128,0.10)' },
  hunter: { color: '#f97316', rgb: '249,115,22', accent: 'rgba(249,115,22,0.10)' },
  sentinel: { color: '#818cf8', rgb: '129,140,248', accent: 'rgba(129,140,248,0.10)' },
};

export default function PersonalityScreen() {
  const setScreen = useAppStore((s) => s.setScreen);
  const selectedPersonality = useAppStore((s) => s.personality);
  const setPersonality = useAppStore((s) => s.setPersonality);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleSelect = (id: PersonalityType) => {
    setPersonality(id);
    document.documentElement.style.setProperty('--yp-accent', personalities[id].accent);
    document.documentElement.style.setProperty('--yp-accent-rgb', personalities[id].accentRgb);
  };

  if (!mounted) return null;

  const selected = selectedPersonality ? personalities[selectedPersonality] : null;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 sm:px-6 py-12 sm:py-16 relative overflow-hidden">
      {/* Ambient orbs */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-[1200ms]"
        style={{
          background: selected
            ? `radial-gradient(600px at 50% -100px, rgba(${selected.accentRgb}, 0.14) 0%, transparent 55%)`
            : 'radial-gradient(600px at 50% -100px, rgba(74,222,128, 0.04) 0%, transparent 55%)',
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-[1200ms]"
        style={{
          background: selected
            ? `radial-gradient(400px at 80% 100%, rgba(${selected.accentRgb}, 0.07) 0%, transparent 55%)`
            : undefined,
        }}
      />

      <div className="max-w-[920px] w-full z-10">
        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="flex justify-center mb-8 sm:mb-10"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[var(--yp-border-hover)] bg-[var(--yp-surface-2)]">
            <span
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{
                background: selected?.accent || 'var(--yp-success)',
                boxShadow: `0 0 10px ${selected?.accent || 'var(--yp-success)'}`,
                animation: 'pulse-dot 2s ease-in-out infinite',
              }}
            />
            <span className="font-data text-[10px] tracking-[0.15em] text-[var(--yp-text-secondary)]">
              AGENT MOLT — AUTONOMOUS DEFI AGENT
            </span>
          </div>
        </motion.div>

        {/* Hero headline — dramatic sizing */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          className="text-center mb-5 sm:mb-6"
        >
          <h1
            className="font-display font-extrabold leading-[0.88] tracking-[-0.05em]"
            style={{ fontSize: 'clamp(48px, 10vw, 110px)' }}
          >
            Your yield,{' '}
            <em
              className="block italic transition-colors duration-700"
              style={{ color: selected?.accent || 'rgba(240,240,245,0.2)' }}
            >
              alive.
            </em>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="font-data text-[12px] sm:text-[13px] text-[var(--yp-text-secondary)] text-center max-w-[440px] mx-auto leading-[1.8] mb-12 sm:mb-16"
        >
          Select an autonomous agent personality. It will
          manage your DeFi positions while its visual state
          reflects your yield health.
        </motion.p>

        {/* Personality Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-10 sm:mb-12">
          {(Object.keys(personalities) as PersonalityType[]).map((id, i) => {
            const p = personalities[id];
            const cc = cardColors[id];
            const isSelected = selectedPersonality === id;

            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: [0.4, 0, 0.2, 1] }}
                onClick={() => handleSelect(id)}
                className={`personality-card bento-card p-6 sm:p-7 ${isSelected ? 'selected' : ''}`}
                style={{
                  '--card-color': cc.color,
                  '--card-rgb': cc.rgb,
                  '--card-accent': cc.accent,
                } as React.CSSProperties}
                whileTap={{ scale: 0.97 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="leading-none p-2 rounded-xl transition-all duration-500"
                    style={{
                      background: isSelected ? `rgba(${cc.rgb}, 0.12)` : `rgba(${cc.rgb}, 0.06)`,
                      boxShadow: isSelected
                        ? `0 0 20px rgba(${cc.rgb}, 0.3), 0 0 6px rgba(${cc.rgb}, 0.15)`
                        : `0 0 10px rgba(${cc.rgb}, 0.1)`,
                    }}
                  >
                    <p.icon size={28} color={cc.color} glow={isSelected} />
                  </div>
                  <span
                    className="font-data text-[9px] tracking-[0.12em] px-2.5 py-1 rounded-full border transition-colors duration-300"
                    style={{
                      borderColor: isSelected ? `rgba(${cc.rgb}, 0.4)` : 'var(--yp-border-hover)',
                      color: isSelected ? cc.color : 'var(--yp-text-muted)',
                      background: isSelected ? `rgba(${cc.rgb}, 0.1)` : 'transparent',
                    }}
                  >
                    {p.riskTag.toUpperCase()}
                  </span>
                </div>

                {/* Name — heavier visual weight */}
                <h3 className="font-display font-extrabold text-[20px] sm:text-[22px] tracking-[-0.03em] mb-1">{p.name}</h3>
                <p
                  className="text-[12px] font-semibold mb-4 tracking-[0.01em]"
                  style={{ color: cc.color }}
                >
                  {p.tagline}
                </p>

                {/* Desc */}
                <p className="font-data text-[11px] text-[var(--yp-text-secondary)] leading-[1.8]">
                  {p.description}
                </p>

                {/* Logic */}
                <div className="pt-4 mt-5 border-t border-[var(--yp-border)]">
                  <div className="font-data text-[10px] text-[var(--yp-text-muted)] leading-[1.7]">
                    Score = <span style={{ color: cc.color }}>
                      {id === 'steward' ? 'stability × 0.65 + APY × 0.35' :
                       id === 'hunter' ? 'APY (pure)' :
                       'APY × stability'}
                    </span>
                    <br />
                    {p.rebalanceLogic}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA — with breathing glow when active */}
        <motion.div
          className="flex justify-center"
          animate={{ opacity: selectedPersonality ? 1 : 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <motion.button
            disabled={!selectedPersonality}
            onClick={() => selectedPersonality && setScreen('vaultSelect')}
            className={`btn-primary text-[15px] ${selectedPersonality ? 'animate-breathe' : ''}`}
            style={selectedPersonality && selected ? {
              background: selected.accent,
            } : {}}
            whileHover={selectedPersonality ? { scale: 1.02, y: -2 } : {}}
            whileTap={selectedPersonality ? { scale: 0.95 } : {}}
          >
            Hatch with {selected?.name || 'your agent'} →
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

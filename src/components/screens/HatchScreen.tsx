import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { getPersonality } from '../../lib/personalities';
import HatchCanvas from '../creature/HatchCanvas';

/**
 * HatchScreen is now a brief animation-only screen shown 
 * after a confirmed deposit. The actual signing happens in VaultSelectScreen's modal.
 * This screen just shows the hatching animation and transitions to dashboard.
 */
export default function HatchScreen() {
  const personality = useAppStore((s) => s.personality);
  const setScreen = useAppStore((s) => s.setScreen);
  const config = getPersonality(personality);
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    // Auto-navigate to dashboard after hatching animation
    const timeout = setTimeout(() => setScreen('dashboard'), 2500);
    return () => clearTimeout(timeout);
  }, [setScreen]);

  if (!config) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="bento-card p-8 text-center max-w-md">
          <h2 className="text-red-400 font-display font-bold text-[20px] mb-3">Personality Missing</h2>
          <button onClick={() => setScreen('personality')} className="btn-secondary w-full text-[13px]">← Return to Select</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-5 sm:p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(${config.accentRgb}, 0.2) 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10 w-full max-w-md mx-auto text-center">
        <motion.div
          className="mb-8 sm:mb-12 flex items-center justify-center relative"
          style={{ height: 'min(320px, 50vw)', minHeight: 200 }}
          layoutId="creature-container"
        >
          <HatchCanvas accent={config.accent} accentRgb={config.accentRgb} progress={1} hatched={true} size={280} />
        </motion.div>
        <div className="bento-card p-5 sm:p-6 w-full sm:min-w-[380px]">
          <div className="font-display font-bold text-[18px] sm:text-[20px] mb-2" style={{ color: config.accent }}>
            Creature Hatched!
          </div>
          <div className="font-data text-[12px] text-[var(--yp-text-secondary)]">
            Taking you to your dashboard...
          </div>
        </div>
      </div>
    </div>
  );
}

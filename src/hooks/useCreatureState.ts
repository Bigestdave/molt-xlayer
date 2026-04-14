import { useMemo } from 'react';
import { useAppStore } from '../store/appStore';

export function useCreatureState() {
  const activeVault = useAppStore((s) => s.activeVault);
  const allVaults = useAppStore((s) => s.allVaults);
  const creatureState = useAppStore((s) => s.creatureState);
  const rebalanceCount = useAppStore((s) => s.rebalanceCount);
  const deposit = useAppStore((s) => s.deposit);
  const setCreatureState = useAppStore((s) => s.setCreatureState);

  const energyLevel = useMemo(() => {
    if (!activeVault || allVaults.length === 0) return 0.5;
    const maxApy = Math.max(...allVaults.map(v => v.apy), 1);
    return Math.min(activeVault.apy / maxApy + 0.2, 1.0);
  }, [activeVault, allVaults]);

  useMemo(() => {
    if (!deposit) return;
    const elapsed = Date.now() - deposit.timestamp;
    const hours = elapsed / (1000 * 60 * 60);
    if (rebalanceCount >= 1 && creatureState !== 'evolved') {
      setCreatureState('evolved');
    } else if (hours > 1 && creatureState === 'alive') {
      setCreatureState('thriving');
    }
  }, [deposit, rebalanceCount, creatureState, setCreatureState]);

  const yieldHealth = useMemo(() => {
    if (!activeVault || allVaults.length === 0) return 50;
    const maxApy = Math.max(...allVaults.map(v => v.apy), 1);
    return Math.min(Math.round((activeVault.apy / maxApy) * 100), 100);
  }, [activeVault, allVaults]);

  const stability = useMemo(() => {
    return activeVault ? Math.round(activeVault.stabilityScore * 100) : 50;
  }, [activeVault]);

  const activity = useMemo(() => {
    return Math.min(rebalanceCount * 25, 100);
  }, [rebalanceCount]);

  return { energyLevel, yieldHealth, stability, activity, creatureState };
}

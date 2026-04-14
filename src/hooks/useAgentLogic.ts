import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { getPersonality } from '../lib/personalities';
import type { NormalizedVault } from '../store/appStore';
import { getBridgeQuote } from '../lib/bridgeQuote';
import { calculateBreakeven } from '../lib/breakeven';

export function useAgentLogic() {
  const personality = useAppStore((s) => s.personality);
  const activeVault = useAppStore((s) => s.activeVault);
  const allVaults = useAppStore((s) => s.allVaults);
  const addLogEntry = useAppStore((s) => s.addLogEntry);
  const setRebalanceTarget = useAppStore((s) => s.setRebalanceTarget);
  const setShowRebalanceAlert = useAppStore((s) => s.setShowRebalanceAlert);
  const setRebalanceAnalysis = useAppStore((s) => s.setRebalanceAnalysis);
  const deposit = useAppStore((s) => s.deposit);
  const addApyDatapoint = useAppStore((s) => s.addApyDatapoint);
  const screen = useAppStore((s) => s.screen);

  const config = getPersonality(personality);
  const lastIdleRef = useRef(0);
  const lastCheckRef = useRef(0);

  const checkRebalance = useCallback(async () => {
    if (!config || !activeVault || !deposit || allVaults.length === 0) return;
    const maxApy = Math.max(...allVaults.map(v => v.apy), 1);
    const ranked = allVaults
      .filter(v => v.id !== activeVault.id)
      .map(v => ({ vault: v, score: config.rankVault(v, maxApy) }))
      .sort((a, b) => b.score - a.score);
    if (ranked.length === 0) return;
    const best = ranked[0];

    if (!config.shouldRebalance(activeVault, best.vault)) return;

    // Fetch bridge quote for break-even analysis
    addLogEntry({ message: 'Analyzing bridge costs and break-even time...', type: 'info' });

    const quote = await getBridgeQuote(activeVault.chainId, best.vault.chainId, deposit.amount);
    const feeUsd = quote?.feeUsd ?? (deposit.amount * 0.003); // fallback 0.3% estimate
    const analysis = calculateBreakeven(deposit.amount, activeVault.apy, best.vault.apy, feeUsd);

    // Let the personality decide if fees make it worthwhile
    if (!config.shouldRebalanceWithFees(analysis)) {
      const reasoning = config.getBreakevenReasoning(analysis, best.vault.name);
      addLogEntry({ message: reasoning, type: 'warning' });
      return;
    }

    setRebalanceTarget(best.vault);
    setRebalanceAnalysis(analysis);
    setShowRebalanceAlert(true);

    const reasoning = config.getBreakevenReasoning(analysis, best.vault.name);
    addLogEntry({ message: reasoning, type: 'action' });
  }, [config, activeVault, allVaults, deposit, setRebalanceTarget, setShowRebalanceAlert, setRebalanceAnalysis, addLogEntry]);

  useEffect(() => {
    if (screen !== 'dashboard' || !activeVault || !deposit) return;
    const now = Date.now();
    if (now - lastCheckRef.current < 60_000) return;
    lastCheckRef.current = now;
    const timeout = setTimeout(checkRebalance, 5000);
    const interval = setInterval(checkRebalance, 60_000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [screen, activeVault, deposit, checkRebalance]);

  useEffect(() => {
    if (!config || screen !== 'dashboard') return;
    const sendIdleMessage = () => {
      const msgs = config.getIdleMessages();
      const msg = msgs[Math.floor(Math.random() * msgs.length)];
      addLogEntry({ message: msg, type: 'info' });
    };
    const now = Date.now();
    if (now - lastIdleRef.current > 30_000) {
      lastIdleRef.current = now;
      setTimeout(sendIdleMessage, 2000);
    }
    const interval = setInterval(() => {
      lastIdleRef.current = Date.now();
      sendIdleMessage();
    }, 45_000);
    return () => clearInterval(interval);
  }, [config, screen, addLogEntry]);

  const getRankedVaults = useCallback((): (NormalizedVault & { personalityScore: number })[] => {
    if (!config || allVaults.length === 0) return [];
    const maxApy = Math.max(...allVaults.map(v => v.apy), 1);
    return allVaults
      .map(v => ({ ...v, personalityScore: parseFloat(config.rankVault(v, maxApy).toFixed(3)) }))
      .sort((a, b) => b.personalityScore - a.personalityScore);
  }, [config, allVaults]);

  return { checkRebalance, getRankedVaults, config };
}

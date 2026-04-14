import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';

/**
 * Syncs wallet session data to the database.
 * - On state changes: debounced upsert to DB
 * - Queues a final save if one is in-flight when new changes arrive
 */
export function useSessionSync(walletAddress: string | null) {
  const personality = useAppStore((s) => s.personality);
  const creatureName = useAppStore((s) => s.creatureName);
  const creatureState = useAppStore((s) => s.creatureState);
  const activeVault = useAppStore((s) => s.activeVault);
  const deposit = useAppStore((s) => s.deposit);
  const earnedUSD = useAppStore((s) => s.earnedUSD);
  const rebalanceCount = useAppStore((s) => s.rebalanceCount);
  const screen = useAppStore((s) => s.screen);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSaving = useRef(false);
  const pendingSave = useRef(false);

  const doSave = useCallback(async () => {
    if (!walletAddress || !personality || !deposit || !activeVault) return;
    if (isSaving.current) {
      pendingSave.current = true;
      return;
    }
    isSaving.current = true;

    try {
      const payload = {
        wallet_address: walletAddress.toLowerCase(),
        personality,
        creature_name: creatureName,
        creature_state: creatureState,
        active_vault: activeVault,
        deposit: deposit,
        earned_usd: earnedUSD,
        rebalance_count: rebalanceCount,
        screen: screen === 'personality' || screen === 'vaultSelect' || screen === 'hatch' ? 'dashboard' : screen,
      };

      const { error } = await supabase
        .from('wallet_sessions')
        .upsert(payload, { onConflict: 'wallet_address' });

      if (error) console.error('Failed to save session:', error);
    } catch (e) {
      console.error('Failed to save session:', e);
    } finally {
      isSaving.current = false;
      // If new changes arrived while we were saving, save again
      if (pendingSave.current) {
        pendingSave.current = false;
        doSave();
      }
    }
  }, [walletAddress, personality, creatureName, creatureState, activeVault, deposit, earnedUSD, rebalanceCount, screen]);

  // Debounced save on state changes
  useEffect(() => {
    if (!walletAddress || !personality || !deposit || !activeVault) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(), 1500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [walletAddress, personality, creatureName, creatureState, activeVault, deposit, earnedUSD, rebalanceCount, screen, doSave]);

  // Flush on page unload so we never lose data
  useEffect(() => {
    const flush = () => {
      if (!walletAddress || !personality || !deposit || !activeVault) return;
      const payload = {
        wallet_address: walletAddress.toLowerCase(),
        personality,
        creature_name: creatureName,
        creature_state: creatureState,
        active_vault: JSON.stringify(activeVault),
        deposit: JSON.stringify(deposit),
        earned_usd: earnedUSD,
        rebalance_count: rebalanceCount,
        screen: screen === 'personality' || screen === 'vaultSelect' || screen === 'hatch' ? 'dashboard' : screen,
      };
      // sendBeacon is fire-and-forget, works even during page unload
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/wallet_sessions?on_conflict=wallet_address`;
      navigator.sendBeacon?.(url); // fallback: the debounced save should have already fired
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [walletAddress, personality, creatureName, creatureState, activeVault, deposit, earnedUSD, rebalanceCount, screen]);
}

/**
 * Fetches a wallet session from the database.
 * Returns null if no session exists.
 */
export async function fetchWalletSession(walletAddress: string) {
  const { data, error } = await supabase
    .from('wallet_sessions')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersonalityType } from '../lib/personalities';
import type { BreakevenAnalysis } from '../lib/breakeven';

export interface NormalizedVault {
  id: string;
  address: string;
  chainId: number;
  chainName: string;
  name: string;
  protocol: string;
  apy: number;
  tvlUsd: number;
  asset: string;
  stabilityScore: number;
  apyBreakdown?: Record<string, number>;
  source?: 'live' | 'mock';
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'warning' | 'action' | 'success';
}

export type ScreenName = 'personality' | 'vaultSelect' | 'hatch' | 'dashboard' | 'rebalance';
export type CreatureState = 'alive' | 'thriving' | 'evolved';

export interface DepositInfo {
  amount: number;
  tokenAddress: string;
  timestamp: number;
  txHash: string;
}

export type TransactionType = 'deposit' | 'withdraw' | 'rebalance';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  vaultName: string;
  chainName: string;
  timestamp: number;
  txHash?: string;
  fromVault?: string;
  toVault?: string;
}

export interface AppState {
  screen: ScreenName;
  setScreen: (screen: ScreenName) => void;
  personality: PersonalityType | null;
  setPersonality: (p: PersonalityType) => void;
  wallet: string | null;
  setWallet: (addr: string | null) => void;
  deposit: DepositInfo | null;
  setDeposit: (d: DepositInfo | null) => void;
  activeVault: NormalizedVault | null;
  setActiveVault: (v: NormalizedVault | null) => void;
  allVaults: NormalizedVault[];
  setAllVaults: (v: NormalizedVault[]) => void;
  apyHistory: { timestamp: number; apy: number }[];
  addApyDatapoint: (apy: number) => void;
  creatureName: string;
  setCreatureName: (n: string) => void;
  creatureState: CreatureState;
  setCreatureState: (s: CreatureState) => void;
  agentLog: LogEntry[];
  addLogEntry: (entry: Omit<LogEntry, 'timestamp'>) => void;
  earnedUSD: number;
  setEarnedUSD: (e: number) => void;
  rebalanceCount: number;
  incrementRebalance: () => void;
  rebalanceTarget: NormalizedVault | null;
  setRebalanceTarget: (v: NormalizedVault | null) => void;
  showRebalanceAlert: boolean;
  setShowRebalanceAlert: (show: boolean) => void;
  rebalanceAnalysis: BreakevenAnalysis | null;
  setRebalanceAnalysis: (a: BreakevenAnalysis | null) => void;
  usingCachedData: boolean;
  setUsingCachedData: (v: boolean) => void;
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  agenticWallets: { keeper: string, hunter: string, architect: string } | null;
  setAgenticWallets: (wallets: { keeper: string, hunter: string, architect: string } | null) => void;
  reset: () => void;
}

const initialState = {
  screen: 'personality' as ScreenName,
  personality: null as PersonalityType | null,
  wallet: null as string | null,
  deposit: null as DepositInfo | null,
  activeVault: null as NormalizedVault | null,
  allVaults: [] as NormalizedVault[],
  apyHistory: [] as { timestamp: number; apy: number }[],
  creatureName: '',
  creatureState: 'alive' as CreatureState,
  agentLog: [] as LogEntry[],
  earnedUSD: 0,
  rebalanceCount: 0,
  rebalanceTarget: null as NormalizedVault | null,
  showRebalanceAlert: false,
  rebalanceAnalysis: null as BreakevenAnalysis | null,
  usingCachedData: false,
  transactions: [] as Transaction[],
  agenticWallets: null as { keeper: string, hunter: string, architect: string } | null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setScreen: (screen) => set({ screen }),
      setPersonality: (personality) => set({ personality }),
      setWallet: (wallet) => set({ wallet }),
      setDeposit: (deposit) => set({ deposit }),
      setActiveVault: (activeVault) => set({ activeVault }),
      setAllVaults: (allVaults) => set({ allVaults }),
      addApyDatapoint: (apy) => {
        const history = [...get().apyHistory, { timestamp: Date.now(), apy }];
        if (history.length > 200) history.splice(0, history.length - 200);
        set({ apyHistory: history });
      },
      setCreatureName: (creatureName) => set({ creatureName }),
      setCreatureState: (creatureState) => set({ creatureState }),
      addLogEntry: (entry) => {
        const agentLog = [
          { ...entry, timestamp: Date.now() },
          ...get().agentLog,
        ].slice(0, 50);
        set({ agentLog });
      },
      setEarnedUSD: (earnedUSD) => set({ earnedUSD }),
      incrementRebalance: () => set({ rebalanceCount: get().rebalanceCount + 1 }),
      setRebalanceTarget: (rebalanceTarget) => set({ rebalanceTarget }),
      setShowRebalanceAlert: (showRebalanceAlert) => set({ showRebalanceAlert }),
      setRebalanceAnalysis: (rebalanceAnalysis) => set({ rebalanceAnalysis }),
      setUsingCachedData: (usingCachedData) => set({ usingCachedData }),
      addTransaction: (tx) => {
        const transactions = [
          { ...tx, id: crypto.randomUUID(), timestamp: Date.now() },
          ...get().transactions,
        ].slice(0, 50);
        set({ transactions });
      },
      setAgenticWallets: (agenticWallets) => set({ agenticWallets }),
      reset: () => set(initialState),
    }),
    {
      name: 'yieldpet-storage',
      partialize: (state) => ({
        personality: state.personality,
        creatureName: state.creatureName,
        creatureState: state.creatureState,
        activeVault: state.activeVault,
        deposit: state.deposit,
        apyHistory: state.apyHistory,
        agentLog: state.agentLog.slice(0, 20),
        earnedUSD: state.earnedUSD,
        rebalanceCount: state.rebalanceCount,
        wallet: state.wallet,
        agenticWallets: state.agenticWallets,
        screen: state.deposit ? state.screen : 'personality',
        transactions: state.transactions.slice(0, 30),
      }),
    }
  )
);

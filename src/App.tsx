import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useAppStore } from './store/appStore';
import type { NormalizedVault, DepositInfo, CreatureState } from './store/appStore';
import { personalities } from './lib/personalities';
import type { PersonalityType } from './lib/personalities';
import { useSessionSync, fetchWalletSession } from './hooks/useSessionSync';
import PersonalityScreen from './components/screens/PersonalityScreen';
import VaultSelectScreen from './components/screens/VaultSelectScreen';
import HatchScreen from './components/screens/HatchScreen';
import DashboardScreen from './components/screens/DashboardScreen';
import RebalanceScreen from './components/screens/RebalanceScreen';

const screenVariants = {
  initial: { opacity: 0, scale: 0.98, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, scale: 0.98, y: -12, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
};

function isAddress(value: unknown): value is string {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function RestoreOverlay({ accentRgb }: { accentRgb: string }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
      style={{ background: '#06070a' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } }}
    >
      {/* Pulsing glow */}
      <motion.div
        className="w-20 h-20 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(${accentRgb}, 0.4) 0%, rgba(${accentRgb}, 0.05) 70%, transparent 100%)`,
          boxShadow: `0 0 60px rgba(${accentRgb}, 0.3)`,
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Shimmer text */}
      <div className="flex flex-col items-center gap-3">
        {['w-[140px]', 'w-[100px]'].map((w, i) => (
          <div key={i} className={`h-[8px] rounded-full ${w} overflow-hidden`} style={{ background: `rgba(${accentRgb}, 0.08)` }}>
            <div
              className="h-full w-[200%] rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent 25%, rgba(${accentRgb}, 0.25) 50%, transparent 75%)`,
                animation: 'shimmer 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          </div>
        ))}
        <p className="font-data text-[11px] mt-2" style={{ color: `rgba(${accentRgb}, 0.5)` }}>
          Restoring session...
        </p>
      </div>
    </motion.div>
  );
}

function useSessionRestore() {
  const { address, isConnected } = useAccount();
  const deposit = useAppStore((s) => s.deposit);
  const activeVault = useAppStore((s) => s.activeVault);
  const personality = useAppStore((s) => s.personality);
  const wallet = useAppStore((s) => s.wallet);
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const setWallet = useAppStore((s) => s.setWallet);
  const setPersonality = useAppStore((s) => s.setPersonality);
  const setDeposit = useAppStore((s) => s.setDeposit);
  const setActiveVault = useAppStore((s) => s.setActiveVault);
  const setCreatureName = useAppStore((s) => s.setCreatureName);
  const setCreatureState = useAppStore((s) => s.setCreatureState);
  const setEarnedUSD = useAppStore((s) => s.setEarnedUSD);
  const hasRestored = useRef(false);
  const wasConnected = useRef(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const isHydrated = useAppStore.persist?.hasHydrated?.() ?? true;

  useEffect(() => {
    if (!isHydrated) return;

    if (!isConnected && wasConnected.current) {
      hasRestored.current = false;
      wasConnected.current = false;
      return;
    }

    if (!isConnected || !address) return;
    wasConnected.current = true;
    if (hasRestored.current) return;
    hasRestored.current = true;

    // Always try DB first to get the latest cross-device state
    setIsRestoring(true);
    fetchWalletSession(address).then((session) => {
      if (session && session.personality && session.active_vault && session.deposit) {
        setWallet(address);
        setPersonality(session.personality as PersonalityType);
        setCreatureName(session.creature_name || '');
        setCreatureState((session.creature_state as CreatureState) || 'alive');
        setActiveVault(session.active_vault as NormalizedVault);
        setDeposit(session.deposit as DepositInfo);
        setEarnedUSD(session.earned_usd || 0);
        setScreen('dashboard');
        toast.success('Welcome back!', { description: 'Session restored from cloud.' });
      } else if (deposit && activeVault && personality) {
        // Fallback to local state if DB has nothing
        const walletMatches = !wallet || wallet.toLowerCase() === address.toLowerCase();
        if (walletMatches) {
          setWallet(address);
          if (screen === 'personality' || screen === 'vaultSelect' || screen === 'hatch') {
            setScreen('dashboard');
          }
          toast.success('Welcome back!', { description: 'Your session has been restored.' });
        }
      }
      setTimeout(() => setIsRestoring(false), 600);
    }).catch(() => {
      // On network error, fall back to local
      if (deposit && activeVault && personality) {
        setWallet(address);
        if (screen === 'personality' || screen === 'vaultSelect' || screen === 'hatch') {
          setScreen('dashboard');
        }
      }
      setIsRestoring(false);
    });
  }, [isHydrated, isConnected, address, deposit, activeVault, personality, wallet, screen, setScreen, setWallet, setPersonality, setDeposit, setActiveVault, setCreatureName, setCreatureState, setEarnedUSD]);

  return isRestoring;
}

function ScreenManager() {
  const screen = useAppStore((s) => s.screen);
  const wallet = useAppStore((s) => s.wallet);
  const isRestoring = useSessionRestore();

  // Sync session to DB
  useSessionSync(wallet);

  const accentRgb = useAppStore((s) => s.personality ? personalities[s.personality as PersonalityType]?.accentRgb : null) ?? '74, 222, 128';

  const screens: Record<string, JSX.Element> = {
    personality: <PersonalityScreen />,
    vaultSelect: <VaultSelectScreen />,
    hatch: <HatchScreen />,
    dashboard: <DashboardScreen />,
    rebalance: <RebalanceScreen />,
  };

  return (
    <>
      <AnimatePresence>
        {isRestoring && <RestoreOverlay accentRgb={accentRgb} />}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div key={screen} variants={screenVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen">
          {screens[screen] || <PersonalityScreen />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const personality = useAppStore((s) => s.personality);
  const agenticWallets = useAppStore((s) => s.agenticWallets);
  const setAgenticWallets = useAppStore((s) => s.setAgenticWallets);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (!agenticWallets) {
      fetch('/api/wallet/deploy', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          const wallets = data?.data;
          if (
            data?.success &&
            wallets &&
            isAddress(wallets.keeper) &&
            isAddress(wallets.hunter) &&
            isAddress(wallets.architect)
          ) {
            setAgenticWallets(wallets);
          } else {
            toast.error('Agentic wallet setup failed', {
              description: data?.error || 'Backend did not return valid X Layer wallet addresses.',
            });
          }
        })
        .catch(err => {
          console.error("Failed to deploy agentic wallets:", err);
          toast.error('Agentic wallet setup failed', {
            description: 'Could not reach backend wallet deployment endpoint.',
          });
        });
    }
  }, [agenticWallets, setAgenticWallets]);

  useEffect(() => {
    if (personality) {
      const config = personalities[personality as PersonalityType];
      if (config) {
        document.documentElement.style.setProperty('--yp-accent', config.accent);
        document.documentElement.style.setProperty('--yp-accent-rgb', config.accentRgb);
      }
    }
  }, [personality]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
  }, []);

  const accentRgb = personality ? personalities[personality as PersonalityType]?.accentRgb ?? '74, 222, 128' : '74, 222, 128';

  return (
    <div onMouseMove={handleMouseMove} className="relative min-h-screen overflow-hidden">
      <div
        className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(${accentRgb}, 0.06) 0%, transparent 60%)`,
        }}
      />
      <div className="noise-overlay" />
      <div className="relative z-10">
        <ScreenManager />
      </div>
    </div>
  );
}

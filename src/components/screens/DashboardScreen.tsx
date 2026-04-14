import { useEffect, useState, useRef } from 'react';
import { Zap, Clock, DollarSign, TrendingUp, Plus, ArrowDownToLine, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAppStore } from '../../store/appStore';
import { getPersonality } from '../../lib/personalities';
import { useAgentLogic } from '../../hooks/useAgentLogic';
import { useCreatureState } from '../../hooks/useCreatureState';
import { useWalletState } from '../ui/ConnectButton';
import { useDisconnect } from 'wagmi';
import { usePortfolio } from '../../hooks/usePortfolio';
import { fetchVaultDetail } from '../../lib/lifi';
import { formatBreakeven } from '../../lib/breakeven';
import { CHAIN_EXPLORERS } from '../../constants/chains';
import CreatureCanvas from '../creature/CreatureCanvas';
import ApyChart from '../ui/ApyChart';
import DepositMoreModal from '../ui/DepositMoreModal';
import WithdrawModal from '../ui/WithdrawModal';
import TransactionHistory from '../ui/TransactionHistory';
import AgentChat from '../ui/AgentChat';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] },
});

function WalletMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { shortAddress } = useWalletState();
  const { disconnect } = useDisconnect();
  const reset = useAppStore((s) => s.reset);
  const displayWallet = shortAddress || useAppStore.getState().wallet || '0x...';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="font-data text-[10px] sm:text-[11px] text-[var(--yp-text-muted)] border border-[var(--yp-border)] rounded-full px-3 py-1.5 hover:border-[var(--yp-border-hover)] hover:text-[var(--yp-text-secondary)] transition-colors cursor-pointer truncate max-w-[120px] sm:max-w-none"
      >
        {displayWallet}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-2 bg-[var(--yp-surface)] border border-[var(--yp-border-hover)] rounded-xl overflow-hidden shadow-xl z-50 min-w-[160px]"
        >
          <div className="px-4 py-3 border-b border-[var(--yp-border)]">
            <div className="font-data text-[9px] tracking-[0.1em] text-[var(--yp-text-muted)] mb-1">CONNECTED</div>
            <div className="font-data text-[11px] text-[var(--yp-text-secondary)]">{displayWallet}</div>
          </div>
          <button
            onClick={() => {
              disconnect();
              useAppStore.getState().setScreen('personality');
              setOpen(false);
            }}
            className="w-full text-left px-4 py-3 font-data text-[11px] text-[var(--yp-text-secondary)] hover:bg-[var(--yp-surface-2)] transition-colors cursor-pointer"
          >
            Disconnect Wallet
          </button>
          <button
            onClick={() => { disconnect(); reset(); setOpen(false); }}
            className="w-full text-left px-4 py-3 font-data text-[11px] text-red-400 hover:bg-[var(--yp-surface-2)] transition-colors cursor-pointer border-t border-[var(--yp-border)]"
          >
            Reset & Start Over
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default function DashboardScreen() {
  const { config, getRankedVaults } = useAgentLogic();
  const { energyLevel, yieldHealth, stability, activity, creatureState } = useCreatureState();

  const personality = useAppStore((s) => s.personality);
  const wallet = useAppStore((s) => s.wallet);
  
  const activeVault = useAppStore((s) => s.activeVault);
  const depositInfo = useAppStore((s) => s.deposit);
  const creatureName = useAppStore((s) => s.creatureName);
  const agentLog = useAppStore((s) => s.agentLog);
  const apyHistory = useAppStore((s) => s.apyHistory);
  const earnedUSD = useAppStore((s) => s.earnedUSD);
  const setEarnedUSD = useAppStore((s) => s.setEarnedUSD);
  const showRebalanceAlert = useAppStore((s) => s.showRebalanceAlert);
  const rebalanceTarget = useAppStore((s) => s.rebalanceTarget);
  const rebalanceAnalysis = useAppStore((s) => s.rebalanceAnalysis);
  const setShowRebalanceAlert = useAppStore((s) => s.setShowRebalanceAlert);
  const setScreen = useAppStore((s) => s.setScreen);
  const addLogEntry = useAppStore((s) => s.addLogEntry);
  const addApyDatapoint = useAppStore((s) => s.addApyDatapoint);
  const transactions = useAppStore((s) => s.transactions);

  const [showDepositMore, setShowDepositMore] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const { data: portfolioPositions } = usePortfolio();

  // Poll real APY from earn API every 30s (skip for mock vaults)
  const isRealVault = activeVault && activeVault.address.length >= 42;
  useEffect(() => {
    if (!activeVault || !isRealVault) {
      // For mock vaults, just use stored APY
      if (activeVault) addApyDatapoint(activeVault.apy);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const fresh = await fetchVaultDetail(activeVault.chainId, activeVault.address);
        if (fresh && !cancelled) {
          addApyDatapoint(fresh.apy);
          if (Math.abs(fresh.apy - activeVault.apy) > 0.01) {
            useAppStore.getState().setActiveVault({ ...activeVault, apy: fresh.apy, stabilityScore: fresh.stabilityScore });
          }
        }
      } catch {
        if (!cancelled) addApyDatapoint(activeVault.apy);
      }
    };
    poll();
    const interval = setInterval(poll, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeVault, addApyDatapoint, isRealVault]);

  // Validate deposit exists on-chain via portfolio, clear stale state if not found
  const [portfolioVerified, setPortfolioVerified] = useState(false);
  useEffect(() => {
    if (!depositInfo || !activeVault || !wallet) return;
    // If we have portfolio data loaded and no matching position, deposit is stale
    if (portfolioPositions && !portfolioVerified) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pos = portfolioPositions.find((p: any) =>
        p.vault?.address?.toLowerCase() === activeVault.address.toLowerCase()
      );
      if (pos) {
        setPortfolioVerified(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((pos as any).earned?.usd != null) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setEarnedUSD(Number((pos as any).earned.usd));
        }
      }
      // Don't clear stale state automatically — portfolio API may not cover all vaults
    }
  }, [depositInfo, activeVault, wallet, portfolioPositions, portfolioVerified, setEarnedUSD]);

  // Estimate earned from APY only if we have a confirmed tx (not stale)
  useEffect(() => {
    if (!depositInfo || !activeVault) return;
    if (depositInfo.txHash === '0xpending') return; // never confirmed
    if (portfolioVerified) return; // using real data instead
    // Estimate from deposit + APY + time elapsed
    const calc = () => {
      const years = (Date.now() - depositInfo.timestamp) / (1000 * 60 * 60 * 24 * 365);
      setEarnedUSD(depositInfo.amount * (activeVault.apy / 100) * years);
    };
    calc();
    const interval = setInterval(calc, 10_000);
    return () => clearInterval(interval);
  }, [depositInfo, activeVault, portfolioVerified, setEarnedUSD]);

  if (!config || !activeVault || !depositInfo) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="bento-card p-8 text-center max-w-md">
          <h2 className="text-red-400 font-display font-bold text-[20px] mb-3">State Error</h2>
          <p className="text-[13px] text-[var(--yp-text-secondary)] mb-6">Your app state couldn't load. Please restart your session.</p>
          <button onClick={() => { setScreen('personality'); useAppStore.getState().reset(); }} className="btn-secondary w-full text-[13px]">Reset App & Start Over</button>
        </div>
      </div>
    );
  }

  const rankedVaults = getRankedVaults().slice(0, 6);
  const timeMs = Date.now() - depositInfo.timestamp;
  const minutes = Math.floor(timeMs / 60000);

  const vitals = [
    { label: 'YIELD', value: yieldHealth, color: config.accent },
    { label: 'STABILITY', value: stability, color: stability > 70 ? config.accent : stability > 40 ? '#fbbf24' : '#ef4444' },
    { label: 'ACTIVITY', value: activity, color: activity > 50 ? config.accent : '#f59e0b' },
  ];

  const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: 'var(--yp-bg)' }}>
      {/* Nav — responsive */}
      <nav className="border-b border-[var(--yp-border)] bg-[var(--yp-glass-strong)] backdrop-blur-xl px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-2.5">
          
           <span className="font-display font-extrabold text-lg sm:text-xl tracking-[-0.03em]">Molt</span>
           <span className="font-data text-[9px] tracking-[0.15em] text-[var(--yp-text-secondary)] opacity-50">YIELDPET</span>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 bg-[var(--yp-surface-2)] border border-[var(--yp-border-hover)] rounded-full px-4 py-2">
          <config.icon size={16} color={config.accent} />
          <span className="font-display font-bold text-[13px]">{config.name}</span>
          <span className="font-data text-[9px] tracking-[0.1em]" style={{ color: config.accent }}>
            {config.riskTag.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 font-data text-[10px] sm:text-[11px] text-[var(--yp-text-secondary)]">
            <span
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{
                background: config.accent,
                boxShadow: `0 0 8px ${config.accent}`,
                animation: 'pulse-dot 2s ease-in-out infinite',
              }}
            />
            <span className="hidden sm:inline">{activeVault.chainName}</span>
          </div>
          <WalletMenu />
        </div>
      </nav>

      {/* Dashboard body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0 overflow-hidden lg:h-[calc(100dvh-57px)]">
        {/* ═══════ LEFT: CREATURE PANEL ═══════ */}
        <div className="border-b lg:border-b-0 lg:border-r border-[var(--yp-border)] flex flex-col overflow-y-auto custom-scrollbar">
          {/* Creature canvas — compact on mobile */}
          <motion.div
            {...fadeUp(0)}
            layoutId="creature-container"
            className="flex flex-col items-center px-6 pt-6 sm:pt-8 pb-3 sm:pb-4 relative"
            style={{
              background: `radial-gradient(ellipse at 50% 60%, rgba(${config.accentRgb}, 0.07) 0%, transparent 70%)`,
            }}
          >
            <button
              onClick={() => setShowChat(true)}
              className="animate-float mb-3 sm:mb-4 cursor-pointer transition-transform hover:scale-105 active:scale-95 relative group"
              title={`Chat with ${creatureName}`}
            >
              <CreatureCanvas
                personality={personality!}
                accent={config.accent}
                accentRgb={config.accentRgb}
                energyLevel={energyLevel}
                creatureState={creatureState}
                size={220}
              />
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 font-data text-[8px] tracking-[0.1em] px-2.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                style={{
                  background: `rgba(${config.accentRgb}, 0.15)`,
                  color: config.accent,
                  border: `1px solid rgba(${config.accentRgb}, 0.25)`,
                }}
              >
                TAP TO CHAT
              </div>
            </button>

            <div
              className="font-data text-[8px] sm:text-[9px] tracking-[0.15em] px-2 py-0.5 rounded mb-1"
              style={{
                color: config.accent,
                background: `rgba(${config.accentRgb}, 0.12)`,
                border: `1px solid rgba(${config.accentRgb}, 0.25)`,
              }}
            >
              {creatureState.toUpperCase()}
            </div>
            <h2 className="font-display font-extrabold text-[18px] sm:text-[22px] tracking-[-0.03em]">{creatureName}</h2>
          </motion.div>

          {/* Active position card */}
          <div className="mx-4 sm:mx-6 mb-3 sm:mb-4 bg-[var(--yp-surface)] border border-[var(--yp-border-hover)] rounded-xl p-3 sm:p-3.5">
            <div className="meta-label mb-1.5 sm:mb-2">ACTIVE POSITION</div>
            <div className="font-display font-bold text-[12px] sm:text-[13px] mb-0.5 sm:mb-1 truncate">{activeVault.name}</div>
            <div className="font-data text-[9px] sm:text-[10px] text-[var(--yp-text-muted)] truncate">
              {activeVault.protocol} • {activeVault.chainName} • {activeVault.apy.toFixed(2)}% APY
            </div>
            {depositInfo.txHash && depositInfo.txHash !== '0xpending' && (
              <button
                onClick={() => {
                  const explorer = CHAIN_EXPLORERS[activeVault.chainId];
                  if (explorer) window.open(`${explorer}${depositInfo.txHash}`, '_blank');
                }}
                className="font-data text-[9px] tracking-[0.08em] hover:underline cursor-pointer mt-2"
                style={{ color: config.accent }}
              >
                VIEW TX ↗
              </button>
            )}
          </div>

          {/* Stats — premium bento card */}
          <div
            className="mx-4 sm:mx-6 mb-3 sm:mb-4 rounded-2xl overflow-hidden border"
            style={{
              borderColor: `rgba(${config.accentRgb}, 0.12)`,
              background: 'var(--yp-surface)',
            }}
          >
            <div
              className="rounded-2xl p-4 sm:p-5"
              style={{
                background: `linear-gradient(160deg, rgba(${config.accentRgb}, 0.03) 0%, transparent 50%)`,
              }}
            >
              {/* Deposited — hero stat */}
              <div className="mb-5">
                <div className="meta-label text-[8px] sm:text-[9px] mb-2 tracking-[0.15em]">TOTAL DEPOSITED</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-data text-[12px] sm:text-[14px] text-white/50 leading-none">$</span>
                  <span
                    className="font-data font-bold text-[28px] sm:text-[34px] tracking-[-0.02em] leading-none text-white tabular-nums"
                  >
                    {depositInfo.amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Earned + APY row */}
              <div className="flex gap-3">
                <div
                  className="flex-1 rounded-xl p-3 border overflow-hidden"
                  style={{
                    background: `rgba(${config.accentRgb}, 0.06)`,
                    borderColor: `rgba(${config.accentRgb}, 0.15)`,
                  }}
                >
                  <div className="meta-label text-[7px] sm:text-[8px] mb-1">EARNED</div>
                  <div className="font-data text-[14px] sm:text-[16px] font-semibold tracking-[-0.02em] tabular-nums truncate" style={{ color: config.accent }}>
                    +${earnedUSD.toFixed(6)}
                  </div>
                </div>
                <div
                  className="w-[90px] sm:w-[100px] rounded-xl p-3 border text-center overflow-hidden"
                  style={{
                    background: `rgba(${config.accentRgb}, 0.06)`,
                    borderColor: `rgba(${config.accentRgb}, 0.15)`,
                  }}
                >
                  <div className="meta-label text-[7px] sm:text-[8px] mb-1">APY</div>
                  <div className="font-data font-bold text-[15px] sm:text-[17px] tracking-[-0.02em] tabular-nums" style={{ color: config.accent }}>
                    {activeVault.apy.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons row */}
          <div className="mx-4 sm:mx-6 mb-3 sm:mb-4 flex gap-2">
            <motion.button
              onClick={() => setShowDepositMore(true)}
              whileTap={{ scale: 0.95 }}
              className="flex-1 flex items-center justify-center gap-2 font-display font-bold text-[11px] sm:text-[12px] tracking-[0.04em] py-3 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg"
              style={{
                color: config.accent,
                borderColor: `rgba(${config.accentRgb}, 0.35)`,
                background: `rgba(${config.accentRgb}, 0.08)`,
                boxShadow: `0 0 20px rgba(${config.accentRgb}, 0.06)`,
              }}
            >
              <Plus size={13} /> DEPOSIT
            </motion.button>
            <motion.button
              onClick={() => setShowWithdraw(true)}
              whileTap={{ scale: 0.95 }}
              className="flex-1 flex items-center justify-center gap-2 font-display font-bold text-[11px] sm:text-[12px] tracking-[0.04em] py-3 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg"
              style={{
                color: 'var(--yp-text-secondary)',
                borderColor: 'var(--yp-border-hover)',
                background: 'var(--yp-surface-2)',
              }}
            >
              <ArrowDownToLine size={13} /> WITHDRAW
            </motion.button>
          </div>


          {/* Vitals — compact */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[var(--yp-border)] flex-1">
            <div className="meta-label mb-3 sm:mb-4 text-[8px] sm:text-[9px]">VITALS</div>
            {vitals.map(v => (
              <div key={v.label} className="flex items-center gap-2.5 sm:gap-3 mb-3">
                <span className="font-data text-[9px] sm:text-[10px] text-[var(--yp-text-muted)] w-[55px] sm:w-[65px] shrink-0 tracking-[0.06em]">
                  {v.label}
                </span>
                <div className="vitals-bar-track flex-1">
                  <div className="vitals-bar-fill" style={{ width: `${v.value}%`, background: v.color }} />
                </div>
                <span className="font-data text-[9px] sm:text-[10px] text-[var(--yp-text-secondary)] w-7 sm:w-8 text-right">{v.value}%</span>
              </div>
            ))}
            <div className="font-data text-[9px] sm:text-[10px] text-[var(--yp-text-muted)] tracking-[0.08em] text-center mt-1 sm:mt-2">
              ACTIVE · {minutes}M
            </div>
          </div>
        </div>

        {/* ═══════ RIGHT: DATA PANEL ═══════ */}
        <div className="overflow-y-auto custom-scrollbar p-4 sm:p-7 flex flex-col gap-4 sm:gap-6">
          {/* Rebalance alert with AI reasoning */}
          {showRebalanceAlert && rebalanceTarget && (
            <motion.div {...fadeUp()}>
              <div
                className="rounded-2xl p-4 sm:p-5 border"
                style={{
                  background: `rgba(${config.accentRgb}, 0.06)`,
                  borderColor: `rgba(${config.accentRgb}, 0.4)`,
                }}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                  <div className="flex items-center gap-2 font-display font-bold text-[12px] sm:text-[13px]" style={{ color: config.accent }}>
                    <Zap size={14} /> Rebalance Opportunity
                  </div>
                  <button
                    onClick={() => { setShowRebalanceAlert(false); addLogEntry({ message: 'Rebalance dismissed.', type: 'warning' }); }}
                    className="font-data text-[9px] sm:text-[10px] text-[var(--yp-text-muted)] tracking-[0.08em] hover:text-[var(--yp-text)] cursor-pointer transition-colors"
                  >
                    DISMISS
                  </button>
                </div>

                {/* Agent reasoning message */}
                <p className="font-data text-[11px] sm:text-[12px] text-[var(--yp-text-secondary)] leading-[1.7] mb-3">
                  "{config.getRebalanceMessage(activeVault.apy, rebalanceTarget.apy, rebalanceTarget.name)}"
                </p>

                {/* Break-even analysis card */}
                {rebalanceAnalysis && (
                  <div className="bg-[var(--yp-surface)] rounded-xl p-3 sm:p-3.5 border border-[var(--yp-border)] mb-3 sm:mb-4">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <DollarSign size={10} className="text-[var(--yp-text-muted)]" />
                          <span className="meta-label text-[7px] sm:text-[8px]">BRIDGE FEE</span>
                        </div>
                        <div className="font-data text-[13px] sm:text-[15px] font-medium" style={{ color: config.accent }}>
                          ${rebalanceAnalysis.bridgeFeeUsd.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center border-x border-[var(--yp-border)]">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Clock size={10} className="text-[var(--yp-text-muted)]" />
                          <span className="meta-label text-[7px] sm:text-[8px]">BREAK-EVEN</span>
                        </div>
                        <div className="font-data text-[13px] sm:text-[15px] font-medium" style={{ color: config.accent }}>
                          {formatBreakeven(rebalanceAnalysis.breakEvenDays)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp size={10} className="text-[var(--yp-text-muted)]" />
                          <span className="meta-label text-[7px] sm:text-[8px]">APY DELTA</span>
                        </div>
                        <div className="font-data text-[13px] sm:text-[15px] font-medium" style={{ color: config.accent }}>
                          +{rebalanceAnalysis.apyDelta.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Personality-specific fee reasoning */}
                    <div className="bg-[var(--yp-bg)] rounded-lg p-2.5 sm:p-3 border border-[var(--yp-border)]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <config.icon size={12} color={config.accent} />
                        <span className="meta-label text-[7px] sm:text-[8px]" style={{ color: config.accent }}>{config.name.toUpperCase()} ANALYSIS</span>
                      </div>
                      <p className="font-data text-[10px] sm:text-[11px] text-[var(--yp-text-secondary)] leading-[1.7] italic">
                        "{config.getBreakevenReasoning(rebalanceAnalysis, rebalanceTarget.name)}"
                      </p>
                    </div>
                  </div>
                )}

                {/* APY comparison */}
                <div className="flex items-center justify-between font-data text-[10px] sm:text-[11px] text-[var(--yp-text-muted)] mb-3 sm:mb-4 px-1">
                  <span>{activeVault.apy.toFixed(2)}% APY</span>
                  <span className="text-[var(--yp-text-muted)]">→</span>
                  <span style={{ color: config.accent }}>{rebalanceTarget.apy.toFixed(2)}% APY</span>
                </div>

                <motion.button
                  onClick={() => { setShowRebalanceAlert(false); setScreen('rebalance'); }}
                  className="btn-primary text-[12px] sm:text-[13px] py-2.5 px-5 sm:px-6 w-full"
                  style={{ background: config.accent, borderRadius: 8 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Execute One-Click Migration →
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* APY Chart — THE BIG NUMBER with text glow */}
          <motion.div {...fadeUp(0.1)} className="bento-card p-5 sm:p-6">
            <div className="flex items-start justify-between mb-4 sm:mb-5">
              <div>
                <div className="meta-label mb-2 text-[8px] sm:text-[9px]">LIVE APY</div>
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <span
                    className="font-data text-[40px] sm:text-[52px] font-medium tracking-[-0.04em] leading-none text-glow"
                    style={{ color: config.accent }}
                  >
                    {activeVault.apy.toFixed(2)}
                  </span>
                  <span
                    className="font-data text-[16px] sm:text-[20px]"
                    style={{ color: `rgba(${config.accentRgb}, 0.5)` }}
                  >
                    %
                  </span>
                </div>
              </div>
              <div className="text-right mt-1">
                <div className="font-data text-[8px] sm:text-[9px] tracking-[0.1em] text-[var(--yp-text-muted)] bg-[var(--yp-surface-2)] border border-[var(--yp-border)] rounded px-2 py-1">
                  STABILITY {(activeVault.stabilityScore * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            <ApyChart data={apyHistory} accentRgb={config.accentRgb} height={100} />
          </motion.div>

          {/* Opportunities — responsive grid */}
          <motion.div {...fadeUp(0.15)}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="meta-label text-[8px] sm:text-[9px]" style={{ opacity: 1 }}>AGENT-RANKED</div>
              <div className="font-data text-[8px] sm:text-[9px] tracking-[0.1em] text-[var(--yp-text-muted)] bg-[var(--yp-surface-2)] border border-[var(--yp-border)] rounded px-2 py-0.5 sm:py-1">
                {config.rankingDescription.toUpperCase()}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {rankedVaults.map((vault) => {
                const isCurrent = vault.id === activeVault.id;
                const isTopPick = !isCurrent && config.shouldRebalance(activeVault, vault);
                const stabPct = Math.round(vault.stabilityScore * 100);

                return (
                  <div
                    key={vault.id}
                    className="bg-[var(--yp-surface)] border border-[var(--yp-border)] rounded-xl p-3.5 sm:p-4 relative transition-all duration-200 hover:border-[var(--yp-border-hover)] hover:bg-[var(--yp-surface-2)] min-h-[100px]"
                    style={
                      isCurrent ? { borderColor: `rgba(${config.accentRgb}, 0.4)` } :
                      isTopPick ? { borderColor: `rgba(${config.accentRgb}, 0.6)` } : {}
                    }
                  >
                    {isCurrent && <span className="absolute top-3 right-3 text-[10px] text-[var(--yp-text-muted)]">●</span>}
                    <div className="font-display font-bold text-[12px] sm:text-[13px] tracking-[-0.01em] mb-0.5 sm:mb-1 truncate pr-6">{vault.name}</div>
                    <div className="flex items-center gap-1.5 font-data text-[9px] sm:text-[10px] text-[var(--yp-text-muted)] mb-2.5 sm:mb-3">
                      <span className="capitalize truncate">{vault.protocol.replace('-', ' ')}</span>
                      <span className="px-1.5 py-0 rounded bg-[var(--yp-surface-3)] text-[7px] sm:text-[8px] border border-[var(--yp-border)] shrink-0">
                        {vault.chainName.toUpperCase()}
                      </span>
                    </div>
                    <div
                      className="font-data text-[18px] sm:text-[20px] font-medium tracking-[-0.02em] mb-2"
                      style={{ color: config.accent }}
                    >
                      {vault.apy.toFixed(2)}%
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-data text-[8px] sm:text-[9px] text-[var(--yp-text-muted)] tracking-[0.08em] hidden sm:inline">STABILITY</span>
                      <div className="stability-bar flex-1">
                        <div
                          className="stability-bar-fill"
                          style={{
                            width: `${stabPct}%`,
                            background: stabPct > 70 ? config.accent : stabPct > 40 ? '#fbbf24' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="font-data text-[8px] sm:text-[9px] text-[var(--yp-text-secondary)]">{stabPct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Agent Log */}
          <motion.div {...fadeUp(0.2)} className="bento-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="meta-label text-[8px] sm:text-[9px]" style={{ opacity: 1 }}>AGENT LOG</div>
              <span
                className="w-[6px] sm:w-[7px] h-[6px] sm:h-[7px] rounded-full shrink-0"
                style={{
                  background: config.accent,
                  boxShadow: `0 0 8px ${config.accent}`,
                  animation: 'pulse-dot 1.5s ease-in-out infinite',
                }}
              />
            </div>
            <div className="flex flex-col gap-0.5 max-h-[200px] sm:max-h-[260px] overflow-y-auto custom-scrollbar">
              {agentLog.length === 0 ? (
                <div className="font-data text-[10px] sm:text-[11px] text-[var(--yp-text-muted)] py-6 text-center">
                  Agent initializing observation protocols...
                </div>
              ) : (
                agentLog.map((log) => (
                  <div
                    key={log.timestamp}
                    className="flex gap-2.5 sm:gap-3.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors hover:bg-[var(--yp-surface-2)] min-h-[36px] sm:min-h-[auto]"
                  >
                    <span className="font-data text-[9px] sm:text-[10px] text-[var(--yp-text-muted)] shrink-0 pt-0.5 tracking-[0.05em]">
                      [{fmtTime(log.timestamp)}]
                    </span>
                    <span
                      className="font-data text-[10px] sm:text-[11px] leading-[1.6]"
                      style={{
                        color:
                          log.type === 'action' ? config.accent :
                          log.type === 'warning' ? '#f59e0b' :
                          log.type === 'success' ? '#34d399' :
                          'var(--yp-text-secondary)',
                      }}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Transaction History */}
          <motion.div {...fadeUp(0.25)} className="bento-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <Receipt size={13} style={{ color: config.accent }} />
                <div className="meta-label text-[8px] sm:text-[9px]" style={{ opacity: 1 }}>TRANSACTIONS</div>
              </div>
              {transactions.length > 0 && (
                <span className="font-data text-[9px] text-[var(--yp-text-muted)] tracking-[0.05em]">
                  {transactions.length}
                </span>
              )}
            </div>
            <TransactionHistory
              transactions={transactions}
              accent={config.accent}
              accentRgb={config.accentRgb}
            />
          </motion.div>
        </div>
      </div>

      {/* Deposit More Modal */}
      <DepositMoreModal
        open={showDepositMore}
        onClose={() => setShowDepositMore(false)}
        accent={config.accent}
        accentRgb={config.accentRgb}
      />
      <WithdrawModal
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        accent={config.accent}
        accentRgb={config.accentRgb}
      />
      <AgentChat accent={config.accent} accentRgb={config.accentRgb} open={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { RotateCcw, XCircle, AlertTriangle, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { useSwitchChain } from 'wagmi';
import { useAppStore } from '../../store/appStore';
import { useVaults } from '../../hooks/useVaults';
import { getPersonality } from '../../lib/personalities';
import { SUPPORTED_CHAINS, USDC_ADDRESSES, CHAIN_EXPLORERS } from '../../constants/chains';
import { CHAIN_ICONS } from '../icons/ChainIcons';
import { ConnectButton, useWalletState } from '../ui/ConnectButton';
import { useComposer } from '../../hooks/useComposer';
import { generateCreatureName } from '../../lib/creatureNames';
import type { NormalizedVault } from '../../store/appStore';

function ShimmerRow() {
  return <div className="shimmer h-[76px] rounded-[14px]" />;
}

const STEP_LABELS: Record<string, string> = {
  idle: 'Preparing...',
  quoting: 'Getting best route...',
  signing: 'Approve in wallet...',
  submitted: 'Transaction submitted...',
  confirmed: 'Deposit confirmed!',
  failed: '',
};

function categorizeError(error: string | null): { title: string; message: string; recoverable: boolean } {
  if (!error) return { title: 'Unknown Error', message: 'Something went wrong. Please try again.', recoverable: true };
  const lower = error.toLowerCase();
  if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('rejected the request') || lower.includes('rejected the chain switch')) {
    return { title: 'Transaction Rejected', message: 'You cancelled the transaction in your wallet. No funds were moved.', recoverable: true };
  }
  if (lower.includes('timed out')) {
    return { title: 'Request Timed Out', message: error, recoverable: true };
  }
  if (lower.includes('chain switch') || lower.includes('does not match the target chain')) {
    return { title: 'Wrong Network', message: 'Your wallet is on a different chain. Please allow the network switch when prompted.', recoverable: true };
  }
  if (lower.includes('insufficient') || lower.includes('exceeds balance') || lower.includes('not enough')) {
    return { title: 'Insufficient Balance', message: "You don't have enough USDC for this deposit.", recoverable: false };
  }
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('fetch')) {
    return { title: 'Network Error', message: 'Could not reach the network. Check your connection.', recoverable: true };
  }
  if (lower.includes('gas') || lower.includes('underpriced') || lower.includes('gas estimation')) {
    return { title: 'Insufficient Balance', message: "You likely don't have enough tokens for this amount. Try a smaller deposit that matches your wallet balance.", recoverable: true };
  }
  if (lower.includes('quote') || lower.includes('route')) {
    return { title: 'Route Not Found', message: 'Could not find a route. Try a different vault or amount.', recoverable: false };
  }
  return { title: 'Transaction Failed', message: error.length > 120 ? error.slice(0, 120) + '…' : error, recoverable: true };
}

export default function VaultSelectScreen() {
  const personality = useAppStore((s) => s.personality);
  const setScreen = useAppStore((s) => s.setScreen);
  const setDeposit = useAppStore((s) => s.setDeposit);
  const selectedVault = useAppStore((s) => s.activeVault);
  const setSelectedVault = useAppStore((s) => s.setActiveVault);
  const usingCachedData = useAppStore((s) => s.usingCachedData);
  const setWallet = useAppStore((s) => s.setWallet);
  const setCreatureName = useAppStore((s) => s.setCreatureName);
  const addLogEntry = useAppStore((s) => s.addLogEntry);

  const [selectedChainId, setSelectedChainId] = useState<number>(0);
  const [amount, setAmount] = useState<string>('100');

  const { data: vaults, isLoading, isError } = useVaults(selectedChainId === 0 ? undefined : selectedChainId);
  const config = getPersonality(personality);

  const rankedVaults = useMemo(() => {
    if (!vaults || !config) return [];
    const maxApy = Math.max(...vaults.map((v) => v.apy), 1);
    return [...vaults]
      .filter((v) => v.asset === 'USDC')
      .sort((a, b) => config.rankVault(b, maxApy) - config.rankVault(a, maxApy));
  }, [vaults, config]);

  // Auto-recommend: select the top-ranked vault when vaults load (only once)
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (rankedVaults.length > 0 && !selectedVault && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
      setSelectedVault(rankedVaults[0]);
      toast.info(`${config?.name} recommends`, {
        description: `${rankedVaults[0].name} — ${rankedVaults[0].apy.toFixed(2)}% APY on ${rankedVaults[0].chainName}`,
      });
    }
  }, [rankedVaults, selectedVault, setSelectedVault, config]);

  const { address, isConnected, chainId: walletChainId } = useWalletState();
  const walletChainName = SUPPORTED_CHAINS.find(c => c.id === walletChainId)?.name ?? (walletChainId ? `Chain ${walletChainId}` : null);

  const [showConfirm, setShowConfirm] = useState(false);
  const { step, error, txHash, execute, reset: resetComposer } = useComposer();
  const { switchChainAsync } = useSwitchChain();

  // Source chain selector — defaults to wallet chain, user can change
  const depositChains = SUPPORTED_CHAINS.filter(c => c.id !== 0 && USDC_ADDRESSES[c.id]);
  const [sourceChainId, setSourceChainId] = useState<number>(walletChainId ?? 8453);
  const [showChainPicker, setShowChainPicker] = useState(false);

  // Update source chain when wallet chain changes (only if user hasn't manually picked)
  const userPickedChain = useRef(false);
  useEffect(() => {
    if (walletChainId && !userPickedChain.current) {
      setSourceChainId(walletChainId);
    }
  }, [walletChainId]);

  const sourceChainName = SUPPORTED_CHAINS.find(c => c.id === sourceChainId)?.name ?? 'Unknown';

  const isTransacting = step !== 'idle' && step !== 'failed' && step !== 'confirmed';
  const isFailed = step === 'failed';
  const isConfirmed = step === 'confirmed';
  const errorInfo = categorizeError(error);

  const handleDeposit = () => {
    if (!selectedVault || !isConnected || !address) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0.05) {
      toast.error('Enter a valid amount (minimum $0.05)');
      return;
    }
    resetComposer();
    userPickedChain.current = false;
    if (walletChainId) setSourceChainId(walletChainId);
    setShowConfirm(true);
  };

  const confirmAndSign = async () => {
    if (!selectedVault || !address) return;
    const numAmount = parseFloat(amount);
    const fromUsdcAddress = USDC_ADDRESSES[sourceChainId];
    if (!fromUsdcAddress) {
      toast.error('USDC not supported on selected source chain.');
      return;
    }

    // If wallet isn't on the selected source chain, switch first
    if (walletChainId !== sourceChainId) {
      try {
        await switchChainAsync({ chainId: sourceChainId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to switch';
        if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('user denied')) {
          toast.error('Network switch rejected. Please switch manually in your wallet.');
        } else {
          toast.error(`Could not switch to ${sourceChainName}: ${msg}`);
        }
        return;
      }
    }

    const fromAmount = parseUnits(String(numAmount), 6).toString();

    try {
      const hash = await execute({
        fromChain: sourceChainId,
        toChain: selectedVault.chainId,
        fromToken: fromUsdcAddress,
        toToken: selectedVault.address,
        fromAddress: address,
        fromAmount,
      });

      // Success
      setWallet(address);
      setDeposit({ amount: numAmount, tokenAddress: selectedVault.asset, timestamp: Date.now(), txHash: hash ?? '0xconfirmed' });
      setCreatureName(generateCreatureName(personality ?? undefined));
      addLogEntry({ message: 'Deposit confirmed on-chain. Creature hatched!', type: 'success' });
      useAppStore.getState().addTransaction({ type: 'deposit', amount: numAmount, vaultName: selectedVault.name, chainName: selectedVault.chainName, txHash: hash ?? undefined });

      const explorer = CHAIN_EXPLORERS[sourceChainId];
      toast.success('Deposit confirmed!', {
        description: 'Your creature is hatching...',
        action: explorer && hash ? { label: 'View TX', onClick: () => window.open(`${explorer}${hash}`, '_blank') } : undefined,
      });

      setShowConfirm(false);
      setScreen('hatch');
    } catch {
      // Error state handled by useComposer
    }
  };

  const handleRetry = () => {
    resetComposer();
    confirmAndSign();
  };

  const handleCloseModal = () => {
    if (isTransacting) return;
    resetComposer();
    setShowConfirm(false);
    setShowChainPicker(false);
  };

  if (!config) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="bento-card p-8 text-center max-w-md">
          <h2 className="text-red-400 font-display font-bold text-[20px] mb-3">Personality Missing</h2>
          <p className="text-[13px] text-[var(--yp-text-secondary)] mb-6">Your session may be corrupted or the chosen personality doesn't exist.</p>
          <button onClick={() => setScreen('personality')} className="btn-secondary w-full text-[13px]">← Return to Select</button>
        </div>
      </div>
    );
  }

  const annualEarnings = selectedVault
    ? (parseFloat(amount || '0') * (selectedVault.apy / 100)).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-[var(--yp-border)] bg-[var(--yp-glass-strong)] backdrop-blur-xl sticky top-0 z-50">
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
        <div className="flex sm:hidden items-center gap-2 bg-[var(--yp-surface-2)] border border-[var(--yp-border-hover)] rounded-full px-3 py-2">
          <config.icon size={16} color={config.accent} />
          <span className="font-data text-[9px] tracking-[0.1em]" style={{ color: config.accent }}>
            {config.riskTag.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {isConnected && walletChainName && (
            <div className="flex items-center gap-1.5 font-data text-[9px] sm:text-[10px] tracking-[0.08em] text-[var(--yp-text-secondary)] bg-[var(--yp-surface-2)] border border-[var(--yp-border)] rounded-full px-2.5 py-1.5">
              {(() => {
                const ChainIcon = CHAIN_ICONS[walletChainId ?? 0];
                return ChainIcon ? <ChainIcon size={12} /> : null;
              })()}
              <span className="hidden sm:inline">{walletChainName}</span>
              <span
                className="w-[5px] h-[5px] rounded-full shrink-0"
                style={{ background: config.accent, boxShadow: `0 0 6px ${config.accent}` }}
              />
            </div>
          )}
          <motion.button
            onClick={() => setScreen('personality')}
            className="btn-secondary text-[13px] px-3 sm:px-5"
            whileTap={{ scale: 0.95 }}
          >
            <span className="sm:hidden">←</span>
            <span className="hidden sm:inline">← Back</span>
          </motion.button>
        </div>
      </nav>

      <div className="flex-1 px-4 sm:px-8 py-8 sm:py-12 max-w-[900px] mx-auto w-full">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 sm:mb-10">
          <h2 className="font-display font-extrabold text-[32px] sm:text-[40px] tracking-[-0.04em] leading-[0.95] mb-2">
            Select a position
          </h2>
          {usingCachedData && (
            <span className="font-data text-[11px] sm:text-[12px] text-[var(--yp-text-muted)]">
              ● DEMO MODE — CACHED VAULT DATA
            </span>
          )}
        </motion.div>

        {/* Chain filters */}
        <div className="flex gap-2 mb-6 sm:mb-7 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {SUPPORTED_CHAINS.map(c => (
            <motion.button
              key={c.id}
              onClick={() => setSelectedChainId(c.id)}
              className={`chip shrink-0 flex items-center gap-1.5 ${selectedChainId === c.id ? 'active' : ''}`}
              whileTap={{ scale: 0.92 }}
              style={selectedChainId === c.id ? { color: config.accent } : {}}
            >
              {(() => {
                const ChainIcon = CHAIN_ICONS[c.id];
                return ChainIcon ? <ChainIcon size={13} /> : null;
              })()}
              {c.name.toUpperCase()}
            </motion.button>
          ))}
        </div>

        {/* Agent top pick banner */}
        {rankedVaults.length > 0 && config && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl p-3.5 sm:p-4 mb-4 border flex items-center gap-3 cursor-pointer"
            style={{
              borderColor: `rgba(${config.accentRgb}, 0.35)`,
              background: `rgba(${config.accentRgb}, 0.05)`,
            }}
            onClick={() => setSelectedVault(rankedVaults[0])}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `rgba(${config.accentRgb}, 0.15)` }}>
              <config.icon size={16} color={config.accent} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-data text-[9px] tracking-[0.12em] mb-0.5" style={{ color: config.accent }}>
                {config.name.toUpperCase()} TOP PICK
              </div>
              <div className="font-display font-bold text-[12px] sm:text-[13px] truncate">{rankedVaults[0].name}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-data text-[14px] sm:text-[16px] font-medium" style={{ color: config.accent }}>
                {rankedVaults[0].apy.toFixed(2)}%
              </div>
              <div className="font-data text-[9px] text-[var(--yp-text-muted)]">{rankedVaults[0].chainName}</div>
            </div>
          </motion.div>
        )}

        {/* Vault list */}
        <div className="flex flex-col gap-1.5 mb-5">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => <ShimmerRow key={i} />)}
            </div>
          ) : isError ? (
            <div className="text-center text-[var(--yp-text-muted)] py-10 bento-card">Failed to load vaults.</div>
          ) : rankedVaults.length === 0 ? (
            <div className="text-center text-[var(--yp-text-muted)] py-10 bento-card">No USDC vaults available.</div>
          ) : (
            rankedVaults.map((vault, i) => (
              <VaultRowInline
                key={vault.id}
                vault={vault}
                isSelected={selectedVault?.id === vault.id}
                onSelect={setSelectedVault}
                accent={config.accent}
                accentRgb={config.accentRgb}
                delay={i * 0.04}
              />
            ))
          )}
        </div>

        {/* Agent insight + deposit */}
        <AnimatePresence>
          {selectedVault && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 sm:gap-5"
            >
              {/* Agent insight */}
              <div
                className="rounded-2xl p-5 sm:p-6 border"
                style={{
                  borderColor: config.accent,
                  background: `rgba(${config.accentRgb}, 0.04)`,
                  boxShadow: `0 0 30px rgba(${config.accentRgb}, 0.08)`,
                }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <config.icon size={16} color={config.accent} />
                  <span className="font-data text-[10px] tracking-[0.12em]" style={{ color: config.accent }}>
                    {config.name.toUpperCase()} — ANALYSIS
                  </span>
                </div>
                <p className="font-data text-[11px] sm:text-[12px] text-[var(--yp-text-secondary)] leading-[1.8]">
                  {config.getInsight(selectedVault.name, selectedVault.apy, selectedVault.stabilityScore)}
                </p>
              </div>

              {/* Chain mismatch warning */}
              {isConnected && walletChainId && selectedVault.chainId !== walletChainId && (
                <div className="rounded-xl p-3.5 border border-amber-500/30 bg-amber-500/[0.06] flex items-start gap-2.5">
                  <span className="text-amber-400 mt-0.5 shrink-0 text-[14px]">⚠</span>
                  <p className="font-data text-[10px] sm:text-[11px] text-[var(--yp-text-secondary)] leading-[1.6]">
                    Your wallet is on <strong>{walletChainName}</strong> but this vault is on <strong>{selectedVault.chainName}</strong>. You'll be prompted to switch networks automatically.
                  </p>
                </div>
              )}

              {/* Deposit section */}
              <div className="bento-card p-5 sm:p-7">
                <div className="meta-label mb-4">DEPOSIT AMOUNT</div>
                <div className="flex items-center gap-3 bg-[var(--yp-surface-2)] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 sm:px-5 py-3 sm:py-4 mb-3 focus-within:border-[var(--yp-accent)] focus-within:shadow-[0_0_0_1px_var(--yp-accent),0_0_12px_rgba(var(--yp-accent-rgb),0.1)] transition-all duration-300">
                  <span className="font-data text-[16px] sm:text-[18px] text-[var(--yp-text-muted)]">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="bg-transparent border-none outline-none font-data text-[24px] sm:text-[28px] font-medium text-[var(--yp-text)] w-full tracking-[-0.02em] [appearance:textfield] placeholder:text-[var(--yp-text-muted)] placeholder:opacity-30"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setAmount(val);
                    }}
                    placeholder="0"
                  />
                  <span className="font-data text-[11px] sm:text-[12px] text-[var(--yp-text-muted)] tracking-[0.08em] shrink-0">USDC</span>
                </div>

                {/* Preset amounts */}
                <div className="flex gap-2 mb-4 sm:mb-5">
                  {['100', '500', '1000'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      className="flex-1 font-data text-[11px] tracking-[0.05em] py-2 rounded-lg border transition-all duration-200 hover:brightness-125"
                      style={{
                        borderColor: amount === preset ? config.accent : 'var(--yp-border)',
                        background: amount === preset ? `rgba(${config.accentRgb}, 0.1)` : 'var(--yp-surface)',
                        color: amount === preset ? config.accent : 'var(--yp-text-secondary)',
                      }}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                <div className="font-data text-[11px] sm:text-[12px] text-[var(--yp-text-secondary)] bg-[var(--yp-surface-3)] rounded-lg px-4 py-3 mb-4 sm:mb-5">
                  Estimated annual earnings:{' '}
                  <span style={{ color: config.accent, fontWeight: 500 }}>+${annualEarnings}</span>{' '}
                  at current APY
                </div>

                {isConnected ? (
                  <motion.button
                    onClick={handleDeposit}
                    className="btn-primary w-full"
                    style={{ background: config.accent, borderRadius: '12px' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Deposit & Hatch →
                  </motion.button>
                ) : (
                  <ConnectButton accent={config.accent} accentRgb={config.accentRgb} fullWidth />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction confirmation modal — now includes signing */}
        <AnimatePresence>
          {showConfirm && selectedVault && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="bento-card p-6 sm:p-8 w-full max-w-[420px]"
              >
                {isFailed ? (
                  /* Failed state */
                  <div>
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                        <XCircle size={24} className="text-red-400" />
                      </div>
                    </div>
                    <h3 className="font-display font-bold text-[16px] text-red-400 mb-2 text-center">{errorInfo.title}</h3>
                    <p className="font-data text-[11px] text-[var(--yp-text-secondary)] leading-[1.7] text-center mb-5">
                      {errorInfo.message}
                    </p>

                    <div className="flex gap-3">
                      <motion.button
                        onClick={handleCloseModal}
                        className="btn-secondary flex-1 text-[13px]"
                        whileTap={{ scale: 0.95 }}
                      >
                        Cancel
                      </motion.button>
                      {errorInfo.recoverable && (
                        <motion.button
                          onClick={handleRetry}
                          className="flex-1 flex items-center justify-center gap-2 font-data text-[13px] px-4 py-3 rounded-xl font-medium"
                          style={{ background: config.accent, color: '#000', borderRadius: '12px' }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <RotateCcw size={14} />
                          Try Again
                        </motion.button>
                      )}
                    </div>

                    <div className="flex items-start gap-2 mt-4 px-1">
                      <AlertTriangle size={12} className="text-[var(--yp-text-muted)] mt-0.5 shrink-0" />
                      <p className="font-data text-[9px] text-[var(--yp-text-muted)] leading-[1.6] text-left">
                        No funds were deducted. You can safely retry or cancel.
                      </p>
                    </div>
                  </div>
                ) : isTransacting ? (
                  /* In-progress signing state */
                  <div className="text-center py-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `rgba(${config.accentRgb}, 0.1)` }}>
                      <Loader2 size={24} className="animate-spin" style={{ color: config.accent }} />
                    </div>
                    <h3 className="font-display font-bold text-[16px] mb-2">{STEP_LABELS[step]}</h3>
                    <p className="font-data text-[11px] text-[var(--yp-text-muted)]">
                      {step === 'quoting' && 'Finding the optimal route for your deposit...'}
                      {step === 'signing' && 'Please approve the transaction in your wallet.'}
                      {step === 'submitted' && 'Waiting for on-chain confirmation...'}
                    </p>
                    {txHash && (
                      <div className="mt-3 font-data text-[10px] text-[var(--yp-text-muted)] truncate px-4">
                        TX: {txHash}
                      </div>
                    )}
                    {/* Progress bar */}
                    <div className="h-0.5 bg-[var(--yp-surface-3)] rounded-full mt-5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: config.accent, boxShadow: `0 0 8px ${config.accent}` }}
                        animate={{
                          width: step === 'quoting' ? '30%' : step === 'signing' ? '55%' : step === 'submitted' ? '80%' : '5%',
                        }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ) : (
                  /* Initial confirm state */
                  <>
                    <div className="meta-label mb-5 text-center">CONFIRM TRANSACTION</div>

                    <div className="space-y-3 mb-5">
                      <div className="flex justify-between font-data text-[12px]">
                        <span className="text-[var(--yp-text-muted)]">Vault</span>
                        <span className="text-[var(--yp-text)] font-medium truncate ml-4 text-right">{selectedVault.name}</span>
                      </div>
                      <div className="flex justify-between font-data text-[12px]">
                        <span className="text-[var(--yp-text-muted)]">Destination</span>
                        <span className="text-[var(--yp-text-secondary)]">{selectedVault.chainName}</span>
                      </div>
                      <div className="flex justify-between font-data text-[12px]">
                        <span className="text-[var(--yp-text-muted)]">Protocol</span>
                        <span className="text-[var(--yp-text-secondary)] capitalize">{selectedVault.protocol.replace('-', ' ')}</span>
                      </div>
                      <div className="h-px bg-[var(--yp-border)]" />
                      <div className="flex justify-between font-data text-[14px]">
                        <span className="text-[var(--yp-text-muted)]">Amount</span>
                        <span style={{ color: config.accent }} className="font-medium">${parseFloat(amount).toFixed(2)} USDC</span>
                      </div>
                      <div className="flex justify-between font-data text-[12px]">
                        <span className="text-[var(--yp-text-muted)]">Current APY</span>
                        <span style={{ color: config.accent }}>{selectedVault.apy.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between font-data text-[12px]">
                        <span className="text-[var(--yp-text-muted)]">Est. Annual</span>
                        <span className="text-[var(--yp-text-secondary)]">+${annualEarnings}</span>
                      </div>
                    </div>

                    {/* Source chain picker */}
                    <div className="mb-5">
                      <div className="font-data text-[9px] tracking-[0.12em] text-[var(--yp-text-muted)] mb-2">PAY FROM</div>
                      <div className="relative">
                        <button
                          onClick={() => setShowChainPicker(!showChainPicker)}
                          className="w-full flex items-center justify-between gap-2 bg-[var(--yp-surface-2)] border border-[var(--yp-border-hover)] rounded-xl px-4 py-3 hover:border-[var(--yp-accent)] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            {(() => {
                              const Icon = CHAIN_ICONS[sourceChainId];
                              return Icon ? <Icon size={16} /> : null;
                            })()}
                            <span className="font-data text-[13px] font-medium text-[var(--yp-text)]">{sourceChainName}</span>
                            <span className="font-data text-[10px] text-[var(--yp-text-muted)]">USDC</span>
                          </div>
                          <ChevronDown size={14} className="text-[var(--yp-text-muted)]" />
                        </button>
                        <AnimatePresence>
                          {showChainPicker && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-[var(--yp-surface)] border border-[var(--yp-border-hover)] rounded-xl overflow-hidden shadow-xl z-10"
                            >
                              {depositChains.map(c => {
                                const Icon = CHAIN_ICONS[c.id];
                                const isActive = c.id === sourceChainId;
                                return (
                                  <button
                                    key={c.id}
                                    onClick={() => {
                                      setSourceChainId(c.id);
                                      userPickedChain.current = true;
                                      setShowChainPicker(false);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[var(--yp-surface-2)] transition-colors"
                                    style={isActive ? { background: `rgba(${config.accentRgb}, 0.08)` } : {}}
                                  >
                                    {Icon && <Icon size={14} />}
                                    <span className="font-data text-[12px]" style={isActive ? { color: config.accent } : {}}>{c.name}</span>
                                    {isActive && <span className="ml-auto font-data text-[9px]" style={{ color: config.accent }}>✓</span>}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {sourceChainId !== walletChainId && (
                        <div className="font-data text-[9px] text-amber-400/80 mt-1.5 leading-[1.5]">
                          Your wallet will be switched to {sourceChainName} before signing.
                        </div>
                      )}
                    </div>

                    <div className="font-data text-[10px] text-[var(--yp-text-muted)] bg-[var(--yp-surface-2)] rounded-lg px-3 py-2.5 mb-5 leading-[1.6]">
                      Your USDC on {sourceChainName} will be routed via LI.FI into the vault{sourceChainId !== selectedVault.chainId ? ` on ${selectedVault.chainName}` : ''}. No private keys leave your browser.
                    </div>

                    <div className="flex gap-3">
                      <motion.button
                        onClick={handleCloseModal}
                        className="btn-secondary flex-1 text-[13px]"
                        whileTap={{ scale: 0.95 }}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        onClick={confirmAndSign}
                        className="btn-primary flex-1 text-[13px]"
                        style={{ background: config.accent, borderRadius: '12px' }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Confirm & Sign
                      </motion.button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}

/* Inline vault row */
function VaultRowInline({
  vault, isSelected, onSelect, accent, accentRgb, delay,
}: {
  vault: NormalizedVault;
  isSelected: boolean;
  onSelect: (v: NormalizedVault) => void;
  accent: string;
  accentRgb: string;
  delay: number;
}) {
  const stabilityPct = Math.round(vault.stabilityScore * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      onClick={() => onSelect(vault)}
      className={`vault-row flex items-center justify-between p-4 sm:p-5 rounded-[14px] border ${
        isSelected ? 'selected' : 'border-[var(--yp-border)]'
      }`}
      style={isSelected ? { borderColor: accent, boxShadow: `0 0 20px rgba(${accentRgb}, 0.08)` } : {}}
    >
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 sm:gap-2.5 mb-1">
          <h3 className="font-display font-bold text-[14px] sm:text-[15px] truncate tracking-[-0.02em]">{vault.name}</h3>
          <span className="font-data text-[8px] sm:text-[9px] tracking-[0.1em] px-1.5 sm:px-2 py-0.5 rounded bg-[var(--yp-surface-3)] text-[var(--yp-text-secondary)] border border-[var(--yp-border)] shrink-0">
            {vault.chainName.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 font-data text-[10px] sm:text-[11px] text-[var(--yp-text-muted)]">
          <span className="capitalize truncate">{vault.protocol.replace('-', ' ')}</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">${(vault.tvlUsd / 1_000_000).toFixed(0)}M TVL</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="font-data text-[10px] sm:text-[11px] text-[var(--yp-text-muted)] tracking-[0.06em] hidden sm:inline">STABILITY</span>
          <div className="stability-bar flex-1" style={{ maxWidth: 80 }}>
            <div
              className="stability-bar-fill"
              style={{
                width: `${stabilityPct}%`,
                background: stabilityPct > 70 ? accent : stabilityPct > 40 ? '#fbbf24' : '#ef4444',
              }}
            />
          </div>
          <span className="font-data text-[10px] sm:text-[11px] text-[var(--yp-text-muted)]">{stabilityPct}%</span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-data text-[20px] sm:text-[22px] font-medium tracking-[-0.02em] leading-none" style={{ color: accent }}>
          {vault.apy.toFixed(2)}%
        </div>
        <div className="font-data text-[8px] sm:text-[9px] tracking-[0.1em] text-[var(--yp-text-muted)] mt-1">APY</div>
      </div>
    </motion.div>
  );
}

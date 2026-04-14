import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseUnits } from 'viem';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, RotateCcw, ArrowDownToLine, ChevronDown, ArrowRight, ShieldCheck } from 'lucide-react';
import { useSwitchChain } from 'wagmi';
import { useComposer } from '../../hooks/useComposer';
import { useWalletState } from './ConnectButton';
import { useAppStore } from '../../store/appStore';
import { SUPPORTED_CHAINS, USDC_ADDRESSES, CHAIN_EXPLORERS } from '../../constants/chains';
import { CHAIN_ICONS } from '../icons/ChainIcons';
import { getBridgeQuote, type BridgeQuoteResult } from '../../lib/bridgeQuote';

const STEP_LABELS: Record<string, string> = {
  idle: 'Preparing...',
  quoting: 'Getting best route...',
  signing: 'Approve in wallet...',
  submitted: 'Transaction submitted...',
  confirmed: 'Withdrawal confirmed!',
  failed: '',
};

type ModalView = 'select' | 'confirm' | 'transacting' | 'confirmed' | 'failed';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  accent: string;
  accentRgb: string;
}

export default function WithdrawModal({ open, onClose, accent, accentRgb }: WithdrawModalProps) {
  const activeVault = useAppStore((s) => s.activeVault);
  const depositInfo = useAppStore((s) => s.deposit);
  const setDeposit = useAppStore((s) => s.setDeposit);
  const addLogEntry = useAppStore((s) => s.addLogEntry);

  const [percentage, setPercentage] = useState(100);
  const [view, setView] = useState<ModalView>('select');
  const [quote, setQuote] = useState<BridgeQuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const { address, chainId: walletChainId } = useWalletState();
  const { step, error, txHash, execute, reset: resetComposer } = useComposer();
  const { switchChainAsync } = useSwitchChain();

  const withdrawChains = SUPPORTED_CHAINS.filter(c => c.id !== 0 && USDC_ADDRESSES[c.id]);
  const [destChainId, setDestChainId] = useState<number>(walletChainId ?? 8453);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const userPickedChain = useRef(false);

  useEffect(() => {
    if (walletChainId && !userPickedChain.current) setDestChainId(walletChainId);
  }, [walletChainId]);

  useEffect(() => {
    if (open) { resetComposer(); setPercentage(100); setView('select'); setQuote(null); }
  }, [open]);

  // Sync composer step to view
  useEffect(() => {
    if (step === 'confirmed') setView('confirmed');
    else if (step === 'failed') setView('failed');
    else if (step !== 'idle') setView('transacting');
  }, [step]);

  const depositAmount = depositInfo?.amount ?? 0;
  const withdrawAmount = (depositAmount * percentage) / 100;
  const destChainName = SUPPORTED_CHAINS.find(c => c.id === destChainId)?.name ?? 'Unknown';
  const isTransacting = view === 'transacting';
  const isFailed = view === 'failed';
  const isConfirmed = view === 'confirmed';

  const handleReview = async () => {
    if (!activeVault || withdrawAmount <= 0) return;
    setQuoteLoading(true);
    const q = await getBridgeQuote(activeVault.chainId, destChainId, withdrawAmount);
    setQuote(q);
    setQuoteLoading(false);
    setView('confirm');
  };

  const handleWithdraw = async () => {
    if (!activeVault || !address || withdrawAmount <= 0) return;

    const destUsdcAddress = USDC_ADDRESSES[destChainId];
    if (!destUsdcAddress) {
      toast.error('USDC not supported on selected destination chain.');
      return;
    }

    // Switch to the vault's chain for the withdrawal
    if (walletChainId !== activeVault.chainId) {
      try {
        await switchChainAsync({ chainId: activeVault.chainId });
      } catch {
        toast.error('Network switch rejected.');
        return;
      }
    }

    // Vault token → USDC (reverse of deposit)
    const fromAmount = parseUnits(String(withdrawAmount), 6).toString();
    try {
      const hash = await execute({
        fromChain: activeVault.chainId,
        toChain: destChainId,
        fromToken: activeVault.address,
        toToken: destUsdcAddress,
        fromAddress: address,
        fromAmount,
      });

      // Update deposit to reflect remaining
      const remaining = depositAmount - withdrawAmount;
      if (remaining <= 0.01) {
        setDeposit(null);
      } else {
        setDeposit({
          ...depositInfo!,
          amount: remaining,
        });
      }

      addLogEntry({
        message: `Withdrew $${withdrawAmount.toFixed(2)} from ${activeVault.name} to ${destChainName}.`,
        type: 'action',
      });
      useAppStore.getState().addTransaction({ type: 'withdraw', amount: withdrawAmount, vaultName: activeVault.name, chainName: destChainName });

      const explorer = CHAIN_EXPLORERS[activeVault.chainId];
      toast.success('Withdrawal confirmed!', {
        action: explorer && hash ? { label: 'View TX', onClick: () => window.open(`${explorer}${hash}`, '_blank') } : undefined,
      });
    } catch {
      // handled by useComposer
    }
  };

  if (!open || !activeVault) return null;

  const DestIcon = CHAIN_ICONS[destChainId];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        onClick={() => { if (!isTransacting) onClose(); }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-[420px] mx-4 mb-4 sm:mb-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: 'var(--yp-surface)',
              borderColor: `rgba(${accentRgb}, 0.3)`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowDownToLine size={14} style={{ color: accent }} />
                <span className="font-display font-bold text-[14px]">Withdraw</span>
              </div>
              <button
                onClick={onClose}
                disabled={isTransacting}
                className="font-data text-[10px] text-[var(--yp-text-muted)] tracking-[0.08em] hover:text-[var(--yp-text)] cursor-pointer transition-colors disabled:opacity-30"
              >
                CLOSE
              </button>
            </div>

            {/* Vault info */}
            <div className="bg-[var(--yp-bg)] rounded-xl p-3 mb-4 border border-[var(--yp-border)]">
              <div className="font-display font-bold text-[12px] truncate">{activeVault.name}</div>
              <div className="font-data text-[9px] text-[var(--yp-text-muted)]">
                {activeVault.protocol} • {activeVault.chainName} • {activeVault.apy.toFixed(2)}% APY
              </div>
            </div>

            {/* Amount selection */}
            {view === 'select' && (
              <>
                <div className="mb-4">
                  <label className="meta-label text-[8px] mb-2 block">WITHDRAW AMOUNT</label>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span
                      className="font-data font-bold text-[28px] tabular-nums leading-none"
                      style={{ color: accent }}
                    >
                      ${withdrawAmount.toFixed(2)}
                    </span>
                    <span className="font-data text-[11px] text-[var(--yp-text-muted)]">
                      of ${depositAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* Percentage presets */}
                  <div className="flex gap-2 mb-3">
                    {[25, 50, 75, 100].map(p => (
                      <button
                        key={p}
                        onClick={() => setPercentage(p)}
                        className="flex-1 py-1.5 rounded-lg font-data text-[10px] tracking-[0.05em] border transition-all cursor-pointer"
                        style={{
                          background: percentage === p ? `rgba(${accentRgb}, 0.15)` : 'transparent',
                          borderColor: percentage === p ? accent : 'var(--yp-border)',
                          color: percentage === p ? accent : 'var(--yp-text-muted)',
                        }}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${accent} ${percentage}%, var(--yp-border) ${percentage}%)`,
                    }}
                  />
                </div>

                {/* Destination chain */}
                <div className="mb-4 relative">
                  <label className="meta-label text-[8px] mb-1.5 block">RECEIVE ON</label>
                  <button
                    onClick={() => setShowChainPicker(!showChainPicker)}
                    className="w-full flex items-center justify-between bg-[var(--yp-bg)] border border-[var(--yp-border-hover)] rounded-xl px-4 py-2.5 cursor-pointer transition-colors hover:border-[var(--yp-text-muted)]"
                  >
                    <span className="flex items-center gap-2">
                      {DestIcon && <DestIcon size={16} />}
                      <span className="font-data text-[12px]">{destChainName}</span>
                      <span className="font-data text-[9px] text-[var(--yp-text-muted)]">USDC</span>
                    </span>
                    <ChevronDown size={14} className="text-[var(--yp-text-muted)]" />
                  </button>
                  {showChainPicker && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--yp-surface)] border border-[var(--yp-border-hover)] rounded-xl overflow-hidden z-10 shadow-xl">
                      {withdrawChains.map(c => {
                        const Icon = CHAIN_ICONS[c.id];
                        return (
                          <button
                            key={c.id}
                            onClick={() => { setDestChainId(c.id); userPickedChain.current = true; setShowChainPicker(false); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[var(--yp-surface-2)] transition-colors cursor-pointer"
                          >
                            {Icon && <Icon size={16} />}
                            <span className="font-data text-[11px]">{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleReview}
                  disabled={quoteLoading}
                  className="w-full py-3 rounded-xl font-display font-bold text-[13px] tracking-[-0.01em] transition-all active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{
                    background: accent,
                    color: '#000',
                  }}
                >
                  {quoteLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Fetching estimate...
                    </>
                  ) : (
                    <>
                      Review Withdrawal
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </>
            )}

            {/* Confirmation step */}
            {view === 'confirm' && (
              <div className="space-y-4">
                <div className="rounded-xl p-4 border" style={{ borderColor: `rgba(${accentRgb}, 0.2)`, background: `rgba(${accentRgb}, 0.05)` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={14} style={{ color: accent }} />
                    <span className="font-display font-bold text-[12px]">Confirm Withdrawal</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-data text-[10px] text-[var(--yp-text-muted)] tracking-[0.05em]">WITHDRAW</span>
                      <span className="font-data font-semibold text-[13px] tabular-nums">${withdrawAmount.toFixed(2)}</span>
                    </div>

                    <div className="h-px" style={{ background: `rgba(${accentRgb}, 0.15)` }} />

                    <div className="flex justify-between items-center">
                      <span className="font-data text-[10px] text-[var(--yp-text-muted)] tracking-[0.05em]">EST. GAS FEE</span>
                      <span className="font-data text-[12px] tabular-nums text-[var(--yp-text-secondary)]">
                        ~${quote ? quote.gasUsd.toFixed(2) : '—'}
                      </span>
                    </div>

                    {quote && quote.feeUsd > quote.gasUsd && (
                      <div className="flex justify-between items-center">
                        <span className="font-data text-[10px] text-[var(--yp-text-muted)] tracking-[0.05em]">BRIDGE FEE</span>
                        <span className="font-data text-[12px] tabular-nums text-[var(--yp-text-secondary)]">
                          ~${(quote.feeUsd - quote.gasUsd).toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="h-px" style={{ background: `rgba(${accentRgb}, 0.15)` }} />

                    <div className="flex justify-between items-center">
                      <span className="font-data text-[10px] text-[var(--yp-text-muted)] tracking-[0.05em]">YOU RECEIVE</span>
                      <span className="font-data font-bold text-[14px] tabular-nums" style={{ color: accent }}>
                        ~${quote ? parseFloat(quote.estimateToAmount).toFixed(2) : withdrawAmount.toFixed(2)} USDC
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-data text-[10px] text-[var(--yp-text-muted)] tracking-[0.05em]">DESTINATION</span>
                      <span className="flex items-center gap-1.5">
                        {DestIcon && <DestIcon size={12} />}
                        <span className="font-data text-[11px]">{destChainName}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setView('select')}
                    className="flex-1 py-2.5 rounded-xl font-data text-[11px] tracking-[0.05em] border cursor-pointer transition-colors hover:bg-[var(--yp-surface-2)]"
                    style={{ borderColor: 'var(--yp-border)', color: 'var(--yp-text-muted)' }}
                  >
                    BACK
                  </button>
                  <button
                    onClick={handleWithdraw}
                    className="flex-[2] py-2.5 rounded-xl font-display font-bold text-[13px] tracking-[-0.01em] transition-all active:scale-[0.97] cursor-pointer"
                    style={{ background: accent, color: '#000' }}
                  >
                    Confirm Withdraw
                  </button>
                </div>
              </div>
            )}

            {/* Transaction progress */}
            {isTransacting && (
              <div className="flex flex-col items-center py-6 gap-3">
                <Loader2 size={28} className="animate-spin" style={{ color: accent }} />
                <span className="font-data text-[12px] text-[var(--yp-text-secondary)]">
                  {STEP_LABELS[step]}
                </span>
              </div>
            )}

            {/* Success */}
            {isConfirmed && (
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle2 size={28} style={{ color: accent }} />
                <span className="font-display font-bold text-[14px]" style={{ color: accent }}>
                  Withdrawal Confirmed!
                </span>
                {percentage >= 100 && (
                  <span className="font-data text-[10px] text-[var(--yp-text-muted)] text-center">
                    Your full position has been withdrawn.
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="mt-2 px-6 py-2 rounded-xl font-data text-[11px] border cursor-pointer transition-colors"
                  style={{ borderColor: accent, color: accent }}
                >
                  DONE
                </button>
              </div>
            )}

            {/* Error */}
            {isFailed && (
              <div className="flex flex-col items-center py-6 gap-3">
                <XCircle size={28} className="text-red-400" />
                <span className="font-data text-[11px] text-red-400 text-center px-4">
                  {error || 'Withdrawal failed'}
                </span>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => { resetComposer(); handleWithdraw(); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-data text-[11px] border cursor-pointer transition-colors"
                    style={{ borderColor: accent, color: accent }}
                  >
                    <RotateCcw size={12} /> Retry
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl font-data text-[11px] text-[var(--yp-text-muted)] border border-[var(--yp-border)] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

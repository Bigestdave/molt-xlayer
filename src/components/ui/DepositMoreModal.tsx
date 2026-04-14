import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseUnits } from 'viem';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, RotateCcw, AlertTriangle, ChevronDown, Plus } from 'lucide-react';
import { useSwitchChain } from 'wagmi';
import { useComposer } from '../../hooks/useComposer';
import { useWalletState } from './ConnectButton';
import { useAppStore } from '../../store/appStore';
import { SUPPORTED_CHAINS, USDC_ADDRESSES, CHAIN_EXPLORERS } from '../../constants/chains';
import { CHAIN_ICONS } from '../icons/ChainIcons';

const STEP_LABELS: Record<string, string> = {
  idle: 'Preparing...',
  quoting: 'Getting best route...',
  signing: 'Approve in wallet...',
  submitted: 'Transaction submitted...',
  confirmed: 'Deposit confirmed!',
  failed: '',
};

interface DepositMoreModalProps {
  open: boolean;
  onClose: () => void;
  accent: string;
  accentRgb: string;
}

export default function DepositMoreModal({ open, onClose, accent, accentRgb }: DepositMoreModalProps) {
  const activeVault = useAppStore((s) => s.activeVault);
  const depositInfo = useAppStore((s) => s.deposit);
  const setDeposit = useAppStore((s) => s.setDeposit);
  const addLogEntry = useAppStore((s) => s.addLogEntry);

  const [amount, setAmount] = useState('50');
  const { address, chainId: walletChainId } = useWalletState();
  const { step, error, txHash, execute, reset: resetComposer } = useComposer();
  const { switchChainAsync } = useSwitchChain();

  const depositChains = SUPPORTED_CHAINS.filter(c => c.id !== 0 && USDC_ADDRESSES[c.id]);
  const [sourceChainId, setSourceChainId] = useState<number>(walletChainId ?? 8453);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const userPickedChain = useRef(false);

  useEffect(() => {
    if (walletChainId && !userPickedChain.current) setSourceChainId(walletChainId);
  }, [walletChainId]);

  useEffect(() => {
    if (open) { resetComposer(); setAmount('50'); }
  }, [open]);

  const sourceChainName = SUPPORTED_CHAINS.find(c => c.id === sourceChainId)?.name ?? 'Unknown';
  const isTransacting = step !== 'idle' && step !== 'failed' && step !== 'confirmed';
  const isFailed = step === 'failed';
  const isConfirmed = step === 'confirmed';

  const handleDeposit = async () => {
    if (!activeVault || !address) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      toast.error('Enter a valid amount (minimum $1)');
      return;
    }
    const fromUsdcAddress = USDC_ADDRESSES[sourceChainId];
    if (!fromUsdcAddress) {
      toast.error('USDC not supported on selected source chain.');
      return;
    }

    if (walletChainId !== sourceChainId) {
      try {
        await switchChainAsync({ chainId: sourceChainId });
      } catch {
        toast.error('Network switch rejected.');
        return;
      }
    }

    const fromAmount = parseUnits(String(numAmount), 6).toString();
    try {
      const hash = await execute({
        fromChain: sourceChainId,
        toChain: activeVault.chainId,
        fromToken: fromUsdcAddress,
        toToken: activeVault.address,
        fromAddress: address,
        fromAmount,
      });

      // Update deposit with new total
      const prevAmount = depositInfo?.amount ?? 0;
      setDeposit({
        amount: prevAmount + numAmount,
        tokenAddress: activeVault.asset,
        timestamp: depositInfo?.timestamp ?? Date.now(),
        txHash: hash ?? '0xconfirmed',
      });

      addLogEntry({ message: `Deposited additional $${numAmount.toFixed(2)} into ${activeVault.name}.`, type: 'success' });
      useAppStore.getState().addTransaction({ type: 'deposit', amount: numAmount, vaultName: activeVault.name, chainName: activeVault.chainName, txHash: hash ?? undefined });

      const explorer = CHAIN_EXPLORERS[sourceChainId];
      toast.success('Additional deposit confirmed!', {
        action: explorer && hash ? { label: 'View TX', onClick: () => window.open(`${explorer}${hash}`, '_blank') } : undefined,
      });
    } catch {
      // handled by useComposer
    }
  };

  if (!open || !activeVault) return null;

  const SourceIcon = CHAIN_ICONS[sourceChainId];

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
                <Plus size={14} style={{ color: accent }} />
                <span className="font-display font-bold text-[14px]">Deposit More</span>
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

            {/* Amount + source chain */}
            {!isTransacting && !isConfirmed && !isFailed && (
              <>
                <div className="mb-3">
                  <label className="meta-label text-[8px] mb-1.5 block">AMOUNT (USDC)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    className="w-full bg-[var(--yp-bg)] border border-[var(--yp-border-hover)] rounded-xl px-4 py-3 font-data text-[16px] text-[var(--yp-text)] focus:outline-none focus:ring-1 transition-all"
                    style={{ '--tw-ring-color': accent } as React.CSSProperties}
                    placeholder="50"
                  />
                  <div className="flex gap-2 mt-2">
                    {[10, 25, 50, 100].map(v => (
                      <button
                        key={v}
                        onClick={() => setAmount(String(v))}
                        className="flex-1 py-1.5 rounded-lg font-data text-[10px] tracking-[0.05em] border transition-all cursor-pointer"
                        style={{
                          background: amount === String(v) ? `rgba(${accentRgb}, 0.15)` : 'transparent',
                          borderColor: amount === String(v) ? accent : 'var(--yp-border)',
                          color: amount === String(v) ? accent : 'var(--yp-text-muted)',
                        }}
                      >
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source chain */}
                <div className="mb-4 relative">
                  <label className="meta-label text-[8px] mb-1.5 block">PAY FROM</label>
                  <button
                    onClick={() => setShowChainPicker(!showChainPicker)}
                    className="w-full flex items-center justify-between bg-[var(--yp-bg)] border border-[var(--yp-border-hover)] rounded-xl px-4 py-2.5 cursor-pointer transition-colors hover:border-[var(--yp-text-muted)]"
                  >
                    <span className="flex items-center gap-2">
                      {SourceIcon && <SourceIcon size={16} />}
                      <span className="font-data text-[12px]">{sourceChainName}</span>
                      <span className="font-data text-[9px] text-[var(--yp-text-muted)]">USDC</span>
                    </span>
                    <ChevronDown size={14} className="text-[var(--yp-text-muted)]" />
                  </button>
                  {showChainPicker && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--yp-surface)] border border-[var(--yp-border-hover)] rounded-xl overflow-hidden z-10 shadow-xl">
                      {depositChains.map(c => {
                        const Icon = CHAIN_ICONS[c.id];
                        return (
                          <button
                            key={c.id}
                            onClick={() => { setSourceChainId(c.id); userPickedChain.current = true; setShowChainPicker(false); }}
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
                  onClick={handleDeposit}
                  className="w-full py-3 rounded-xl font-display font-bold text-[13px] tracking-[-0.01em] transition-all active:scale-[0.97] cursor-pointer"
                  style={{
                    background: accent,
                    color: '#000',
                  }}
                >
                  Deposit ${parseFloat(amount || '0').toFixed(2)}
                </button>
              </>
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
                  Deposit Confirmed!
                </span>
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
                  {error || 'Transaction failed'}
                </span>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => { resetComposer(); handleDeposit(); }}
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

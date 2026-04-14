import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { XCircle, RotateCcw, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getPersonality } from '../../lib/personalities';
import { useWalletState } from '../ui/ConnectButton';
import { CHAIN_EXPLORERS } from '../../constants/chains';
import EvolveCanvas from '../creature/EvolveCanvas';

function stepToPhase(step: string): 'spin' | 'burst' | 'emerge' {
  if (step === 'confirmed') return 'emerge';
  if (step === 'submitted') return 'burst';
  return 'spin';
}

const STATUS_MAP: Record<string, string> = {
  idle: 'Preparing rebalance...',
  switching: 'Switching network...',
  quoting: 'Finding best route...',
  signing: 'Approve in wallet...',
  submitted: 'Transaction submitted...',
  confirmed: '',
  failed: '',
};

function categorizeError(error: string | null): { title: string; message: string; recoverable: boolean } {
  if (!error) return { title: 'Unknown Error', message: 'Something went wrong. Please try again.', recoverable: true };
  const lower = error.toLowerCase();
  if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('rejected the request') || lower.includes('rejected the chain switch')) {
    return { title: 'Transaction Rejected', message: 'You cancelled the transaction in your wallet. No funds were moved.', recoverable: true };
  }
  if (lower.includes('chain switch') || lower.includes('does not match the target chain')) {
    return { title: 'Wrong Network', message: 'Your wallet is on a different chain. Please allow the network switch when prompted, or manually switch in your wallet.', recoverable: true };
  }
  if (lower.includes('insufficient') || lower.includes('exceeds balance') || lower.includes('not enough')) {
    return { title: 'Insufficient Balance', message: 'You don\'t have enough funds for this rebalance.', recoverable: false };
  }
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('fetch')) {
    return { title: 'Network Error', message: 'Could not reach the network. Check your connection and try again.', recoverable: true };
  }
  if (lower.includes('gas') || lower.includes('underpriced')) {
    return { title: 'Gas Estimation Failed', message: 'The network may be congested — try again shortly.', recoverable: true };
  }
  if (lower.includes('quote') || lower.includes('route')) {
    return { title: 'Route Not Found', message: 'Could not find a cross-chain route. Try again later.', recoverable: true };
  }
  return { title: 'Rebalance Failed', message: error.length > 120 ? error.slice(0, 120) + '…' : error, recoverable: true };
}

export default function RebalanceScreen() {
  const personality = useAppStore((s) => s.personality);
  const activeVault = useAppStore((s) => s.activeVault);
  const rebalanceTarget = useAppStore((s) => s.rebalanceTarget);
  const depositInfo = useAppStore((s) => s.deposit);
  const setScreen = useAppStore((s) => s.setScreen);
  const setActiveVault = useAppStore((s) => s.setActiveVault);
  const incrementRebalance = useAppStore((s) => s.incrementRebalance);
  const addLogEntry = useAppStore((s) => s.addLogEntry);
  const creatureName = useAppStore((s) => s.creatureName);

  const { address } = useWalletState();
  const [step, setStep] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const hasStartedRef = useRef(false);
  const rebalanceProcessStarted = useRef(false);
  const config = getPersonality(personality);

  useEffect(() => {
    if (!config || !activeVault || !rebalanceTarget || !address || !depositInfo || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const agenticWallets = useAppStore.getState().agenticWallets;
    const agentWallet = agenticWallets ? agenticWallets[personality as keyof typeof agenticWallets] : address;

    const fromToken = activeVault.asset;
    const toToken = rebalanceTarget.asset;

    // Do not trigger execute twice
    if (rebalanceProcessStarted.current) return;
    rebalanceProcessStarted.current = true;

    setStep('quoting');
    fetch('/api/security/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rebalanceTarget.address }),
    })
      .then(res => res.json())
      .then(scanRes => {
        if (!scanRes.success || scanRes.data?.riskDetected) {
          throw new Error('Security scan failed. Target vault has high risk triggers.');
        }
        setStep('signing');
        return fetch('/api/swap/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: fromToken, to: toToken, amount: depositInfo.amount, wallet: agentWallet }),
        });
      })
      .then(res => res.json())
      .then(swapRes => {
        if (!swapRes.success) throw new Error(swapRes.error || 'Swap execution failed');
        const hash = typeof swapRes.data === 'string' ? "0x" + swapRes.data.substring(0,40) : swapRes.data.txHash || '0xsuccess';
        setTxHash(hash);
        setStep('submitted');
        
        // Economy loop: send 0.5% tax to agent's own wallet
        addLogEntry({ message: `Yield claimed. Taxing 0.5% for operations...`, type: 'info' });
        return fetch('/api/economy/tax', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ amount: depositInfo.amount, wallet: agentWallet }),
        });
      })
      .then(() => {
        setStep('confirmed');
      })
      .catch((err) => {
        setError(err.message);
        setStep('failed');
      });
  }, [config, activeVault, rebalanceTarget, address, depositInfo, addLogEntry, setScreen, personality]);

  useEffect(() => {
    if (step !== 'confirmed' || !rebalanceTarget) return;

    setActiveVault(rebalanceTarget);
    incrementRebalance();
    addLogEntry({ message: `Rebalanced to ${rebalanceTarget.name}. Position upgraded.`, type: 'success' });
    useAppStore.getState().addTransaction({
      type: 'rebalance',
      amount: useAppStore.getState().deposit?.amount ?? 0,
      vaultName: rebalanceTarget.name,
      chainName: rebalanceTarget.chainName,
      txHash: txHash ?? undefined,
      fromVault: activeVault?.name,
      toVault: rebalanceTarget.name,
    });

    if (txHash) {
      const explorer = CHAIN_EXPLORERS[rebalanceTarget.chainId];
      toast.success('Rebalance confirmed!', {
        description: 'Position migrated on-chain.',
        action: explorer ? { label: 'View TX', onClick: () => window.open(`${explorer}${txHash}`, '_blank') } : undefined,
      });
    }

    const timeout = setTimeout(() => setScreen('dashboard'), 3000);
    return () => clearTimeout(timeout);
  }, [step, txHash, rebalanceTarget, setActiveVault, incrementRebalance, addLogEntry, setScreen, activeVault?.name]);

  useEffect(() => {
    if (step !== 'failed') return;
    const { title } = categorizeError(error);
    addLogEntry({ message: `Rebalance failed: ${error || 'Unknown error'}`, type: 'warning' });
    toast.error(title, { description: error || 'Transaction was rejected or failed.' });
  }, [step, error, addLogEntry]);

  if (!config) return null;

  const phase = stepToPhase(step);
  const isFailed = step === 'failed';
  const errorInfo = categorizeError(error);
  const statusText = step === 'confirmed'
    ? `${creatureName} evolved.`
    : isFailed ? '' : STATUS_MAP[step] || 'Processing...';

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-5 sm:p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 transition-opacity duration-1000"
        style={{
          background: isFailed
            ? `radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.08) 0%, transparent 60%)`
            : `radial-gradient(circle at 50% 50%, rgba(${config.accentRgb}, ${phase === 'burst' ? 0.3 : 0.1}) 0%, transparent 60%)`,
        }}
      />
      <div className="relative z-10 w-full max-w-lg mx-auto text-center flex flex-col items-center">
        <div className="h-[320px] sm:h-[400px] flex items-center justify-center mb-6 sm:mb-8">
          <EvolveCanvas accent={config.accent} accentRgb={config.accentRgb} phase={phase} size={320} />
        </div>

        {isFailed ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[420px]"
          >
            <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-5 sm:p-6 mb-4">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                  <XCircle size={22} className="text-red-400" />
                </div>
              </div>
              <h3 className="font-display font-bold text-[16px] sm:text-[18px] text-red-400 mb-2">{errorInfo.title}</h3>
              <p className="font-data text-[11px] sm:text-[12px] text-[var(--yp-text-secondary)] leading-[1.7]">
                {errorInfo.message}
              </p>
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={() => setScreen('dashboard')}
                className="flex-1 flex items-center justify-center gap-2 font-data text-[12px] sm:text-[13px] px-4 py-3 rounded-xl border border-[var(--yp-border-hover)] bg-[var(--yp-surface)] text-[var(--yp-text-secondary)] hover:bg-[var(--yp-surface-2)] transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft size={14} />
                Dashboard
              </motion.button>
              {errorInfo.recoverable && (
                <motion.button
                  onClick={() => { setStep('idle'); setError(null); setTxHash(null); hasStartedRef.current = false; rebalanceProcessStarted.current = false; }}
                  className="flex-1 flex items-center justify-center gap-2 font-data text-[12px] sm:text-[13px] px-4 py-3 rounded-xl font-medium"
                  style={{ background: config.accent, color: '#000', borderRadius: '12px' }}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <RotateCcw size={14} />
                  Try Again
                </motion.button>
              )}
            </div>

            <div className="flex items-start gap-2 mt-4 px-1">
              <AlertTriangle size={12} className="text-[var(--yp-text-muted)] mt-0.5 shrink-0" />
              <p className="font-data text-[9px] sm:text-[10px] text-[var(--yp-text-muted)] leading-[1.6] text-left">
                Your position is safe. No funds were moved during a failed rebalance.
              </p>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div
              key={statusText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-data text-[14px] sm:text-[18px]"
              style={{ color: phase === 'emerge' ? config.accent : 'inherit' }}
            >
              {statusText}
            </motion.div>

            {txHash && (
              <div className="mt-3 font-data text-[10px] text-[var(--yp-text-muted)] truncate max-w-[300px]">
                TX: {txHash}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
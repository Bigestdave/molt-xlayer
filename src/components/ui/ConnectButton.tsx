import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { motion } from 'framer-motion';

interface ConnectButtonProps {
  accent?: string;
  accentRgb?: string;
  fullWidth?: boolean;
  className?: string;
}

export function ConnectButton({ accent = '#4ade80', accentRgb = '74, 222, 128', fullWidth, className = '' }: ConnectButtonProps) {
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className={`font-data text-[10px] sm:text-[11px] text-[var(--yp-text-muted)] border border-[var(--yp-border)] rounded-full px-3 py-1.5 hover:border-[var(--yp-border-hover)] hover:text-[var(--yp-text-secondary)] transition-colors cursor-pointer truncate max-w-[140px] ${className}`}
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <motion.button
      onClick={openConnectModal}
      className={`font-display font-bold text-[12px] sm:text-[13px] py-2.5 px-5 sm:px-6 rounded-xl transition-all duration-200 cursor-pointer ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        background: accent,
        color: '#06070a',
        boxShadow: `0 0 20px rgba(${accentRgb}, 0.25)`,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
    >
      Connect Wallet
    </motion.button>
  );
}

export function useWalletState() {
  const { address, isConnected, chain } = useAccount();
  return {
    address: address ?? null,
    isConnected,
    chainId: chain?.id ?? null,
    shortAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
  };
}

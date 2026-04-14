import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, optimism, polygon, base, arbitrum } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Agent Molt',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'molt-defi-agent',
  chains: [base, arbitrum, mainnet, optimism, polygon],
});

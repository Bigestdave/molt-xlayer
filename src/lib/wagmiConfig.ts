import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, optimism, polygon, base, arbitrum } from 'wagmi/chains';
import type { Chain } from 'viem';

const xLayer: Chain = {
  id: 196,
  name: 'X Layer',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech'] },
    public: { http: ['https://rpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKLink X Layer', url: 'https://www.oklink.com/xlayer' },
  },
  testnet: false,
};

export const config = getDefaultConfig({
  appName: 'Agent Molt',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'molt-defi-agent',
  chains: [xLayer, base, arbitrum, mainnet, optimism, polygon],
});

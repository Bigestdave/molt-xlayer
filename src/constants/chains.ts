export const SUPPORTED_CHAINS = [
  { id: 0, name: 'All Chains', icon: '◎' },
  { id: 196, name: 'X Layer', icon: 'X' },
  { id: 8453, name: 'Base', icon: 'B' },
  { id: 42161, name: 'Arbitrum', icon: 'A' },
  { id: 1, name: 'Ethereum', icon: '⟠' },
  { id: 10, name: 'Optimism', icon: 'O' },
  { id: 137, name: 'Polygon', icon: 'P' },
] as const;

export const CHAIN_EXPLORERS: Record<number, string> = {
  196: 'https://www.oklink.com/xlayer/tx/',
  1: 'https://etherscan.io/tx/',
  10: 'https://optimistic.etherscan.io/tx/',
  137: 'https://polygonscan.com/tx/',
  8453: 'https://basescan.org/tx/',
  42161: 'https://arbiscan.io/tx/',
};

export const USDC_ADDRESSES: Record<number, string> = {
  196: '0x74b7F16337b8972027F6196A17a631aC6dE26d22',
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
};

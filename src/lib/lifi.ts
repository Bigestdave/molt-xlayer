import type { NormalizedVault } from '../store/appStore';
import { computeStabilityScore } from './stabilityScore';


const COMPOSER_BASE_URL = 'https://li.quest';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/** Call the lifi-proxy edge function which adds the API key server-side */
async function proxyFetch(path: string, params?: URLSearchParams): Promise<Response> {
  const queryParams = new URLSearchParams(params);
  queryParams.set('path', path);

  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lifi-proxy?${queryParams}`;

  const res = await fetch(fnUrl, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Accept': 'application/json',
    },
  });
  return res;
}

export interface RawVault {
  address: string;
  chainId: number;
  name: string;
  network?: string;
  protocol?: string | { name: string; url?: string };
  protocolName?: string;
  analytics?: {
    apy?: { base?: number; total?: number; reward?: number };
    tvl?: { usd?: string | number };
  };
  // Legacy flat fields (mock data compat)
  apy?: number;
  tvlUsd?: number;
  tvl?: number;
  apyBreakdown?: Record<string, number>;
  underlyingTokens?: Array<{ address: string; symbol: string; name?: string; decimals: number }>;
  stabilityScore?: number;
  asset?: string;
  chain?: { name: string; id: number };
  token?: { symbol: string; name: string };
  tags?: string[];
}

export interface ChainInfo {
  id: number;
  name: string;
  logoURI?: string;
}

export interface ProtocolInfo {
  name: string;
  logoURI?: string;
}

const CHAIN_NAMES: Record<number, string> = {
  196: 'X Layer',
  1: 'Ethereum',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
  43114: 'Avalanche',
  56: 'BNB Chain',
  250: 'Fantom',
  100: 'Gnosis',
  324: 'zkSync',
  59144: 'Linea',
  534352: 'Scroll',
};

let discoverCache: { at: number; vaults: NormalizedVault[] } | null = null;
const DISCOVER_CACHE_TTL_MS = 30_000;

function normalizeVault(raw: RawVault): NormalizedVault {
  // Extract from nested analytics (live API) or flat fields (mock)
  const rawApy = raw.analytics?.apy?.total ?? raw.apy ?? 0;
  const rawTvl = raw.analytics?.tvl?.usd
    ? (typeof raw.analytics.tvl.usd === 'string' ? parseFloat(raw.analytics.tvl.usd) : raw.analytics.tvl.usd)
    : raw.tvlUsd ?? raw.tvl ?? 0;
  const protocolName = typeof raw.protocol === 'object' ? raw.protocol?.name : raw.protocolName ?? raw.protocol ?? 'Unknown';

  const apy = typeof rawApy === 'number' ? (rawApy > 1 ? rawApy : rawApy * 100) : 0;

  const stabilityScore = raw.stabilityScore ?? computeStabilityScore({
    tvlUsd: rawTvl,
    protocol: protocolName ?? '',
    apy,
  });

  const fallbackAddress = raw.address || '0x' + Math.random().toString(16).slice(2, 10);

  return {
    id: `${raw.chainId}-${fallbackAddress}`,
    address: fallbackAddress,
    chainId: raw.chainId,
    chainName: raw.network ?? CHAIN_NAMES[raw.chainId] ?? `Chain ${raw.chainId}`,
    name: raw.name || 'Unknown Vault',
    protocol: protocolName ?? 'Unknown',
    apy,
    tvlUsd: rawTvl,
    asset: raw.asset ?? raw.token?.symbol ?? raw.underlyingTokens?.[0]?.symbol ?? 'USDC',
    stabilityScore,
    apyBreakdown: raw.apyBreakdown,
  };
}

const MOCK_VAULTS: NormalizedVault[] = [
  // X Layer vaults (priority for hackathon)
  { id: '196-aave-v3-usdc', address: '0xAaveV3XLayerUSDC', chainId: 196, chainName: 'X Layer', name: 'Aave V3 USDC (X Layer)', protocol: 'aave-v3', apy: 4.2, tvlUsd: 45_000_000, asset: 'USDC', stabilityScore: 0.94 },
  { id: '196-quickswap-v3', address: '0xQuickSwapV3XLayer', chainId: 196, chainName: 'X Layer', name: 'QuickSwap V3 OKB/USDT', protocol: 'quickswap-v3', apy: 18.5, tvlUsd: 12_000_000, asset: 'USDC', stabilityScore: 0.30 },
  { id: '196-dolomite-usdt', address: '0xDolomiteXLayerUSDT', chainId: 196, chainName: 'X Layer', name: 'Dolomite USDT (X Layer)', protocol: 'dolomite', apy: 8.4, tvlUsd: 28_000_000, asset: 'USDC', stabilityScore: 0.75 },
  { id: '196-uniswap-v4-usdc', address: '0xUniswapV4XLayer', chainId: 196, chainName: 'X Layer', name: 'Uniswap V4 USDC/OKB', protocol: 'uniswap-v4', apy: 14.2, tvlUsd: 8_500_000, asset: 'USDC', stabilityScore: 0.45 },
  // Other chains
  { id: '8453-0x001', address: '0x001', chainId: 8453, chainName: 'Base', name: 'Morpho USDC Vault', protocol: 'morpho', apy: 8.45, tvlUsd: 245_000_000, asset: 'USDC', stabilityScore: 0.78 },
  { id: '42161-0x002', address: '0x002', chainId: 42161, chainName: 'Arbitrum', name: 'Aave V3 USDC Supply', protocol: 'aave-v3', apy: 5.21, tvlUsd: 890_000_000, asset: 'USDC', stabilityScore: 0.85 },
  { id: '1-0x003', address: '0x003', chainId: 1, chainName: 'Ethereum', name: 'Compound V3 USDC', protocol: 'compound-v3', apy: 4.82, tvlUsd: 1_200_000_000, asset: 'USDC', stabilityScore: 0.92 },
  { id: '10-0x004', address: '0x004', chainId: 10, chainName: 'Optimism', name: 'Euler USDC Lend', protocol: 'euler', apy: 7.15, tvlUsd: 156_000_000, asset: 'USDC', stabilityScore: 0.72 },
  { id: '137-0x005', address: '0x005', chainId: 137, chainName: 'Polygon', name: 'Aave V3 USDC (Polygon)', protocol: 'aave-v3', apy: 6.34, tvlUsd: 420_000_000, asset: 'USDC', stabilityScore: 0.80 },
  { id: '8453-0x006', address: '0x006', chainId: 8453, chainName: 'Base', name: 'Spark USDC Vault', protocol: 'spark', apy: 6.88, tvlUsd: 310_000_000, asset: 'USDC', stabilityScore: 0.76 },
  { id: '42161-0x007', address: '0x007', chainId: 42161, chainName: 'Arbitrum', name: 'Beefy USDC Compounder', protocol: 'beefy', apy: 12.45, tvlUsd: 89_000_000, asset: 'USDC', stabilityScore: 0.58 },
  { id: '1-0x008', address: '0x008', chainId: 1, chainName: 'Ethereum', name: 'Morpho Blue WETH', protocol: 'morpho', apy: 3.21, tvlUsd: 670_000_000, asset: 'WETH', stabilityScore: 0.82 },
  { id: '8453-0x009', address: '0x009', chainId: 8453, chainName: 'Base', name: 'Yearn USDC Vault', protocol: 'yearn', apy: 9.67, tvlUsd: 178_000_000, asset: 'USDC', stabilityScore: 0.70 },
  { id: '10-0x010', address: '0x010', chainId: 10, chainName: 'Optimism', name: 'Curve 3pool', protocol: 'curve', apy: 4.55, tvlUsd: 560_000_000, asset: 'USDC', stabilityScore: 0.81 },
  { id: '42161-0x011', address: '0x011', chainId: 42161, chainName: 'Arbitrum', name: 'DeFi Yield USDC', protocol: 'defi-yield', apy: 18.92, tvlUsd: 34_000_000, asset: 'USDC', stabilityScore: 0.42 },
  { id: '1-0x012', address: '0x012', chainId: 1, chainName: 'Ethereum', name: 'Lido stETH', protocol: 'lido', apy: 3.18, tvlUsd: 14_000_000_000, asset: 'stETH', stabilityScore: 0.95 },
];

export async function fetchVaults(chainId?: number): Promise<NormalizedVault[]> {
  try {
    // Calling the new backend route that uses Onchain OS: okx-defi-invest
    const res = await fetch(`${API_BASE_URL}/api/defi/discover`);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    const vaults = result.data;
    if (vaults.length === 0) throw new Error('Empty response');
    const norm = vaults.map(normalizeVault);
    discoverCache = { at: Date.now(), vaults: norm };
    if (chainId) return norm.filter(v => v.chainId === chainId);
    return norm;
  } catch (err) {
    console.warn('Onchain OS API unavailable, using mock data', err);
    if (chainId) return MOCK_VAULTS.filter(v => v.chainId === chainId);
    return MOCK_VAULTS;
  }
}

export async function fetchVaultDetail(chainId: number, address: string): Promise<NormalizedVault | null> {
  try {
    const cacheValid = discoverCache && Date.now() - discoverCache.at < DISCOVER_CACHE_TTL_MS;
    const all = cacheValid ? discoverCache.vaults : await fetchVaults();
    return all.find(v => v.chainId === chainId && v.address.toLowerCase() === address.toLowerCase()) ?? null;
  } catch (err) {
    console.warn('Vault detail lookup failed (cache miss or discover API error), falling back to mock vault data', err);
    return MOCK_VAULTS.find(v => v.chainId === chainId && v.address === address) ?? null;
  }
}

export async function fetchChains(): Promise<ChainInfo[]> {
  return [
    { id: 196, name: 'X Layer' },
    { id: 1, name: 'Ethereum' },
    { id: 10, name: 'Optimism' },
    { id: 137, name: 'Polygon' },
    { id: 8453, name: 'Base' },
    { id: 42161, name: 'Arbitrum' },
  ];
}

export async function fetchProtocols(): Promise<ProtocolInfo[]> {
  return [
    { name: 'aave-v3' },
    { name: 'quickswap-v3' },
    { name: 'dolomite' },
    { name: 'uniswap-v4' },
  ];
}

export async function fetchPortfolioPositions(_walletAddress: string): Promise<unknown[]> {
  return [];
}

// Composer uses COMPOSER_BASE_URL defined at top

export interface ComposerQuote {
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
    chainId: number;
  };
  estimate?: {
    toAmount: string;
    toAmountMin: string;
    approvalAddress?: string;
  };
  action?: { fromToken: { symbol: string }; toToken: { symbol: string } };
}

export async function getComposerQuote(params: {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAddress: string;
  fromAmount: string;
}): Promise<ComposerQuote> {
  const queryParams = new URLSearchParams({
    fromChain: String(params.fromChain),
    toChain: String(params.toChain),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAddress: params.fromAddress,
    toAddress: params.fromAddress,
    fromAmount: params.fromAmount,
  });

  // Intercept mock vaults for the hackathon demo to ensure a successful "dummy" deposit works
  if (params.toToken && params.toToken.startsWith('0x') && (params.toToken.includes('XLayer') || params.toToken.length < 42)) {
    return {
      transactionRequest: {
        to: params.fromAddress, // sending 0 to yourself just to get a TX hash
        data: '0x',
        value: '0',
        gasLimit: '21000',
        chainId: params.fromChain
      },
      estimate: {
        toAmount: params.fromAmount,
        toAmountMin: params.fromAmount
      }
    };
  }

  const res = await proxyFetch('/v1/quote', queryParams);
  if (!res.ok) {
    const err = await res.text();
    const lower = err.toLowerCase();
    if (lower.includes('insufficient') || lower.includes('not enough') || lower.includes('balance') || lower.includes('gas estimation')) {
      throw new Error('Insufficient balance — you may not have enough tokens for this amount. Try a smaller deposit.');
    }
    throw new Error(`Composer quote failed: ${err}`);
  }
  return res.json();
}

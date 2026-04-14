import { useQuery } from '@tanstack/react-query';
import { fetchPortfolioPositions } from '../lib/lifi';
import { useAppStore } from '../store/appStore';

export function usePortfolio() {
  const wallet = useAppStore((s) => s.wallet);
  return useQuery({
    queryKey: ['portfolio', wallet],
    queryFn: () => fetchPortfolioPositions(wallet!),
    enabled: !!wallet,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

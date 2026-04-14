import { useQuery } from '@tanstack/react-query';
import { fetchVaults, fetchChains } from '../lib/lifi';
import { useAppStore } from '../store/appStore';
import { useEffect } from 'react';

export function useVaults(chainId?: number) {
  const setAllVaults = useAppStore((s) => s.setAllVaults);
  const setUsingCachedData = useAppStore((s) => s.setUsingCachedData);

  const query = useQuery({
    queryKey: ['vaults', chainId ?? 'all'],
    queryFn: () => fetchVaults(chainId || undefined),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 2,
  });

  useEffect(() => {
    if (query.data) {
      setAllVaults(query.data);
      const isMock = query.data.some(v => (v.address?.length ?? 0) < 10);
      setUsingCachedData(isMock);
    }
  }, [query.data, setAllVaults, setUsingCachedData]);

  return query;
}

export function useChains() {
  return useQuery({
    queryKey: ['chains'],
    queryFn: fetchChains,
    staleTime: Infinity,
  });
}

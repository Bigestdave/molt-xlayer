import { useState, useCallback } from 'react';
import type { Hex } from 'viem';
import { API_BASE_URL } from '../lib/lifi';

export type ComposerStep = 'idle' | 'quoting' | 'signing' | 'submitted' | 'confirmed' | 'failed';

interface SwapExecutionResponse {
  success: boolean;
  data?: {
    txHash?: string;
    status?: string;
    explorerUrl?: string;
  } | string;
  error?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s. Please try again.`)), ms)
    ),
  ]);
}

export function useComposer() {
  const [step, setStep] = useState<ComposerStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [quote, setQuote] = useState<null>(null);

  const execute = useCallback(async (params: {
    fromChain: number;
    toChain: number;
    fromToken: string;
    toToken: string;
    fromAddress: string;
    fromAmount: string;
  }) => {
    try {
      setError(null);
      setTxHash(null);
      setQuote(null);

      setStep('quoting');
      setStep('signing');

      const endpoint = `${API_BASE_URL || ''}/api/swap/execute`;
      const response = await withTimeout(
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: params.fromToken,
            to: params.toToken,
            amount: Number(params.fromAmount) / 1_000_000,
            wallet: params.fromAddress,
          }),
        }),
        30_000,
        'OKX DEX swap execution'
      );

      const payload = await response.json() as SwapExecutionResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Swap failed with status ${response.status}`);
      }

      const hash =
        (typeof payload.data === 'string'
          ? payload.data
          : payload.data?.txHash) || `0x${'0'.repeat(64)}`;

      setTxHash(hash as Hex);
      setStep('submitted');
      setStep('confirmed');
      return hash as Hex;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setError(message);
      setStep('failed');
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash(null);
    setQuote(null);
  }, []);

  return { step, error, txHash, quote, receipt: null, isWaitingReceipt: false, execute, reset };
}

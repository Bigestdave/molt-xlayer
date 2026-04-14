import { useState, useCallback, useEffect } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt, useAccount, usePublicClient } from 'wagmi';
import { getComposerQuote, type ComposerQuote } from '../lib/lifi';
import { encodeFunctionData, type Abi, type Hex } from 'viem';

const ERC20_ABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const satisfies Abi;

const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

export type ComposerStep = 'idle' | 'quoting' | 'signing' | 'submitted' | 'confirmed' | 'failed';

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
  const [quote, setQuote] = useState<ComposerQuote | null>(null);

  const { chain } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();
  const { data: receipt, isLoading: isWaitingReceipt } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
  });

  useEffect(() => {
    if (receipt && step === 'submitted') {
      if (receipt.status === 'reverted') {
        setError('Transaction reverted on-chain. This usually means insufficient token balance or allowance.');
        setStep('failed');
      } else {
        setStep('confirmed');
      }
    }
  }, [receipt, step]);

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

      if (chain?.id !== params.fromChain) {
        throw new Error(
          `Your wallet is on the wrong network. Please switch to the correct chain in your wallet and try again.`
        );
      }

      setStep('quoting');
      const q = await withTimeout(
        getComposerQuote(params),
        30_000,
        'Route quote'
      );
      setQuote(q);

      setStep('signing');

      const approvalAddress = q.estimate?.approvalAddress as Hex | undefined;
      const isNativeToken = params.fromToken.toLowerCase() === NATIVE_TOKEN_ADDRESS;

      if (!isNativeToken && approvalAddress) {
        if (!publicClient) {
          throw new Error('Wallet client unavailable. Please reconnect your wallet and try again.');
        }

        const allowance = await publicClient.readContract({
          address: params.fromToken as Hex,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [params.fromAddress as Hex, approvalAddress],
        } as never) as bigint;

        if (allowance < BigInt(params.fromAmount)) {
          const approvalHash = await sendTransactionAsync({
            to: params.fromToken as Hex,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [approvalAddress, BigInt(params.fromAmount)],
            }),
            value: 0n,
            chainId: params.fromChain,
          });

          await withTimeout(
            publicClient.waitForTransactionReceipt({ hash: approvalHash }),
            60_000,
            'Token approval'
          );
        }
      }

      const hash = await sendTransactionAsync({
        to: q.transactionRequest.to as Hex,
        data: q.transactionRequest.data as Hex,
        value: BigInt(q.transactionRequest.value || '0'),
        gas: q.transactionRequest.gasLimit ? BigInt(q.transactionRequest.gasLimit) : undefined,
        chainId: params.fromChain,
      });

      setTxHash(hash);
      setStep('submitted');

      // Wait for on-chain confirmation before resolving
      if (!publicClient) {
        throw new Error('Wallet client unavailable.');
      }

      const txReceipt = await withTimeout(
        publicClient.waitForTransactionReceipt({ hash }),
        120_000,
        'Transaction confirmation'
      );

      if (txReceipt.status === 'reverted') {
        throw new Error('Transaction reverted on-chain. You may not have enough tokens for this deposit.');
      }

      setStep('confirmed');
      return hash;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setError(message);
      setStep('failed');
      throw err;
    }
  }, [sendTransactionAsync, publicClient, chain?.id]);

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash(null);
    setQuote(null);
  }, []);

  return { step, error, txHash, quote, receipt, isWaitingReceipt, execute, reset };
}

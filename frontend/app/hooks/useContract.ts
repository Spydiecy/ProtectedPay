'use client';

import { useCallback } from 'react';
import { useWriteContract, useReadContract, usePublicClient, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { PROTECTED_PAY_ABI } from '../lib/abi';
import { CONTRACT_ADDRESS } from '../lib/wagmi';

export type { PROTECTED_PAY_ABI };

// ── Write hook — submit a tx and wait for inclusion ───────────────────────────
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient();

  return useCallback(async (
    functionName: string,
    args: unknown[],
    value: bigint = 0n,
    onSuccess?: () => void,
    onError?: (err: string) => void,
  ) => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: PROTECTED_PAY_ABI,
        functionName: functionName as never,
        args: args as never,
        value,
      });
      // Wait for tx to be mined
      if (client) await client.waitForTransactionReceipt({ hash });
      onSuccess?.();
    } catch (e: unknown) {
      const msg = e instanceof Error
        ? (e.message.includes('revert') ? e.message.split('revert')[1]?.trim() || e.message : e.message)
        : String(e);
      onError?.(msg);
      throw e;
    }
  }, [writeContractAsync, client]);
}

// ── Read hook — call a view function ─────────────────────────────────────────
export function useQuery() {
  const client = usePublicClient();
  const { address } = useAccount();

  return useCallback(async (functionName: string, args: unknown[] = []) => {
    if (!client) throw new Error('No public client');
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: PROTECTED_PAY_ABI,
      functionName: functionName as never,
      args: args as never,
      account: address,
    });
    return result;
  }, [client, address]);
}

// ── Convenience hook for a single read contract value ─────────────────────────
export function useContractRead(functionName: string, args: unknown[] = []) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PROTECTED_PAY_ABI,
    functionName: functionName as never,
    args: args as never,
  });
}

// ── Parse ether helper re-exported ────────────────────────────────────────────
export { parseEther };

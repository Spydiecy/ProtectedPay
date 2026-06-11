'use client';

import { useState, useCallback } from 'react';
import { useAccount, useBalance, usePublicClient } from 'wagmi';
import { PROTECTED_PAY_ABI, ESCROW_STATUS_LABEL, GROUP_STATUS_LABEL } from '../lib/abi';
import { CONTRACT_ADDRESS, formatNative } from '../lib/wagmi';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface EscrowRecord {
  id: string;
  sender: string;
  recipient: string;
  amount: string;      // raw wei as string
  status: string;      // 'Pending' | 'Claimed' | 'Refunded'
  remarks: string;
  createdAt: string;
}

export interface GroupRecord {
  id: string;
  creator: string;
  recipient: string;
  totalAmount: string;
  amountPerPerson: string;
  numParticipants: string;
  contributedCount: string;
  amountCollected: string;
  remarks: string;
  status: string;      // 'Open' | 'Completed' | 'Cancelled'
  createdAt: string;
}

export interface BatchRecord {
  id: string;
  creator: string;
  totalAmount: string;
  recipientCount: string;
  remarks: string;
  createdAt: string;
}

// ── Format helpers ─────────────────────────────────────────────────────────────
export function formatPOT(raw: string): string {
  if (!raw || raw === '0') return '0 QIE';
  try {
    const wei = BigInt(raw.replace(/,/g, ''));
    const formatted = formatNative(wei);
    const symbol = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'QIE';
    return `${formatted} ${symbol}`;
  } catch {
    return '— QIE';
  }
}

export function shortAddr(a: string): string {
  if (!a || a.length < 10) return a;
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

// ── Map raw tuple from contract → typed record ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEscrow(e: any): EscrowRecord {
  return {
    id:        String(e.id),
    sender:    e.sender,
    recipient: e.recipient,
    amount:    String(e.amount),
    status:    ESCROW_STATUS_LABEL[Number(e.status)] ?? 'Unknown',
    remarks:   e.remarks,
    createdAt: String(e.createdAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGroup(g: any): GroupRecord {
  return {
    id:               String(g.id),
    creator:          g.creator,
    recipient:        g.recipient,
    totalAmount:      String(g.totalAmount),
    amountPerPerson:  String(g.amountPerPerson),
    numParticipants:  String(g.numParticipants),
    contributedCount: String(g.contributedCount),
    amountCollected:  String(g.amountCollected),
    remarks:          g.remarks,
    status:           GROUP_STATUS_LABEL[Number(g.status)] ?? 'Unknown',
    createdAt:        String(g.createdAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBatch(b: any): BatchRecord {
  return {
    id:             String(b.id),
    creator:        b.creator,
    totalAmount:    String(b.totalAmount),
    recipientCount: String(b.recipientCount),
    remarks:        b.remarks,
    createdAt:      String(b.createdAt),
  };
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useHistory() {
  const { address } = useAccount();
  const client      = usePublicClient();
  const { data: balanceData, refetch: refetchBalance } = useBalance({ address });

  const [escrows,  setEscrows]  = useState<EscrowRecord[]>([]);
  const [groups,   setGroups]   = useState<GroupRecord[]>([]);
  const [batches,  setBatches]  = useState<BatchRecord[]>([]);
  const [balance,  setBalance]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const refresh = useCallback(async () => {
    if (!address || !client) return;
    setLoading(true);
    try {
      // Balance
      const bal = await refetchBalance();
      if (bal.data) {
        setBalance(String(bal.data.value));
      }

      // getUserEscrows — contract returns both sent and received
      const rawEscrows = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: PROTECTED_PAY_ABI,
        functionName: 'getUserEscrows',
        args: [address],
      }) as unknown[];
      setEscrows([...rawEscrows].reverse().map(mapEscrow));

      // getUserGroups — includes creator, recipient, AND contributors
      const rawGroups = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: PROTECTED_PAY_ABI,
        functionName: 'getUserGroups',
        args: [address],
      }) as unknown[];
      setGroups([...rawGroups].reverse().map(mapGroup));

      // getUserBatches — only creator
      const rawBatches = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: PROTECTED_PAY_ABI,
        functionName: 'getUserBatches',
        args: [address],
      }) as unknown[];
      setBatches([...rawBatches].reverse().map(mapBatch));

    } catch (err) {
      console.warn('History refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [address, client, refetchBalance]);

  // Also expose formatted balance
  const formattedBalance = balance ? formatPOT(balance)
    : balanceData ? `${formatNative(balanceData.value)} ${balanceData.symbol}`
    : null;

  return { escrows, groups, batches, balance, formattedBalance, loading, refresh };
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import { parseEther, formatEther, formatUnits } from 'viem';
import { getKnownToken } from '../../lib/tokens';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useHistory, formatPOT, EscrowRecord, GroupRecord, BatchRecord, TokenEscrowRecord, PaymentLinkRecord } from '../../hooks/useHistory';
import { PROTECTED_PAY_ABI, ESCROW_STATUS_LABEL } from '../../lib/abi';
import { shortAddress } from '../../lib/wagmi';
import { useContractAddress } from '../../hooks/useContract';
import Toast, { ToastType } from '../../components/Toast';
import UsdValue from '../../components/UsdValue';
import { AppTab } from './Sidebar';
import {
  Lock, Users, Zap, History, ArrowRight,
  CheckCircle, RefreshCw, Copy, Check,
  ArrowUpRight, ArrowDownLeft, Coins, Link2, CheckCircle2,
} from 'lucide-react';

interface UserProfile { username: string; createdAt: bigint; }

const QUICK_ACTIONS: { tab: AppTab; icon: React.ElementType; label: string }[] = [
  { tab: 'protected', icon: Lock,    label: 'Protected Transfer' },
  { tab: 'group',     icon: Users,   label: 'Group Split'        },
  { tab: 'batch',     icon: Zap,     label: 'Batch Payment'      },
  { tab: 'history',   icon: History, label: 'History'            },
];

export default function HomePanel({ onTabChange }: { onTabChange: (tab: AppTab) => void }) {
  const contractAddress = useContractAddress();
  const { address } = useAccount();
  const chainId     = useChainId();
  const client      = usePublicClient();
  const { escrows, tokenEscrows, groups, batches, paymentLinks, balance, formattedBalance, loading: histLoading, refresh } = useHistory();

  // Native balance as a human amount, for the live USD equivalent.
  const balanceRaw = (() => {
    if (!balance) return null;
    try { return formatEther(BigInt(balance)); } catch { return null; }
  })();
  const { writeContractAsync } = useWriteContract();

  const [profile,  setProfile]  = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; type: ToastType } | null>(null);
  const [copied,   setCopied]   = useState(false);
  const [txHash,   setTxHash]   = useState<`0x${string}` | undefined>();

  const { isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const t = (msg: string, type: ToastType) => setToast({ msg, type });

  useEffect(() => {
    if (!address || !client) return;
    setProfile(null);
    client.readContract({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'getUser', args: [address] })
      .then(d => setProfile(d as UserProfile))
      .catch(() => setProfile(null));
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, chainId, contractAddress]);

  useEffect(() => {
    if (txSuccess) { t('Username registered!', 'success'); refresh(); setProfile({ username, createdAt: BigInt(Date.now()) }); setUsername(''); setTxHash(undefined); }
  }, [txSuccess]); // eslint-disable-line

  const handleRegister = useCallback(async () => {
    if (!username || username.length < 3 || username.length > 30) { t('Username must be 3–30 characters', 'error'); return; }
    setLoading(true); t('Submitting…', 'loading');
    try {
      const hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'registerUsername', args: [username] });
      setTxHash(hash);
    } catch (e: unknown) { t(e instanceof Error ? e.message : 'Failed', 'error'); setLoading(false); }
    finally { setLoading(false); }
  }, [username, writeContractAsync]);

  const addr = address ?? '';
  const shortAddr = addr ? `${addr.slice(0, 12)}…${addr.slice(-8)}` : '';
  const copyAddr = () => { navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  type AnyTxn =
    | { kind: 'protected'; data: EscrowRecord;      ts: number }
    | { kind: 'token';     data: TokenEscrowRecord; ts: number }
    | { kind: 'group';     data: GroupRecord;       ts: number }
    | { kind: 'batch';     data: BatchRecord;       ts: number }
    | { kind: 'link';      data: PaymentLinkRecord; ts: number };

  const recentTxns: AnyTxn[] = [
    ...escrows.map(d      => ({ kind: 'protected' as const, data: d, ts: parseInt(d.createdAt)      || 0 })),
    ...tokenEscrows.map(d => ({ kind: 'token'     as const, data: d, ts: parseInt(d.createdAt)      || 0 })),
    ...groups.map(d       => ({ kind: 'group'     as const, data: d, ts: parseInt(d.createdAt)      || 0 })),
    ...batches.map(d      => ({ kind: 'batch'     as const, data: d, ts: parseInt(d.createdAt)      || 0 })),
    ...paymentLinks.map(d => ({ kind: 'link'      as const, data: d, ts: parseInt(d.paidAt || d.createdAt) || 0 })),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5);

  return (
    <div style={{ padding: '32px 36px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, color: 'var(--foreground-subtle)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.2 }}>
          {address ? `Welcome back` : 'Welcome'}
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-1.5px' }}>Dashboard</h1>
      </div>

      {/* Top row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Identity */}
        <div style={{ padding: '22px 24px', borderRadius: 16, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--foreground-subtle)', textTransform: 'uppercase', marginBottom: 14 }}>Identity</p>
          {profile?.username ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <CheckCircle size={18} color="var(--primary)" />
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px' }}>@{profile.username}</span>
              </div>
              <button onClick={copyAddr} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--foreground-muted)', flex: 1 }}>{shortAddr}</span>
                {copied ? <Check size={13} color="var(--primary)" /> : <Copy size={13} color="var(--foreground-subtle)" />}
              </button>
            </>
          ) : (
            <>
              <button onClick={copyAddr} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, marginBottom: 12, background: 'var(--surface-elevated)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--foreground-muted)', flex: 1 }}>{shortAddr}</span>
                {copied ? <Check size={13} color="var(--primary)" /> : <Copy size={13} color="var(--foreground-subtle)" />}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="register @username"
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 9, background: 'var(--surface-elevated)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: 13, outline: 'none' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                <button onClick={handleRegister} disabled={loading} style={{ padding: '9px 16px', borderRadius: 9, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Register
                </button>
              </div>
              {username && <p style={{ fontSize: 10, marginTop: 5, color: username.length >= 3 && username.length <= 30 ? 'var(--primary)' : 'var(--error)' }}>{username.length}/30 {username.length >= 3 && username.length <= 30 ? '✓' : '(3–30)'}</p>}
            </>
          )}
        </div>

        {/* Balance */}
        <div style={{ padding: '22px 24px', borderRadius: 16, background: 'var(--primary-container)', border: '1px solid var(--primary)30', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--on-primary-container)', opacity: 0.65, textTransform: 'uppercase' }}>Balance</p>
            <button onClick={refresh} disabled={histLoading} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'var(--on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={13} style={{ animation: histLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
          <div>
            <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--on-primary-container)', letterSpacing: '-1.5px', lineHeight: 1, marginTop: 12 }}>
              {formattedBalance ?? '—'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <p style={{ fontSize: 12, color: 'var(--on-primary-container)', opacity: 0.55 }}>Available</p>
              {balanceRaw && (
                <UsdValue
                  symbol={process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'C2FLR'}
                  amount={balanceRaw}
                  size={12}
                  style={{ color: 'var(--on-primary-container)', opacity: 0.75 }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--foreground-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>Quick Actions</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {QUICK_ACTIONS.map(({ tab, icon: Icon, label }) => (
          <button key={tab} onClick={() => onTabChange(tab)} style={{ padding: '18px 16px', borderRadius: 14, textAlign: 'left', background: 'var(--surface-card)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 12 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color="var(--primary)" />
              </div>
              <ArrowRight size={13} color="var(--foreground-subtle)" />
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{label}</p>
          </button>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Recent Activity</p>
          <button onClick={() => onTabChange('history')} style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
        </div>

        {recentTxns.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>No transactions yet</p>
            <p style={{ fontSize: 12, color: 'var(--foreground-subtle)', marginTop: 5 }}>Your activity will appear here</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentTxns.map(txn => {
              if (txn.kind === 'protected') {
                const e = txn.data as EscrowRecord;
                const isSender = e.sender.toLowerCase() === addr.toLowerCase();
                const counterAddr = isSender ? e.recipient : e.sender;
                const statusLabel = ESCROW_STATUS_LABEL[Number(e.status)] ?? e.status;
                return (
                  <div key={`e-${e.id}`} style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSender ? <ArrowUpRight size={16} color="var(--foreground-muted)" /> : <ArrowDownLeft size={16} color="var(--primary)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{formatPOT(e.amount)}</span>
                          <UsdValue symbol={process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'C2FLR'} amount={formatEther(BigInt(e.amount || '0'))} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground-subtle)', padding: '2px 7px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>{statusLabel}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Protected · {isSender ? '→' : '←'}</span>
                          <button onClick={() => navigator.clipboard.writeText(counterAddr)} style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--foreground-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {shortAddress(counterAddr)} <Copy size={10} color="var(--foreground-subtle)" />
                          </button>
                        </div>
                        {e.remarks && <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', marginTop: 2, fontStyle: 'italic' }}>&ldquo;{e.remarks}&rdquo;</p>}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--foreground-subtle)', flexShrink: 0 }}>#{e.id}</span>
                    </div>
                  </div>
                );
              }
              if (txn.kind === 'group') {
                const g = txn.data as GroupRecord;
                return (
                  <div key={`g-${g.id}`} style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Users size={16} color="var(--foreground-muted)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{formatPOT(g.totalAmount)}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground-subtle)', padding: '2px 7px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>{g.status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>Group · {g.contributedCount}/{g.numParticipants} contributors</p>
                      {g.remarks && <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', marginTop: 2, fontStyle: 'italic' }}>&ldquo;{g.remarks}&rdquo;</p>}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--foreground-subtle)', flexShrink: 0 }}>#{g.id}</span>
                  </div>
                );
              }
              if (txn.kind === 'token') {
                const e = txn.data as TokenEscrowRecord;
                const isSender = e.sender.toLowerCase() === addr.toLowerCase();
                const statusLabel = ESCROW_STATUS_LABEL[Number(e.status)] ?? e.status;
                const known = getKnownToken(e.token);
                const amtRaw = (() => { try { return formatUnits(BigInt(e.amount), known?.decimals ?? 18); } catch { return null; } })();
                return (
                  <div key={`te-${e.id}`} style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface-card)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,191,36,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {known
                        ? <img src={known.logo} alt={known.symbol} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        : <Coins size={16} color="var(--warning)" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                          {known ? known.symbol : 'Token'} Escrow
                        </span>
                        {known && amtRaw && <UsdValue symbol={known.symbol} amount={amtRaw} />}
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-subtle)', fontWeight: 600 }}>{statusLabel}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>
                        {amtRaw && `${parseFloat(amtRaw).toLocaleString('en-US', { maximumFractionDigits: 6 })} · `}
                        {isSender ? 'Sent to' : 'Received from'} {shortAddress(isSender ? e.recipient : e.sender)}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--foreground-subtle)', flexShrink: 0 }}>#{e.id}</span>
                  </div>
                );
              }
              if (txn.kind === 'link') {
                const l = txn.data as PaymentLinkRecord;
                const isPaid = l.status === 'Paid';
                return (
                  <div key={`l-${l.linkId}`} style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: isPaid ? 'rgba(45,212,191,0.1)' : 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isPaid ? <CheckCircle2 size={16} color="var(--primary)" /> : <Link2 size={16} color="var(--foreground-muted)" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                          {l.amount === '0' ? 'Open amount' : formatPOT(l.amount)}
                        </span>
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 999, background: isPaid ? 'rgba(45,212,191,0.12)' : 'var(--surface-elevated)', border: `1px solid ${isPaid ? 'rgba(45,212,191,0.3)' : 'var(--border)'}`, color: isPaid ? 'var(--primary)' : 'var(--foreground-subtle)', fontWeight: 600 }}>{l.status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>Payment Link · {l.description}</p>
                    </div>
                  </div>
                );
              }
              const b = txn.data as BatchRecord;
              return (
                <div key={`b-${b.id}`} style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={16} color="var(--foreground-muted)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{formatPOT(b.totalAmount)}</span>
                    <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>Batch · {b.recipientCount} recipients</p>
                    {b.remarks && <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', marginTop: 2, fontStyle: 'italic' }}>&ldquo;{b.remarks}&rdquo;</p>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--foreground-subtle)', flexShrink: 0 }}>#{b.id}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

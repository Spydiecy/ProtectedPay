'use client';

import { useState, useCallback, useEffect } from 'react';
import { parseEther } from 'viem';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useHistory, formatPOT, EscrowRecord } from '../hooks/useHistory';
import { PROTECTED_PAY_ABI, ESCROW_STATUS_LABEL } from '../lib/abi';
import { CONTRACT_ADDRESS, shortAddress } from '../lib/wagmi';
import WalletGuard from '../components/WalletGuard';
import Toast, { ToastType } from '../components/Toast';
import { Lock, ArrowDownCircle, RotateCcw, RefreshCw, AtSign } from 'lucide-react';

const INPUT: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 10,
  background: 'var(--surface-elevated)', color: 'var(--foreground)',
  border: '1px solid var(--border)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

function EscrowContent() {
  const { address } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { escrows, loading: histLoading, refresh } = useHistory();

  const [recipient,         setRecipient]         = useState('');
  const [resolvedRecipient, setResolvedRecipient] = useState('');
  const [amount,            setAmount]            = useState('');
  const [remarks,           setRemarks]           = useState('');
  const [loading,           setLoading]           = useState(false);
  const [toast,             setToast]             = useState<{ msg: string; type: ToastType } | null>(null);
  const [txHash,            setTxHash]            = useState<`0x${string}` | undefined>();

  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const t = (msg: string, type: ToastType) => setToast({ msg, type });

  useEffect(() => { refresh(); }, [address]); // eslint-disable-line
  useEffect(() => {
    if (isSuccess) { t('Done!', 'success'); refresh(); setTxHash(undefined); }
  }, [isSuccess]); // eslint-disable-line

  const resolveIfUsername = useCallback(async (val: string) => {
    if (!val.startsWith('@') && (val.startsWith('0x') || val.length === 42)) { setResolvedRecipient(''); return; }
    const uname = val.startsWith('@') ? val.slice(1) : val;
    if (!uname || uname.length < 2) return;
    try {
      const addr = await client?.readContract({ address: CONTRACT_ADDRESS, abi: PROTECTED_PAY_ABI, functionName: 'resolveUsername', args: [uname] }) as `0x${string}` | null;
      if (addr && addr !== '0x0000000000000000000000000000000000000000') { setResolvedRecipient(addr); t(`Resolved @${uname}`, 'success'); }
      else { setResolvedRecipient(''); t(`@${uname} not found`, 'error'); }
    } catch { setResolvedRecipient(''); }
  }, [client]);

  const effectiveRecipient = (resolvedRecipient || recipient) as `0x${string}`;

  const handleCreate = useCallback(async () => {
    if (!effectiveRecipient || !amount || !remarks) { t('Fill all fields', 'error'); return; }
    setLoading(true); t('Submitting…', 'loading');
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS, abi: PROTECTED_PAY_ABI,
        functionName: 'createEscrow',
        args: [effectiveRecipient, remarks],
        value: parseEther(amount),
      });
      setTxHash(hash); t('Transfer created!', 'success');
      setRecipient(''); setResolvedRecipient(''); setAmount(''); setRemarks('');
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [effectiveRecipient, amount, remarks, writeContractAsync]);

  const handleClaim = useCallback(async (id: string) => {
    setLoading(true); t('Claiming…', 'loading');
    try {
      const hash = await writeContractAsync({ address: CONTRACT_ADDRESS, abi: PROTECTED_PAY_ABI, functionName: 'claimEscrow', args: [BigInt(id)] });
      setTxHash(hash);
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [writeContractAsync]);

  const handleRefund = useCallback(async (id: string) => {
    setLoading(true); t('Refunding…', 'loading');
    try {
      const hash = await writeContractAsync({ address: CONTRACT_ADDRESS, abi: PROTECTED_PAY_ABI, functionName: 'refundEscrow', args: [BigInt(id)] });
      setTxHash(hash);
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [writeContractAsync]);

  const myAddr = (address ?? '').toLowerCase();

  return (
    <div style={{ padding: '32px 36px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 6 }}>ProtectedPay</p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-1px' }}>Protected Transfer</h1>
        <p style={{ fontSize: 14, color: 'var(--foreground-muted)', marginTop: 4 }}>Lock funds until the recipient claims them</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: 20, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Create form */}
        <div style={{ padding: '28px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <Lock size={17} color="var(--primary)" />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Create Transfer</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Recipient Address or @username</label>
              <div style={{ position: 'relative' }}>
                <input value={recipient} onChange={e => { setRecipient(e.target.value); setResolvedRecipient(''); }}
                  onBlur={e => resolveIfUsername(e.target.value)}
                  placeholder="0x… address or @username"
                  style={{ ...INPUT, paddingRight: recipient.startsWith('@') ? 40 : 16 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                />
                {recipient.startsWith('@') && <AtSign size={15} color="var(--primary)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
              </div>
              {resolvedRecipient && <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: 5, fontFamily: 'monospace' }}>✓ {resolvedRecipient.slice(0, 14)}…{resolvedRecipient.slice(-8)}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Amount ({process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'ETH'})
              </label>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.0001" placeholder="0.01"
                style={INPUT} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Remarks</label>
              <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Payment for services…"
                style={INPUT} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
            <button onClick={handleCreate} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.6 : 1 }}>
              <Lock size={16} /> Create Transfer
            </button>
          </div>
        </div>

        {/* Transfers list */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)' }}>
              My Transfers
              {escrows.length > 0 && <span style={{ marginLeft: 10, padding: '3px 10px', borderRadius: 999, background: 'rgba(45,212,191,0.12)', color: 'var(--primary)', border: '1px solid rgba(45,212,191,0.25)', fontSize: 12, fontWeight: 700 }}>{escrows.length}</span>}
            </span>
            <button onClick={refresh} disabled={histLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              <RefreshCw size={13} style={{ animation: histLoading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {escrows.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                <Lock size={28} color="var(--foreground-subtle)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 15, color: 'var(--foreground-muted)' }}>No transfers yet</p>
              </div>
            ) : (
              escrows.map((e: EscrowRecord) => {
                const isSender = e.sender.toLowerCase() === myAddr;
                const isPending = e.status === 'Pending' || Number(e.status) === 0;
                const statusLabel = ESCROW_STATUS_LABEL[Number(e.status)] ?? e.status;
                const statusColor = statusLabel === 'Refunded' ? 'var(--foreground-muted)' : 'var(--primary)';
                return (
                  <div key={e.id} style={{ padding: '22px 24px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(45,212,191,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Lock size={18} color={isSender ? 'var(--foreground-muted)' : 'var(--primary)'} />
                        </div>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground-subtle)', display: 'block' }}>#{e.id}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isSender ? 'var(--foreground-muted)' : 'var(--primary)' }}>{isSender ? 'SENT' : 'RECEIVED'}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, padding: '4px 12px', borderRadius: 999, background: `${statusColor === 'var(--primary)' ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)'}` }}>{statusLabel}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px' }}>{formatPOT(e.amount)}</span>
                      <button onClick={() => navigator.clipboard.writeText(isSender ? e.recipient : e.sender)}
                        style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--foreground-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isSender ? `→ ${shortAddress(e.recipient)}` : `← ${shortAddress(e.sender)}`}
                      </button>
                    </div>
                    {e.remarks && <p style={{ fontSize: 13, color: 'var(--foreground-subtle)', marginBottom: isPending ? 14 : 0, fontStyle: 'italic' }}>&ldquo;{e.remarks}&rdquo;</p>}
                    {isPending && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                        {!isSender && (
                          <button onClick={() => handleClaim(e.id)} disabled={loading} style={{ flex: 1, padding: '11px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <ArrowDownCircle size={15} /> Claim
                          </button>
                        )}
                        {isSender && (
                          <button onClick={() => handleRefund(e.id)} disabled={loading} style={{ flex: 1, padding: '11px', borderRadius: 999, background: 'var(--surface-elevated)', color: 'var(--foreground-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <RotateCcw size={15} /> Refund
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function EscrowPage() {
  return <WalletGuard><EscrowContent /></WalletGuard>;
}

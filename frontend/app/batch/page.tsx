'use client';

import { useState, useCallback, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useHistory, formatPOT, BatchRecord } from '../hooks/useHistory';
import { PROTECTED_PAY_ABI } from '../lib/abi';
import { CONTRACT_ADDRESS } from '../lib/wagmi';
import WalletGuard from '../components/WalletGuard';
import Toast, { ToastType } from '../components/Toast';
import { Zap, Plus, Trash2, RefreshCw, AtSign, ChevronDown, ChevronUp, Users } from 'lucide-react';

interface Row { address: string; amount: string; resolvedFrom?: string; }
interface BatchRecipientItem { account: string; amount: bigint; }

const NATIVE = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'ETH';

// ── Batch card with expandable recipients ─────────────────────────────────────
function BatchCard({ b, client }: { b: BatchRecord; client: ReturnType<typeof usePublicClient> }) {
  const [open,       setOpen]       = useState(false);
  const [recipients, setRecipients] = useState<BatchRecipientItem[] | null>(null);
  const [loading,    setLoading]    = useState(false);

  const loadRecipients = useCallback(async () => {
    if (recipients !== null) return; // already loaded
    setLoading(true);
    try {
      const count = Number(b.recipientCount);
      const items = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          client?.readContract({
            address: CONTRACT_ADDRESS,
            abi: PROTECTED_PAY_ABI,
            functionName: 'getBatchRecipient',
            args: [BigInt(b.id), i as unknown as number],
          }) as Promise<{ account: string; amount: bigint }>
        )
      );
      setRecipients(items.map(r => ({ account: r.account, amount: r.amount })));
    } catch (err) {
      console.warn('Failed to load batch recipients:', err);
      setRecipients([]);
    } finally {
      setLoading(false);
    }
  }, [b.id, b.recipientCount, client, recipients]);

  const toggle = () => {
    if (!open) loadRecipients();
    setOpen(o => !o);
  };

  const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;

  return (
    <div style={{ borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(45,212,191,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={18} color="var(--primary)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px' }}>{formatPOT(b.totalAmount)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.06)', color: 'var(--foreground-muted)' }}>SENT</span>
            <span style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}>#{b.id}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--foreground-muted)', marginTop: 3 }}>
            {b.recipientCount} recipient{Number(b.recipientCount) !== 1 ? 's' : ''} · &ldquo;{b.remarks}&rdquo;
          </p>
          {b.createdAt && b.createdAt !== '0' && (
            <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', marginTop: 3 }}>
              {new Date(parseInt(b.createdAt) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <button
          onClick={toggle}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: open ? 'var(--primary-container)' : 'var(--surface-elevated)', border: `1px solid ${open ? 'rgba(45,212,191,0.3)' : 'var(--border)'}`, color: open ? 'var(--on-primary-container)' : 'var(--foreground-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
        >
          <Users size={13} />
          {open ? 'Hide' : 'Recipients'}
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Expanded recipients */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px', background: 'var(--surface-elevated)' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--foreground-muted)', fontSize: 13 }}>
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
              Loading recipients…
            </div>
          ) : recipients && recipients.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>
                Recipient breakdown
              </p>
              {recipients.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 9, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', fontFamily: 'monospace', minWidth: 20 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--foreground-muted)' }}>
                      {short(r.account)}
                    </span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.3px' }}>
                    {parseFloat(formatEther(r.amount)).toFixed(6)} {NATIVE}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}>
                  Total: {formatPOT(b.totalAmount)}
                </span>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--foreground-subtle)' }}>No recipient data found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main batch content ────────────────────────────────────────────────────────
function BatchContent() {
  const { address } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { batches, loading: histLoading, refresh } = useHistory();

  const [rows,    setRows]    = useState<Row[]>([{ address: '', amount: '' }]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; type: ToastType } | null>(null);
  const [txHash,  setTxHash]  = useState<`0x${string}` | undefined>();

  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const t = (msg: string, type: ToastType) => setToast({ msg, type });

  useEffect(() => { refresh(); }, [address]); // eslint-disable-line
  useEffect(() => {
    if (isSuccess) { t('Batch complete!', 'success'); refresh(); setTxHash(undefined); }
  }, [isSuccess]); // eslint-disable-line

  const addRow    = () => setRows(r => [...r, { address: '', amount: '' }]);
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, f: keyof Row, v: string) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [f]: v } : row));

  const resolveUsername = useCallback(async (i: number, val: string) => {
    const uname = val.startsWith('@') ? val.slice(1) : val;
    if (!uname) return;
    try {
      const addr = await client?.readContract({
        address: CONTRACT_ADDRESS, abi: PROTECTED_PAY_ABI,
        functionName: 'resolveUsername', args: [uname],
      }) as `0x${string}` | null;
      if (addr && addr !== '0x0000000000000000000000000000000000000000') {
        setRows(r => r.map((row, idx) => idx === i ? { ...row, address: addr, resolvedFrom: uname } : row));
        t(`Resolved @${uname}`, 'success');
      } else t(`@${uname} not found`, 'error');
    } catch { t('Resolution failed', 'error'); }
  }, [client]);

  const total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const handleBatch = useCallback(async () => {
    if (!remarks) { t('Add remarks', 'error'); return; }
    if (rows.some(r => !r.address || !r.amount || parseFloat(r.amount) <= 0)) {
      t('Fill all rows', 'error'); return;
    }

    const resolved = await Promise.all(rows.map(async (row) => {
      if (row.resolvedFrom) return row;
      if (!row.address.startsWith('0x') || row.address.length !== 42) {
        const uname = row.address.startsWith('@') ? row.address.slice(1) : row.address;
        const addr = await client?.readContract({
          address: CONTRACT_ADDRESS, abi: PROTECTED_PAY_ABI,
          functionName: 'resolveUsername', args: [uname],
        }) as `0x${string}` | null;
        if (addr && addr !== '0x0000000000000000000000000000000000000000') return { ...row, address: addr };
        else { t(`@${uname} not found`, 'error'); return null; }
      }
      return row;
    }));
    if (resolved.some(r => r === null)) return;

    const addrs   = resolved.map(r => r!.address as `0x${string}`);
    const amounts = resolved.map(r => parseEther(r!.amount));
    const totalWei = amounts.reduce((s, a) => s + a, 0n);

    setLoading(true); t('Submitting batch…', 'loading');
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS, abi: PROTECTED_PAY_ABI,
        functionName: 'batchTransfer', args: [addrs, amounts, remarks],
        value: totalWei,
      });
      setTxHash(hash);
      setRows([{ address: '', amount: '' }]);
      setRemarks('');
    } catch (e: unknown) {
      t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [rows, remarks, writeContractAsync, client]);

  return (
    <div style={{ padding: '32px 36px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 6 }}>ProtectedPay</p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-1px' }}>Batch Payment</h1>
        <p style={{ fontSize: 14, color: 'var(--foreground-muted)', marginTop: 4 }}>Send to multiple recipients in one atomic transaction</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: 20, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Left: send form ── */}
        <div style={{ padding: '28px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', alignSelf: 'flex-start', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Zap size={17} color="var(--primary)" />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Recipients</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {rows.map((row, i) => (
              <div key={i}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Address / username input */}
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      value={row.resolvedFrom ? `@${row.resolvedFrom} → ${row.address.slice(0, 8)}…` : row.address}
                      onChange={e => {
                        updateRow(i, 'address', e.target.value);
                        if (row.resolvedFrom) setRows(r => r.map((r2, j) => j === i ? { ...r2, resolvedFrom: undefined } : r2));
                      }}
                      onBlur={e => {
                        const v = e.target.value;
                        if (v.startsWith('@') || (!v.startsWith('0x') && v.length > 2)) resolveUsername(i, v);
                        e.target.style.borderColor = 'var(--border)';
                      }}
                      placeholder="0x… or @username"
                      style={{ width: '100%', padding: '11px 36px 11px 14px', borderRadius: 9, background: 'var(--surface-elevated)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: 12, fontFamily: row.resolvedFrom ? 'inherit' : 'monospace', outline: 'none', boxSizing: 'border-box' as const }}
                      onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                    />
                    {(row.address.startsWith('@') || (row.address && !row.address.startsWith('0x') && !row.resolvedFrom)) && (
                      <AtSign size={13} color="var(--primary)" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    )}
                  </div>
                  {/* Amount input */}
                  <div style={{ position: 'relative', width: 110 }}>
                    <input
                      value={row.amount}
                      onChange={e => updateRow(i, 'amount', e.target.value)}
                      type="number" min="0" step="0.0001" placeholder="0.0"
                      style={{ width: '100%', padding: '11px 36px 11px 12px', borderRadius: 9, background: 'var(--surface-elevated)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
                      onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--foreground-subtle)', fontWeight: 700, pointerEvents: 'none' }}>{NATIVE}</span>
                  </div>
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--error)', flexShrink: 0, display: 'flex' }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                {row.resolvedFrom && (
                  <p style={{ fontSize: 11, color: 'var(--primary)', marginTop: 3, paddingLeft: 4 }}>✓ Resolved @{row.resolvedFrom}</p>
                )}
              </div>
            ))}
          </div>

          <button onClick={addRow} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, marginBottom: 16, background: 'transparent', border: '1px dashed var(--border)', color: 'var(--foreground-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> Add Recipient
          </button>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Remarks</label>
            <input
              value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Payroll, airdrop…"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: 'var(--surface-elevated)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--foreground-muted)', fontWeight: 500 }}>Total · {rows.length} recipient{rows.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>{total.toFixed(6)} {NATIVE}</span>
            </div>
          )}

          <button onClick={handleBatch} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.6 : 1 }}>
            <Zap size={16} /> Send Batch
          </button>
          <p style={{ fontSize: 12, color: 'var(--foreground-subtle)', marginTop: 10, textAlign: 'center' }}>Tip: use @username instead of address</p>
        </div>

        {/* ── Right: batch history ── */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)' }}>
              My Batches
              {batches.length > 0 && (
                <span style={{ marginLeft: 10, padding: '3px 10px', borderRadius: 999, background: 'rgba(45,212,191,0.12)', color: 'var(--primary)', border: '1px solid rgba(45,212,191,0.25)', fontSize: 12, fontWeight: 700 }}>
                  {batches.length}
                </span>
              )}
            </span>
            <button onClick={refresh} disabled={histLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              <RefreshCw size={13} style={{ animation: histLoading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {batches.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                <Zap size={28} color="var(--foreground-subtle)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 15, color: 'var(--foreground-muted)' }}>No batch payments yet</p>
              </div>
            ) : (
              batches.map((b: BatchRecord) => (
                <BatchCard key={b.id} b={b} client={client} />
              ))
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function BatchPage() {
  return <WalletGuard><BatchContent /></WalletGuard>;
}

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useHistory, formatPOT, EscrowRecord, GroupRecord, BatchRecord } from '../hooks/useHistory';
import { ESCROW_STATUS_LABEL, GROUP_STATUS_LABEL } from '../lib/abi';
import { shortAddress } from '../lib/wagmi';
import WalletGuard from '../components/WalletGuard';
import { RefreshCw, ArrowUpRight, ArrowDownLeft, Users, Zap, History, Copy } from 'lucide-react';

type HistoryTab = 'all' | 'protected' | 'group' | 'batch';

function HistoryContent() {
  const { address } = useAccount();
  const { escrows, groups, batches, loading, refresh } = useHistory();
  const [tab, setTab] = useState<HistoryTab>('all');

  useEffect(() => { refresh(); }, [address]); // eslint-disable-line

  const myAddr = (address ?? '').toLowerCase();

  const TABS: { key: HistoryTab; label: string; count: number }[] = [
    { key: 'all',       label: 'All',       count: escrows.length + groups.length + batches.length },
    { key: 'protected', label: 'Protected', count: escrows.length  },
    { key: 'group',     label: 'Group',     count: groups.length   },
    { key: 'batch',     label: 'Batch',     count: batches.length  },
  ];

  return (
    <div style={{ padding: '32px 36px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 6 }}>ProtectedPay</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-1px' }}>Transaction History</h1>
          <p style={{ fontSize: 14, color: 'var(--foreground-muted)', marginTop: 4 }}>All your on-chain activity in one place</p>
        </div>
        <button onClick={refresh} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: 'var(--surface-card)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
        {TABS.map(({ key, label, count }) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', background: tab === key ? 'var(--surface-card)' : 'transparent', color: tab === key ? 'var(--primary)' : 'var(--foreground-muted)', fontSize: 13, fontWeight: tab === key ? 700 : 500, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            {label}
            {count > 0 && <span style={{ padding: '1px 6px', borderRadius: 999, background: tab === key ? 'rgba(45,212,191,0.12)' : 'transparent', color: tab === key ? 'var(--primary)' : 'var(--foreground-subtle)', fontSize: 11, fontWeight: 700 }}>{count}</span>}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* Protected */}
        {(tab === 'all' || tab === 'protected') && escrows.length > 0 && (
          <div>
            {tab === 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <History size={13} color="var(--primary)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>Protected Transfers</span>
              </div>
            )}
            {escrows.map((e: EscrowRecord) => {
              const isSender = e.sender.toLowerCase() === myAddr;
              const counterAddr = isSender ? e.recipient : e.sender;
              const statusLabel = ESCROW_STATUS_LABEL[Number(e.status)] ?? e.status;
              const sc = statusLabel === 'Refunded' ? 'var(--foreground-muted)' : 'var(--primary)';
              return (
                <div key={e.id} style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: isSender ? 'rgba(0,0,0,0.06)' : 'rgba(45,212,191,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {isSender ? <ArrowUpRight size={18} color="var(--foreground-muted)" /> : <ArrowDownLeft size={18} color="var(--primary)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{formatPOT(e.amount)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${sc === 'var(--primary)' ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)'}`, color: sc }}>{statusLabel}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: e.remarks ? 4 : 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Protected · {isSender ? '→' : '←'}</span>
                      <button onClick={() => navigator.clipboard.writeText(counterAddr)} title="Copy address"
                        style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--foreground-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {shortAddress(counterAddr)} <Copy size={10} color="var(--foreground-subtle)" />
                      </button>
                    </div>
                    {e.remarks && <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', fontStyle: 'italic' }}>&ldquo;{e.remarks}&rdquo;</p>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--foreground-subtle)', flexShrink: 0 }}>#{e.id}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Groups */}
        {(tab === 'all' || tab === 'group') && groups.length > 0 && (
          <div>
            {tab === 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: tab === 'all' && escrows.length > 0 ? 8 : 0 }}>
                <Users size={13} color="var(--primary)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>Group Splits</span>
              </div>
            )}
            {groups.map((g: GroupRecord) => {
              const pct = Math.round((parseInt(g.contributedCount) / parseInt(g.numParticipants)) * 100);
              const statusLabel = GROUP_STATUS_LABEL[Number(g.status)] ?? g.status;
              const sc = statusLabel === 'Cancelled' ? 'var(--foreground-muted)' : 'var(--primary)';
              return (
                <div key={g.id} style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(45,212,191,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Users size={18} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{formatPOT(g.totalAmount)}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${sc === 'var(--primary)' ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)'}`, color: sc }}>{statusLabel}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>{g.contributedCount}/{g.numParticipants} contributors · {formatPOT(g.amountPerPerson)} each</p>
                      <div style={{ height: 3, borderRadius: 999, background: 'var(--surface-active)', overflow: 'hidden', marginTop: 6 }}>
                        <div style={{ height: '100%', borderRadius: 999, background: 'var(--primary)', width: `${pct}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--foreground-subtle)', flexShrink: 0 }}>#{g.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Batches */}
        {(tab === 'all' || tab === 'batch') && batches.length > 0 && (
          <div>
            {tab === 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 8 }}>
                <Zap size={13} color="var(--primary)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>Batch Payments</span>
              </div>
            )}
            {batches.map((b: BatchRecord) => (
              <div key={b.id} style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(45,212,191,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={18} color="var(--primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{formatPOT(b.totalAmount)}</span>
                  <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>{b.recipientCount} recipients · &ldquo;{b.remarks}&rdquo;</p>
                </div>
                <span style={{ fontSize: 12, color: 'var(--foreground-subtle)', flexShrink: 0 }}>#{b.id}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {escrows.length === 0 && groups.length === 0 && batches.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <History size={28} color="var(--foreground-subtle)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>No transactions yet</p>
            <p style={{ fontSize: 13, color: 'var(--foreground-subtle)', marginTop: 4 }}>Your activity will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return <WalletGuard><HistoryContent /></WalletGuard>;
}

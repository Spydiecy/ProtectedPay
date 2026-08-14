'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatEther, formatUnits } from 'viem';
import { useAccount, usePublicClient, useChainId } from 'wagmi';
import { useHistory, formatPOT, EscrowRecord, GroupRecord, BatchRecord, TokenEscrowRecord, PaymentLinkRecord } from '../hooks/useHistory';
import { PROTECTED_PAY_ABI, ESCROW_STATUS_LABEL, GROUP_STATUS_LABEL } from '../lib/abi';
import { shortAddress } from '../lib/wagmi';
import { useContractAddress } from '../hooks/useContract';
import WalletGuard from '../components/WalletGuard';
import UsdValue from '../components/UsdValue';
import { getKnownToken } from '../lib/tokens';
import {
  RefreshCw, ArrowUpRight, ArrowDownLeft, Users, Zap, History,
  Copy, Check, ChevronDown, ChevronUp, Coins, Link2, CheckCircle2, Ban, ExternalLink,
} from 'lucide-react';

type HistoryTab = 'all' | 'protected' | 'group' | 'batch' | 'links';
const NATIVE   = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'C2FLR';
const EXPLORER = 'https://coston2-explorer.flare.network';

function fmtDate(ts: string | undefined) {
  if (!ts || ts === '0') return null;
  return new Date(parseInt(ts) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Reusable: copyable address with optional username ────────────────────────
function AddrChip({ address, username, client, contractAddress }: {
  address: string;
  username?: string | null;
  client: ReturnType<typeof usePublicClient>;
  contractAddress: `0x${string}`;
}) {
  const [copied,   setCopied]   = useState(false);
  const [uname,    setUname]    = useState<string | null>(username ?? null);
  const [resolved, setResolved] = useState(username !== undefined);

  // Lazy-resolve username from contract on first render if not pre-supplied
  useEffect(() => {
    if (resolved || !address || !client) return;
    setResolved(true);
    client.readContract({
      address: contractAddress,
      abi: PROTECTED_PAY_ABI,
      functionName: 'getUser',
      args: [address as `0x${string}`],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).then((u: any) => {
      if (u?.username) setUname(u.username);
    }).catch(() => {});
  }, [address, client, resolved]);

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button onClick={copy} title={address}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, background: 'var(--surface-elevated)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {uname && (
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>@{uname}</span>
      )}
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--foreground-muted)' }}>
        {shortAddress(address)}
      </span>
      {copied
        ? <Check size={10} color="var(--primary)" />
        : <Copy size={10} color="var(--foreground-subtle)" />
      }
    </button>
  );
}

// ── Expandable batch detail ──────────────────────────────────────────────────
function BatchDetail({ b, client, contractAddress }: {
  b: BatchRecord;
  client: ReturnType<typeof usePublicClient>;
  contractAddress: `0x${string}`;
}) {
  const [open,       setOpen]       = useState(false);
  const [recipients, setRecipients] = useState<{ account: string; amount: bigint }[] | null>(null);
  const [fetching,   setFetching]   = useState(false);

  const load = useCallback(async () => {
    if (recipients !== null) return;
    setFetching(true);
    try {
      const count = Number(b.recipientCount);
      const items = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          client?.readContract({
            address: contractAddress,
            abi: PROTECTED_PAY_ABI,
            functionName: 'getBatchRecipient',
            args: [BigInt(b.id), i as unknown as number],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as Promise<any>
        )
      );
      setRecipients(items.map(r => ({ account: r.account, amount: r.amount })));
    } catch { setRecipients([]); }
    finally { setFetching(false); }
  }, [b.id, b.recipientCount, client, recipients]);

  const toggle = () => { if (!open) load(); setOpen(o => !o); };

  return (
    <div style={{ borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', marginBottom: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={18} color="var(--foreground-muted)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{formatPOT(b.totalAmount)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.06)', color: 'var(--foreground-muted)' }}>SENT</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
            {b.recipientCount} recipients · &ldquo;{b.remarks}&rdquo;
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            {fmtDate(b.createdAt) && <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>{fmtDate(b.createdAt)}</span>}
            <span style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}>#{b.id}</span>
          </div>
          <button onClick={toggle}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, background: open ? 'var(--primary-container)' : 'var(--surface-elevated)', border: `1px solid ${open ? 'rgba(45,212,191,0.3)' : 'var(--border)'}`, color: open ? 'var(--on-primary-container)' : 'var(--foreground-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
          >
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Expanded recipients */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', background: 'var(--surface-elevated)' }}>
          {fetching ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--foreground-muted)', fontSize: 12 }}>
              <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
            </div>
          ) : recipients && recipients.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-subtle)', textTransform: 'uppercase', marginBottom: 2 }}>Recipient breakdown</span>
              {recipients.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 9, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground-subtle)', fontFamily: 'monospace', minWidth: 18 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <AddrChip address={r.account} client={client} contractAddress={contractAddress} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                    {parseFloat(formatEther(r.amount)).toFixed(6)} {NATIVE}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}>No recipient data found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Expandable group detail ──────────────────────────────────────────────────
function GroupDetail({ g, myAddr, client, contractAddress }: {
  g: GroupRecord;
  myAddr: string;
  client: ReturnType<typeof usePublicClient>;
  contractAddress: `0x${string}`;
}) {
  const [open,         setOpen]         = useState(false);
  const [contributors, setContributors] = useState<string[] | null>(null);
  const [fetching,     setFetching]     = useState(false);

  const pct         = Math.round((parseInt(g.contributedCount) / parseInt(g.numParticipants)) * 100);
  const statusLabel = GROUP_STATUS_LABEL[Number(g.status)] ?? g.status;
  const sc          = statusLabel === 'Cancelled' ? 'var(--foreground-muted)' : 'var(--primary)';
  const isCreator   = g.creator.toLowerCase()   === myAddr;
  const isRecipient = g.recipient.toLowerCase() === myAddr;
  const roleLabel   = isCreator ? 'CREATED' : isRecipient ? 'RECIPIENT' : 'CONTRIBUTED';
  const roleColor   = isRecipient ? 'var(--primary)' : isCreator ? 'var(--foreground-muted)' : 'var(--secondary)';

  const loadContributors = useCallback(async () => {
    if (contributors !== null || !client) return;
    setFetching(true);
    try {
      const addrs = await client.readContract({
        address: contractAddress,
        abi: PROTECTED_PAY_ABI,
        functionName: 'getGroupContributors',
        args: [BigInt(g.id)],
      }) as string[];
      setContributors(addrs);
    } catch {
      setContributors([]);
    } finally {
      setFetching(false);
    }
  }, [g.id, client, contributors]);

  const toggle = () => {
    if (!open) loadContributors();
    setOpen(o => !o);
  };

  return (
    <div style={{ borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', marginBottom: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(45,212,191,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <Users size={18} color="var(--primary)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{formatPOT(g.totalAmount)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: isRecipient ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)', color: roleColor }}>{roleLabel}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sc === 'var(--primary)' ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)', color: sc }}>{statusLabel}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginBottom: 6 }}>
            {g.contributedCount}/{g.numParticipants} contributors · {formatPOT(g.amountPerPerson)} each
          </p>
          <div style={{ height: 3, borderRadius: 999, background: 'var(--surface-active)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: 'var(--primary)', width: `${pct}%` }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            {fmtDate(g.createdAt) && <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>{fmtDate(g.createdAt)}</span>}
            <span style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}>#{g.id}</span>
          </div>
          <button onClick={toggle}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, background: open ? 'var(--primary-container)' : 'var(--surface-elevated)', border: `1px solid ${open ? 'rgba(45,212,191,0.3)' : 'var(--border)'}`, color: open ? 'var(--on-primary-container)' : 'var(--foreground-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
          >
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {open ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      {/* Expanded detail panel */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', background: 'var(--surface-elevated)', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* ── Creator row ── */}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Addresses involved</span>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 9, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground-subtle)', letterSpacing: 0.5, minWidth: 60 }}>CREATOR</span>
              <AddrChip address={g.creator} client={client} contractAddress={contractAddress} />
            </div>
            {g.creator.toLowerCase() === myAddr && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground-subtle)' }}>YOU</span>}
          </div>

          {/* ── Recipient row ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 9, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', letterSpacing: 0.5, minWidth: 60 }}>RECEIVES</span>
              <AddrChip address={g.recipient} client={client} contractAddress={contractAddress} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{formatPOT(g.totalAmount)}</span>
              {g.recipient.toLowerCase() === myAddr && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground-subtle)' }}>YOU</span>}
            </div>
          </div>

          {/* ── Contributors section ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>
              Contributors ({g.contributedCount}/{g.numParticipants})
            </span>

            {fetching ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--foreground-muted)', fontSize: 12, padding: '8px 0' }}>
                <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading contributors…
              </div>
            ) : contributors && contributors.length > 0 ? (
              contributors.map((addr, i) => (
                <div key={addr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 9, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground-subtle)', fontFamily: 'monospace', minWidth: 18 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <AddrChip address={addr} client={client} contractAddress={contractAddress} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground-muted)' }}>{formatPOT(g.amountPerPerson)}</span>
                    {addr.toLowerCase() === myAddr && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground-subtle)' }}>YOU</span>}
                  </div>
                </div>
              ))
            ) : contributors && contributors.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--foreground-subtle)', padding: '4px 0' }}>No contribution events found.</p>
            ) : null}

            {/* Pending slots for contributors who haven't joined yet */}
            {contributors && parseInt(g.numParticipants) > contributors.length && (
              Array.from({ length: parseInt(g.numParticipants) - contributors.length }).map((_, i) => (
                <div key={`pending-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, background: 'var(--surface-card)', border: '1px dashed var(--border)', opacity: 0.5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground-subtle)', fontFamily: 'monospace', minWidth: 18 }}>
                    {String(contributors.length + i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--foreground-subtle)', fontStyle: 'italic' }}>Awaiting contributor…</span>
                </div>
              ))
            )}
          </div>

          {/* Remarks */}
          {g.remarks && (
            <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', fontStyle: 'italic', paddingLeft: 4, marginTop: 2 }}>
              &ldquo;{g.remarks}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main history page ────────────────────────────────────────────────────────
function HistoryContent() {
  const contractAddress = useContractAddress();
  const chainId = useChainId();
  const { address } = useAccount();
  const client = usePublicClient();
  const { escrows, tokenEscrows, groups, batches, paymentLinks, loading, refresh } = useHistory();
  const [tab, setTab] = useState<HistoryTab>('all');

  useEffect(() => { refresh(); }, [address, chainId]); // eslint-disable-line

  const myAddr = (address ?? '').toLowerCase();

  const TABS: { key: HistoryTab; label: string; count: number }[] = [
    { key: 'all',       label: 'All',       count: escrows.length + tokenEscrows.length + groups.length + batches.length + paymentLinks.length },
    { key: 'protected', label: 'Protected', count: escrows.length + tokenEscrows.length },
    { key: 'group',     label: 'Group',     count: groups.length   },
    { key: 'batch',     label: 'Batch',     count: batches.length  },
    { key: 'links',     label: 'Links',     count: paymentLinks.length },
  ];

  return (
    <div style={{ padding: '32px 36px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 6 }}>FlarePay</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-1px' }}>Transaction History</h1>
          <p style={{ fontSize: 14, color: 'var(--foreground-muted)', marginTop: 4 }}>All your on-chain activity in one place</p>
        </div>
        <button onClick={refresh} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: 'var(--surface-card)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
        {TABS.map(({ key, label, count }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', background: tab === key ? 'var(--surface-card)' : 'transparent', color: tab === key ? 'var(--primary)' : 'var(--foreground-muted)', fontSize: 13, fontWeight: tab === key ? 700 : 500, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            {label}
            {count > 0 && (
              <span style={{ padding: '1px 6px', borderRadius: 999, background: tab === key ? 'rgba(45,212,191,0.12)' : 'transparent', color: tab === key ? 'var(--primary)' : 'var(--foreground-subtle)', fontSize: 11, fontWeight: 700 }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* ── Protected (native + token) ── */}
        {(tab === 'all' || tab === 'protected') && (escrows.length > 0 || tokenEscrows.length > 0) && (
          <div style={{ marginBottom: tab === 'all' ? 8 : 0 }}>
            {tab === 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <History size={13} color="var(--primary)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>Protected Transfers</span>
              </div>
            )}
            {/* Native escrows */}
            {escrows.map((e: EscrowRecord) => {
              const isSender    = e.sender.toLowerCase() === myAddr;
              const counterAddr = isSender ? e.recipient : e.sender;
              const statusLabel = ESCROW_STATUS_LABEL[Number(e.status)] ?? e.status;
              const sc          = statusLabel === 'Refunded' ? 'var(--foreground-muted)' : 'var(--primary)';
              return (
                <div key={`e-${e.id}`} style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: isSender ? 'rgba(0,0,0,0.06)' : 'rgba(45,212,191,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {isSender ? <ArrowUpRight size={18} color="var(--foreground-muted)" /> : <ArrowDownLeft size={18} color="var(--primary)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{formatPOT(e.amount)}</span>
                      <UsdValue symbol={NATIVE} amount={formatEther(BigInt(e.amount || '0'))} />
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: isSender ? 'rgba(0,0,0,0.06)' : 'rgba(45,212,191,0.12)', color: isSender ? 'var(--foreground-muted)' : 'var(--primary)' }}>
                        {isSender ? 'SENT' : 'RECEIVED'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sc === 'var(--primary)' ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)', color: sc }}>{statusLabel}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: e.remarks ? 6 : 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>{isSender ? '→ to' : '← from'}</span>
                      <AddrChip address={counterAddr} client={client} contractAddress={contractAddress} />
                    </div>
                    {e.remarks && <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', fontStyle: 'italic' }}>&ldquo;{e.remarks}&rdquo;</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    {fmtDate(e.createdAt) && <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>{fmtDate(e.createdAt)}</span>}
                    <span style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}>#{e.id}</span>
                  </div>
                </div>
              );
            })}
            {/* Token escrows */}
            {tokenEscrows.map((e: TokenEscrowRecord) => {
              const isSender    = e.sender.toLowerCase() === myAddr;
              const counterAddr = isSender ? e.recipient : e.sender;
              const statusLabel = ESCROW_STATUS_LABEL[Number(e.status)] ?? e.status;
              const sc          = statusLabel === 'Refunded' ? 'var(--foreground-muted)' : 'var(--primary)';
              const known       = getKnownToken(e.token);
              const amtRaw      = (() => {
                try { return formatUnits(BigInt(e.amount), known?.decimals ?? 18); }
                catch { return '0'; }
              })();
              const amtDisplay  = `${parseFloat(amtRaw).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${known?.symbol ?? 'TOKEN'}`;
              return (
                <div key={`te-${e.id}`} style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: isSender ? 'rgba(251,191,36,0.1)' : 'rgba(45,212,191,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, overflow: 'hidden' }}>
                    {known
                      ? <img src={known.logo} alt={known.symbol} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      : <Coins size={18} color={isSender ? 'var(--warning)' : 'var(--primary)'} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{amtDisplay}</span>
                      {known && <UsdValue symbol={known.symbol} amount={amtRaw} />}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(251,191,36,0.12)', color: 'var(--warning)' }}>TOKEN</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: isSender ? 'rgba(0,0,0,0.06)' : 'rgba(45,212,191,0.12)', color: isSender ? 'var(--foreground-muted)' : 'var(--primary)' }}>
                        {isSender ? 'SENT' : 'RECEIVED'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sc === 'var(--primary)' ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)', color: sc }}>{statusLabel}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>Token</span>
                      <AddrChip address={e.token} client={client} contractAddress={contractAddress} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: e.remarks ? 6 : 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>{isSender ? '→ to' : '← from'}</span>
                      <AddrChip address={counterAddr} client={client} contractAddress={contractAddress} />
                    </div>
                    {e.remarks && <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', fontStyle: 'italic' }}>&ldquo;{e.remarks}&rdquo;</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    {fmtDate(e.createdAt) && <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>{fmtDate(e.createdAt)}</span>}
                    <span style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}>#{e.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Groups ── */}
        {(tab === 'all' || tab === 'group') && groups.length > 0 && (
          <div style={{ marginBottom: tab === 'all' ? 8 : 0 }}>
            {tab === 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: escrows.length > 0 ? 8 : 0 }}>
                <Users size={13} color="var(--primary)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>Group Splits</span>
              </div>
            )}
            {groups.map((g: GroupRecord) => (
              <GroupDetail key={g.id} g={g} myAddr={myAddr} client={client} contractAddress={contractAddress} />
            ))}
          </div>
        )}

        {/* ── Batches ── */}
        {(tab === 'all' || tab === 'batch') && batches.length > 0 && (
          <div>
            {tab === 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 8 }}>
                <Zap size={13} color="var(--primary)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>Batch Payments</span>
              </div>
            )}
            {batches.map((b: BatchRecord) => (
              <BatchDetail key={b.id} b={b} client={client} contractAddress={contractAddress} />
            ))}
          </div>
        )}

        {/* ── Payment Links ── */}
        {(tab === 'all' || tab === 'links') && paymentLinks.length > 0 && (
          <div>
            {tab === 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 8 }}>
                <Link2 size={13} color="var(--primary)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>Payment Links</span>
              </div>
            )}
            {paymentLinks.map((l: PaymentLinkRecord) => {
              const isPaid      = l.status === 'Paid';
              const isActive    = l.status === 'Active';
              const isCancelled = l.status === 'Cancelled';
              const statusColor = isPaid ? 'var(--primary)' : isCancelled ? 'var(--foreground-muted)' : 'var(--primary)';
              const statusBg    = isPaid || isActive ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)';
              return (
                <div key={l.linkId} style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: isPaid ? 'rgba(45,212,191,0.12)' : 'rgba(45,212,191,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {isPaid ? <CheckCircle2 size={18} color="var(--primary)" /> : isCancelled ? <Ban size={18} color="var(--foreground-muted)" /> : <Link2 size={18} color="var(--primary)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
                        {l.amount === '0' ? 'Open amount' : formatPOT(l.amount)}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: statusBg, color: statusColor }}>{l.status}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginBottom: isPaid ? 6 : 0 }}>{l.description}</p>
                    {isPaid && l.paidBy && l.paidBy !== '0x0000000000000000000000000000000000000000' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>Paid by</span>
                        <AddrChip address={l.paidBy} client={client} contractAddress={contractAddress} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    {fmtDate(isPaid && l.paidAt !== '0' ? l.paidAt : l.createdAt) && (
                      <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>
                        {fmtDate(isPaid && l.paidAt !== '0' ? l.paidAt : l.createdAt)}
                      </span>
                    )}
                    <a href={`/pay/${l.linkId}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--primary)', textDecoration: 'none' }}>
                      View <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {escrows.length === 0 && tokenEscrows.length === 0 && groups.length === 0 && batches.length === 0 && paymentLinks.length === 0 && (
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

'use client';

import { useState, useCallback, useEffect } from 'react';
import { parseEther } from 'viem';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useHistory, formatPOT } from '../hooks/useHistory';
import { PROTECTED_PAY_ABI } from '../lib/abi';
import { shortAddress } from '../lib/wagmi';
import { useContractAddress } from '../hooks/useContract';
import WalletGuard from '../components/WalletGuard';
import Toast, { ToastType } from '../components/Toast';
import { Users, UserPlus, XCircle, RefreshCw, AtSign, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface GroupData {
  id: bigint; creator: string; recipient: string;
  totalAmount: bigint; amountPerPerson: bigint;
  numParticipants: number; contributedCount: number;
  amountCollected: bigint; remarks: string; status: number;
}

const INPUT: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 10,
  background: 'var(--surface-elevated)', color: 'var(--foreground)',
  border: '1px solid var(--border)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const NATIVE = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'C2FLR';

// ── Inline expandable contributors for group history cards ───────────────────
function AddrPill({ address, myAddr, client }: { address: string; myAddr: string; client: ReturnType<typeof usePublicClient> }) {
  const contractAddress = useContractAddress();
  const [copied, setCopied] = useState(false);
  const [uname,  setUname]  = useState<string | null>(null);
  useEffect(() => {
    if (!address || !client) return;
    client.readContract({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'getUser', args: [address as `0x${string}`] })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((u: any) => { if (u?.username) setUname(u.username); }).catch(() => {});
  }, [address, client]);
  return (
    <button onClick={() => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      title={address}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7, background: 'var(--surface-card)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 11 }}>
      {uname && <span style={{ fontWeight: 700, color: 'var(--primary)' }}>@{uname}</span>}
      <span style={{ fontFamily: 'monospace', color: 'var(--foreground-muted)' }}>{shortAddress(address)}</span>
      {address.toLowerCase() === myAddr && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground-subtle)' }}>YOU</span>}
      {copied ? <Check size={10} color="var(--primary)" /> : <Copy size={10} color="var(--foreground-subtle)" />}
    </button>
  );
}

function GroupContributorsInline({ groupId, creator, recipient, amountPerPerson, numParticipants, remarks, myAddr, client }: {
  groupId: string; creator: string; recipient: string;
  amountPerPerson: string; numParticipants: string; remarks: string;
  myAddr: string; client: ReturnType<typeof usePublicClient>;
}) {
  const contractAddress = useContractAddress();
  const [open,         setOpen]         = useState(false);
  const [contributors, setContributors] = useState<string[] | null>(null);
  const [fetching,     setFetching]     = useState(false);

  const load = useCallback(async () => {
    if (contributors !== null || !client) return;
    setFetching(true);
    try {
      const addrs = await client.readContract({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'getGroupContributors', args: [BigInt(groupId)] }) as string[];
      setContributors(addrs);
    } catch { setContributors([]); }
    finally { setFetching(false); }
  }, [groupId, client, contributors]);

  const toggle = () => { if (!open) load(); setOpen(o => !o); };

  return (
    <>
      <button onClick={toggle}
        style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: open ? 'var(--primary-container)' : 'var(--surface-elevated)', border: `1px solid ${open ? 'rgba(45,212,191,0.3)' : 'var(--border)'}`, color: open ? 'var(--on-primary-container)' : 'var(--foreground-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
        <Users size={11} />
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {open ? 'Hide details' : 'Show creator · recipient · contributors'}
      </button>
      {open && (
        <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Creator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground-subtle)', minWidth: 60, letterSpacing: 0.5 }}>CREATOR</span>
            <AddrPill address={creator} myAddr={myAddr} client={client} />
          </div>
          {/* Recipient */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', minWidth: 60, letterSpacing: 0.5 }}>RECEIVES</span>
              <AddrPill address={recipient} myAddr={myAddr} client={client} />
            </div>
          </div>
          {/* Contributors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground-subtle)', letterSpacing: 0.5 }}>
              CONTRIBUTORS ({fetching ? '…' : `${contributors?.length ?? 0}/${numParticipants}`})
            </span>
            {fetching && <p style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>Loading…</p>}
            {contributors && contributors.map((addr, i) => (
              <div key={addr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--foreground-subtle)', minWidth: 16 }}>{String(i + 1).padStart(2, '0')}</span>
                  <AddrPill address={addr} myAddr={myAddr} client={client} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{formatPOT(amountPerPerson)}</span>
              </div>
            ))}
            {contributors && parseInt(numParticipants) > contributors.length && Array.from({ length: parseInt(numParticipants) - contributors.length }).map((_, i) => (
              <div key={`p-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 7, opacity: 0.4 }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--foreground-subtle)', minWidth: 16 }}>{String((contributors.length) + i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 11, color: 'var(--foreground-subtle)', fontStyle: 'italic' }}>Awaiting…</span>
              </div>
            ))}
          </div>
          {remarks && <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', fontStyle: 'italic' }}>&ldquo;{remarks}&rdquo;</p>}
        </div>
      )}
    </>
  );
}

function GroupContent() {
  const contractAddress = useContractAddress();
  const chainId = useChainId();
  const { address } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { groups, loading: histLoading, refresh } = useHistory();

  const [mode, setMode] = useState<'create' | 'contribute'>('create');
  const [recipient,         setRecipient]         = useState('');
  const [resolvedRecipient, setResolvedRecipient] = useState('');
  const [totalAmount,       setTotalAmount]        = useState('');
  const [participants,      setParticipants]       = useState('2');
  const [remarks,           setRemarks]            = useState('');
  const [contributeId,      setContributeId]       = useState('');
  const [contributeGroup,   setContributeGroup]    = useState<GroupData | null>(null);
  const [lookupLoading,     setLookupLoading]      = useState(false);
  const [loading,           setLoading]            = useState(false);
  const [toast,             setToast]              = useState<{ msg: string; type: ToastType } | null>(null);
  const [txHash,            setTxHash]             = useState<`0x${string}` | undefined>();

  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const t = (msg: string, type: ToastType) => setToast({ msg, type });

  useEffect(() => { refresh(); }, [address, chainId]); // eslint-disable-line
  useEffect(() => { if (isSuccess) { t('Success!', 'success'); refresh(); setTxHash(undefined); } }, [isSuccess]); // eslint-disable-line

  const perPerson = totalAmount && participants && parseInt(participants) >= 2
    ? (parseFloat(totalAmount) / parseInt(participants)).toFixed(6) : null;

  const resolveIfUsername = useCallback(async (val: string) => {
    if (!val || (val.startsWith('0x') && val.length === 42)) { setResolvedRecipient(''); return; }
    const uname = val.startsWith('@') ? val.slice(1) : val;
    try {
      const addr = await client?.readContract({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'resolveUsername', args: [uname] }) as `0x${string}` | null;
      if (addr && addr !== '0x0000000000000000000000000000000000000000') { setResolvedRecipient(addr); t(`Resolved @${uname}`, 'success'); }
      else { setResolvedRecipient(''); t(`@${uname} not found`, 'error'); }
    } catch { setResolvedRecipient(''); }
  }, [client]);

  const effectiveRecipient = (resolvedRecipient || recipient) as `0x${string}`;

  const handleCreate = useCallback(async () => {
    if (!effectiveRecipient || !totalAmount || !perPerson || !remarks) { t('Fill all fields', 'error'); return; }
    setLoading(true); t('Submitting…', 'loading');
    try {
      const totalWei = parseEther(totalAmount);
      const perWei   = parseEther(perPerson);
      const hash = await writeContractAsync({
        address: contractAddress, abi: PROTECTED_PAY_ABI,
        functionName: 'createGroupPayment',
        args: [effectiveRecipient, totalWei, parseInt(participants)as unknown as number, remarks],
        value: perWei,
      });
      setTxHash(hash); t('Group created!', 'success');
      setRecipient(''); setResolvedRecipient(''); setTotalAmount(''); setRemarks('');
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [effectiveRecipient, totalAmount, participants, remarks, perPerson, writeContractAsync]);

  const handleLookup = useCallback(async () => {
    if (!contributeId) return;
    setLookupLoading(true);
    try {
      const data = await client?.readContract({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'getGroupPayment', args: [BigInt(contributeId)] }) as GroupData;
      setContributeGroup(data?.creator !== '0x0000000000000000000000000000000000000000' ? data : null);
      if (!data || data.creator === '0x0000000000000000000000000000000000000000') t('Group not found', 'error');
    } catch { t('Lookup failed', 'error'); }
    finally { setLookupLoading(false); }
  }, [contributeId, client]);

  const handleContribute = useCallback(async (id: string, amtPerPerson: bigint) => {
    setLoading(true); t('Contributing…', 'loading');
    try {
      const hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'contributeToGroup', args: [BigInt(id)], value: amtPerPerson });
      setTxHash(hash); handleLookup();
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [writeContractAsync, handleLookup]);

  const handleCancel = useCallback(async (id: string) => {
    setLoading(true); t('Cancelling & refunding all…', 'loading');
    try {
      const hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'cancelGroupPayment', args: [BigInt(id)] });
      setTxHash(hash);
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [writeContractAsync]);

  const handleWithdraw = useCallback(async (id: string) => {
    setLoading(true); t('Withdrawing contribution…', 'loading');
    try {
      const hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'withdrawContribution', args: [BigInt(id)] });
      setTxHash(hash);
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [writeContractAsync]);

  const pct = contributeGroup ? Math.round((Number(contributeGroup.contributedCount) / Number(contributeGroup.numParticipants)) * 100) : 0;
  const groupStatusLabel = (s: number) => ['Open', 'Completed', 'Cancelled'][s] ?? 'Unknown';

  return (
    <div style={{ padding: '32px 36px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 6 }}>FlarePay</p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-1px' }}>Group Split</h1>
        <p style={{ fontSize: 14, color: 'var(--foreground-muted)', marginTop: 4 }}>Crowdfund a payment with multiple contributors</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: 20, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left — toggle panel */}
        <div style={{ padding: '28px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', alignSelf: 'flex-start', overflowY: 'auto' }}>
          {/* Toggle */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--surface-elevated)', borderRadius: 12, padding: 4, border: '1px solid var(--border)' }}>
            {(['create', 'contribute'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: mode === m ? 'var(--primary)' : 'transparent', color: mode === m ? 'var(--primary-fg)' : 'var(--foreground-muted)', fontSize: 13, fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {m === 'create' ? <Users size={14} /> : <UserPlus size={14} />}
                {m === 'create' ? 'Create' : 'Contribute'}
              </button>
            ))}
          </div>

          {mode === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Users size={17} color="var(--primary)" />
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Create Group Split</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Recipient or @username</label>
                <div style={{ position: 'relative' }}>
                  <input value={recipient} onChange={e => { setRecipient(e.target.value); setResolvedRecipient(''); }} onBlur={e => resolveIfUsername(e.target.value)}
                    placeholder="0x… or @username" style={{ ...INPUT, paddingRight: recipient.startsWith('@') ? 40 : 16 }}
                    onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
                  {recipient.startsWith('@') && <AtSign size={15} color="var(--primary)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
                </div>
                {resolvedRecipient && <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: 5, fontFamily: 'monospace' }}>✓ {resolvedRecipient.slice(0, 14)}…</p>}
              </div>
              {[
                { label: `Total Amount (${NATIVE})`, value: totalAmount, set: setTotalAmount, placeholder: '0.02', type: 'number' },
                { label: 'Participants (min 2)', value: participants, set: setParticipants, placeholder: '2', type: 'number' },
                { label: 'Remarks', value: remarks, set: setRemarks, placeholder: 'Group gift…', type: 'text' },
              ].map(({ label, value, set, placeholder, type }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{label}</label>
                  <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} type={type}
                    style={INPUT} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                </div>
              ))}
              {perPerson && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14, color: 'var(--foreground-muted)', fontWeight: 500 }}>You pay now</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>{perPerson} {NATIVE}</span>
                </div>
              )}
              <button onClick={handleCreate} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.6 : 1 }}>
                <Users size={16} /> Create Group Split
              </button>
            </div>
          )}

          {mode === 'contribute' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <UserPlus size={17} color="var(--primary)" />
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Contribute to Group</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--foreground-muted)', lineHeight: 1.6, marginTop: -8 }}>Enter a Group ID to find and contribute to an open group.</p>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Group ID</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input value={contributeId} onChange={e => { setContributeId(e.target.value); setContributeGroup(null); }} type="number" min="1" placeholder="e.g. 1"
                    style={{ ...INPUT, flex: 1 }} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    onKeyDown={e => e.key === 'Enter' && handleLookup()} />
                  <button onClick={handleLookup} disabled={lookupLoading} style={{ padding: '12px 20px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {lookupLoading ? '…' : 'Look Up'}
                  </button>
                </div>
              </div>
              {contributeGroup && (
                <div style={{ padding: '20px', borderRadius: 12, background: 'var(--surface-elevated)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Group #{contributeGroup.id.toString()}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: Number(contributeGroup.status) === 0 ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)', color: Number(contributeGroup.status) === 0 ? 'var(--primary)' : 'var(--foreground-muted)' }}>
                      {groupStatusLabel(Number(contributeGroup.status))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>Total</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)' }}>{formatPOT(contributeGroup.totalAmount.toString())}</span>
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--surface-card)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>Your contribution</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{formatPOT(contributeGroup.amountPerPerson.toString())}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--foreground-subtle)', marginBottom: 6 }}>
                      <span>{Number(contributeGroup.contributedCount)}/{Number(contributeGroup.numParticipants)} contributors</span><span>{pct}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-active)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: 'var(--primary)', width: `${pct}%` }} />
                    </div>
                  </div>
                  {Number(contributeGroup.status) === 0 && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      {contributeGroup.creator.toLowerCase() !== (address ?? '').toLowerCase() && (
                        <button onClick={() => handleContribute(contributeGroup.id.toString(), contributeGroup.amountPerPerson)} disabled={loading}
                          style={{ flex: 1, padding: '13px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.6 : 1 }}>
                          <UserPlus size={16} /> Contribute {formatPOT(contributeGroup.amountPerPerson.toString())}
                        </button>
                      )}
                      {contributeGroup.creator.toLowerCase() === (address ?? '').toLowerCase() && (
                        <button onClick={() => handleCancel(contributeGroup.id.toString())} disabled={loading}
                          style={{ flex: 1, padding: '13px', borderRadius: 999, background: 'var(--surface-elevated)', color: 'var(--error)', border: '1px solid var(--error-container)', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.6 : 1 }}>
                          <XCircle size={16} /> Cancel & Refund All
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* My groups */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)' }}>
              My Groups
              {groups.length > 0 && <span style={{ marginLeft: 10, padding: '3px 10px', borderRadius: 999, background: 'rgba(45,212,191,0.12)', color: 'var(--primary)', border: '1px solid rgba(45,212,191,0.25)', fontSize: 12, fontWeight: 700 }}>{groups.length}</span>}
            </span>
            <button onClick={refresh} disabled={histLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              <RefreshCw size={13} style={{ animation: histLoading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {groups.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                <Users size={28} color="var(--foreground-subtle)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 15, color: 'var(--foreground-muted)' }}>No group splits yet</p>
              </div>
            ) : (
              groups.map(g => {
                const gpct = Math.round((parseInt(g.contributedCount) / parseInt(g.numParticipants)) * 100);
                const isCreator   = g.creator.toLowerCase()   === (address ?? '').toLowerCase();
                const isRecipient = g.recipient.toLowerCase() === (address ?? '').toLowerCase();
                // status comes back as a string label from mapGroup — map it to a number cleanly
                const statusNum   = { Open: 0, Completed: 1, Cancelled: 2 }[g.status] ?? 0;
                const statusLabel = groupStatusLabel(statusNum);
                const isOpen = statusNum === 0;

                // role: CREATED → you started it | RECIPIENT → you receive the pot | CONTRIBUTED → you joined as contributor
                const roleLabel = isCreator ? 'CREATED' : isRecipient ? 'RECIPIENT' : 'CONTRIBUTED';
                const roleColor = isRecipient ? 'var(--primary)' : isCreator ? 'var(--foreground-muted)' : 'var(--secondary)';
                return (
                  <div key={g.id} style={{ borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    {/* Card header */}
                    <div style={{ padding: '22px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground-subtle)' }}>#{g.id}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: roleColor, padding: '2px 8px', borderRadius: 999, background: isRecipient ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)' }}>{roleLabel}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {g.createdAt && g.createdAt !== '0' && (
                            <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>
                              {new Date(parseInt(g.createdAt) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: isOpen ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)', color: isOpen ? 'var(--primary)' : 'var(--foreground-muted)' }}>{statusLabel}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)' }}>{formatPOT(g.totalAmount)}</span>
                        <span style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>{formatPOT(g.amountPerPerson)} each</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--foreground-subtle)', marginBottom: 6 }}>
                          <span>{g.contributedCount}/{g.numParticipants} contributors</span><span>{gpct}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-active)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, background: 'var(--primary)', width: `${gpct}%` }} />
                        </div>
                      </div>
                      {/* Details toggle */}
                      <GroupContributorsInline
                        groupId={g.id}
                        creator={g.creator}
                        recipient={g.recipient}
                        amountPerPerson={g.amountPerPerson}
                        numParticipants={g.numParticipants}
                        remarks={g.remarks}
                        myAddr={(address ?? '').toLowerCase()}
                        client={client}
                      />
                      {isOpen && (
                        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                          {!isCreator && !isRecipient && (
                            <button onClick={() => {
                              setMode('contribute');
                              setContributeId(g.id);
                              setContributeGroup(null);
                            }}
                              style={{ flex: 1, padding: '9px', borderRadius: 999, background: 'rgba(45,212,191,0.1)', color: 'var(--primary)', border: '1px solid rgba(45,212,191,0.25)', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <UserPlus size={14} /> Contribute
                            </button>
                          )}
                          {!isCreator && !isRecipient && (
                            <button onClick={() => handleWithdraw(g.id)} disabled={loading}
                              style={{ flex: 1, padding: '9px', borderRadius: 999, background: 'transparent', color: 'var(--error)', border: '1px solid var(--error-container)', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading ? 0.6 : 1 }}>
                              <XCircle size={14} /> Withdraw My Share
                            </button>
                          )}
                          {isCreator && (
                            <button onClick={() => handleCancel(g.id)} disabled={loading}
                              style={{ flex: 1, padding: '9px', borderRadius: 999, background: 'transparent', color: 'var(--error)', border: '1px solid var(--error-container)', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading ? 0.6 : 1 }}>
                              <XCircle size={14} /> Cancel & Refund All
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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

export default function GroupPage() {
  return <WalletGuard><GroupContent /></WalletGuard>;
}

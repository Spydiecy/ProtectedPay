'use client';

import { useState, useCallback, useEffect } from 'react';
import { parseUnits, formatUnits, parseEther, formatEther } from 'viem';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useChainId, useBalance } from 'wagmi';
import { useHistory, formatPOT, EscrowRecord, TokenEscrowRecord } from '../hooks/useHistory';
import { PROTECTED_PAY_ABI, ESCROW_STATUS_LABEL } from '../lib/abi';
import { shortAddress } from '../lib/wagmi';
import { useContractAddress } from '../hooks/useContract';
import WalletGuard from '../components/WalletGuard';
import Toast, { ToastType } from '../components/Toast';
import { PRESET_TOKENS, getKnownToken } from '../lib/tokens';
import { Lock, ArrowDownCircle, RotateCcw, RefreshCw, AtSign, Coins, CheckCircle2, ChevronDown, Check, PenLine, Wallet } from 'lucide-react';

const NATIVE = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'OKB';

// Minimal ERC-20 ABI — just what we need
const ERC20_ABI = [
  { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'decimals',  type: 'function', stateMutability: 'view',       inputs: [],                                                                          outputs: [{ name: '', type: 'uint8'   }] },
  { name: 'symbol',    type: 'function', stateMutability: 'view',       inputs: [],                                                                          outputs: [{ name: '', type: 'string'  }] },
  { name: 'name',      type: 'function', stateMutability: 'view',       inputs: [],                                                                          outputs: [{ name: '', type: 'string'  }] },
  { name: 'allowance', type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }],                                     outputs: [{ name: '', type: 'uint256' }] },
] as const;

const INPUT: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 10,
  background: 'var(--surface-elevated)', color: 'var(--foreground)',
  border: '1px solid var(--border)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

interface TokenInfo { name: string; symbol: string; decimals: number; }

function TokenLogo({ src, alt, size = 18 }: { src: string; alt: string; size?: number }) {
  return (
    <img
      src={src} alt={alt}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

function EscrowContent() {
  const contractAddress = useContractAddress();
  const chainId = useChainId();
  const { address } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { escrows, tokenEscrows, loading: histLoading, refresh } = useHistory();
  const { data: nativeBalance } = useBalance({ address });

  // ── Mode toggle ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'native' | 'token'>('native');

  // ── Shared state ──────────────────────────────────────────────────────────
  const [recipient,         setRecipient]         = useState('');
  const [resolvedRecipient, setResolvedRecipient] = useState('');
  const [amount,            setAmount]            = useState('');
  const [remarks,           setRemarks]           = useState('');
  const [loading,           setLoading]           = useState(false);
  const [toast,             setToast]             = useState<{ msg: string; type: ToastType } | null>(null);
  const [txHash,            setTxHash]            = useState<`0x${string}` | undefined>();

  // ── Token-specific state ──────────────────────────────────────────────────
  const [tokenAddress,   setTokenAddress]   = useState('');
  const [tokenInfo,      setTokenInfo]      = useState<TokenInfo | null>(null);
  const [tokenLookup,    setTokenLookup]    = useState(false);
  const [approving,      setApproving]      = useState(false);
  const [allowance,      setAllowance]      = useState<bigint>(0n);
  const [checkingAllowance, setCheckingAllowance] = useState(false);
  const [tokenBalance,   setTokenBalance]   = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<typeof PRESET_TOKENS[number] | null>(null);
  const [tokenPickerOpen,setTokenPickerOpen]= useState(false);
  const [customToken,    setCustomToken]    = useState(false);
  // What kind of tx we're currently waiting on — so an approve receipt doesn't
  // get mistaken for a create receipt (that bug made the approval look lost).
  const [txKind,         setTxKind]         = useState<'approve' | 'create' | 'action' | null>(null);

  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const t = (msg: string, type: ToastType) => setToast({ msg, type });

  useEffect(() => { refresh(); }, [address, chainId]); // eslint-disable-line

  // ── Read the live on-chain allowance ──────────────────────────────────────
  // Source of truth for "can I create the transfer yet?". Because we read it
  // from the chain, an approval you already granted earlier is picked up too —
  // no need to approve the same token twice.
  const readAllowance = useCallback(async (tokenOverride?: string): Promise<bigint> => {
    const tAddr = (tokenOverride ?? tokenAddress) as `0x${string}`;
    if (!tAddr || !tAddr.startsWith('0x') || tAddr.length !== 42 || !address || !client) {
      setAllowance(0n);
      return 0n;
    }
    setCheckingAllowance(true);
    try {
      const current = await client.readContract({
        address: tAddr, abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, contractAddress],
      }) as bigint;
      setAllowance(current);
      return current;
    } catch {
      setAllowance(0n);
      return 0n;
    } finally {
      setCheckingAllowance(false);
    }
  }, [tokenAddress, address, client, contractAddress]);

  // ── Read the user's on-chain token balance ─────────────────────────────────
  const readTokenBalance = useCallback(async (tokenOverride?: string) => {
    const tAddr = (tokenOverride ?? tokenAddress) as `0x${string}`;
    if (!tAddr || !tAddr.startsWith('0x') || tAddr.length !== 42 || !address || !client) {
      setTokenBalance(null);
      return;
    }
    setBalanceLoading(true);
    try {
      const bal = await client.readContract({
        address: tAddr, abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      }) as bigint;
      setTokenBalance(bal);
    } catch {
      setTokenBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [tokenAddress, address, client]);

  useEffect(() => {
    if (!isSuccess) return;

    if (txKind === 'approve') {
      // Approval landed — re-read the allowance instead of clearing it.
      t('Approval confirmed — you can create the transfer now', 'success');
      readAllowance();
    } else {
      t('Done!', 'success');
      if (txKind === 'create') {
        // Allowance and balance both changed after the transfer — re-read them.
        readAllowance();
        readTokenBalance();
      }
      refresh();
    }
    setTxHash(undefined);
    setTxKind(null);
  }, [isSuccess]); // eslint-disable-line

  // Reset token state when mode switches
  useEffect(() => {
    setTokenAddress(''); setTokenInfo(null); setAllowance(0n);
    setAmount(''); setRecipient(''); setResolvedRecipient(''); setRemarks('');
    setSelectedPreset(null); setCustomToken(false); setTokenPickerOpen(false);
  }, [mode]);

  const resolveIfUsername = useCallback(async (val: string) => {
    if (!val.startsWith('@') && (val.startsWith('0x') || val.length === 42)) { setResolvedRecipient(''); return; }
    const uname = val.startsWith('@') ? val.slice(1) : val;
    if (!uname || uname.length < 2) return;
    try {
      const addr = await client?.readContract({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'resolveUsername', args: [uname] }) as `0x${string}` | null;
      if (addr && addr !== '0x0000000000000000000000000000000000000000') { setResolvedRecipient(addr); t(`Resolved @${uname}`, 'success'); }
      else { setResolvedRecipient(''); t(`@${uname} not found`, 'error'); }
    } catch { setResolvedRecipient(''); }
  }, [client]);

  const effectiveRecipient = (resolvedRecipient || recipient) as `0x${string}`;

  // ── Fetch token info ───────────────────────────────────────────────────────
  const lookupToken = useCallback(async (addr: string) => {
    if (!addr || !addr.startsWith('0x') || addr.length !== 42 || !client) return;
    setTokenLookup(true); setTokenInfo(null);
    try {
      const [sym, nm, dec] = await Promise.all([
        client.readContract({ address: addr as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol' }),
        client.readContract({ address: addr as `0x${string}`, abi: ERC20_ABI, functionName: 'name' }),
        client.readContract({ address: addr as `0x${string}`, abi: ERC20_ABI, functionName: 'decimals' }),
      ]);
      setTokenInfo({ symbol: sym as string, name: nm as string, decimals: Number(dec) });
      t(`Found: ${nm} (${sym})`, 'success');
      readAllowance(addr);
      readTokenBalance(addr);
    } catch { t('Could not read token — check the address', 'error'); setTokenInfo(null); }
    finally { setTokenLookup(false); }
  }, [client, readAllowance, readTokenBalance]);

  const selectPreset = useCallback((preset: typeof PRESET_TOKENS[number]) => {
    setSelectedPreset(preset);
    setCustomToken(false);
    setTokenPickerOpen(false);
    setTokenAddress(preset.address);
    // Preset tokens are known ahead of time — skip the on-chain lookup entirely.
    setTokenInfo({ name: preset.name, symbol: preset.symbol, decimals: preset.decimals });
    readAllowance(preset.address);
    readTokenBalance(preset.address);
  }, [readAllowance, readTokenBalance]);

  const selectCustomToken = useCallback(() => {
    setSelectedPreset(null);
    setCustomToken(true);
    setTokenPickerOpen(false);
    setTokenAddress('');
    setTokenInfo(null);
    setAllowance(0n);
    setTokenBalance(null);
  }, []);

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = useCallback(async () => {
    if (!tokenInfo || !amount || !tokenAddress || !address) { t('Fill in token and amount first', 'error'); return; }
    setApproving(true); t('Confirm the approval in your wallet…', 'loading');
    try {
      const amountWei = parseUnits(amount, tokenInfo.decimals);
      const hash = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddress, amountWei],
      });
      setTxKind('approve');
      setTxHash(hash);
      t('Approving… waiting for confirmation', 'loading');
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Approval failed', 'error'); }
    finally { setApproving(false); }
  }, [tokenInfo, amount, tokenAddress, address, writeContractAsync, contractAddress]);

  // ── Create native escrow ───────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!effectiveRecipient || !amount || !remarks) { t('Fill all fields', 'error'); return; }
    setLoading(true); t('Submitting…', 'loading');
    try {
      const hash = await writeContractAsync({
        address: contractAddress, abi: PROTECTED_PAY_ABI,
        functionName: 'createEscrow',
        args: [effectiveRecipient, remarks],
        value: parseEther(amount),
      });
      setTxKind('action');
      setTxHash(hash);
      setRecipient(''); setResolvedRecipient(''); setAmount(''); setRemarks('');
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [effectiveRecipient, amount, remarks, writeContractAsync]);

  // ── Create token escrow ────────────────────────────────────────────────────
  const handleCreateToken = useCallback(async () => {
    if (!effectiveRecipient || !amount || !remarks || !tokenInfo || !tokenAddress) {
      t('Fill all fields', 'error'); return;
    }
    const amountWei = parseUnits(amount, tokenInfo.decimals);

    // Re-read the allowance right before submitting so we never send a tx that
    // is guaranteed to revert on transferFrom.
    const current = await readAllowance();
    if (current < amountWei) {
      t('Approve this amount first', 'error');
      return;
    }

    setLoading(true); t('Creating token transfer…', 'loading');
    try {
      const hash = await writeContractAsync({
        address: contractAddress, abi: PROTECTED_PAY_ABI,
        functionName: 'createTokenEscrow',
        args: [tokenAddress as `0x${string}`, effectiveRecipient, amountWei, remarks],
      });
      setTxKind('create');
      setTxHash(hash);
      setRecipient(''); setResolvedRecipient(''); setAmount(''); setRemarks('');
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [effectiveRecipient, amount, remarks, tokenInfo, tokenAddress, writeContractAsync, contractAddress, readAllowance]);

  // ── Claim / Refund ────────────────────────────────────────────────────────
  const handleClaim = useCallback(async (id: string) => {
    setLoading(true); t('Claiming…', 'loading');
    try { const hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'claimEscrow', args: [BigInt(id)] }); setTxKind('action'); setTxHash(hash); }
    catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [writeContractAsync, contractAddress]);

  const handleRefund = useCallback(async (id: string) => {
    setLoading(true); t('Refunding…', 'loading');
    try { const hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'refundEscrow', args: [BigInt(id)] }); setTxKind('action'); setTxHash(hash); }
    catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [writeContractAsync, contractAddress]);

  const handleClaimToken = useCallback(async (id: string) => {
    setLoading(true); t('Claiming tokens…', 'loading');
    try { const hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'claimTokenEscrow', args: [BigInt(id)] }); setTxKind('action'); setTxHash(hash); }
    catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [writeContractAsync, contractAddress]);

  const handleRefundToken = useCallback(async (id: string) => {
    setLoading(true); t('Refunding tokens…', 'loading');
    try { const hash = await writeContractAsync({ address: contractAddress, abi: PROTECTED_PAY_ABI, functionName: 'refundTokenEscrow', args: [BigInt(id)] }); setTxKind('action'); setTxHash(hash); }
    catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [writeContractAsync, contractAddress]);

  // Close token picker dropdown when clicking outside
  useEffect(() => {
    if (!tokenPickerOpen) return;
    const close = () => setTokenPickerOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [tokenPickerOpen]);

  // Re-read the allowance and balance when the connected wallet changes.
  useEffect(() => {
    if (mode === 'token' && tokenAddress) { readAllowance(); readTokenBalance(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, chainId]);

  // ── Derived: is the current allowance enough for the amount entered? ───────
  const requiredWei = (() => {
    if (!amount || !tokenInfo) return 0n;
    try { return parseUnits(amount, tokenInfo.decimals); } catch { return 0n; }
  })();
  const hasEnoughAllowance = requiredWei > 0n && allowance >= requiredWei;
  const allowanceDisplay = tokenInfo && allowance > 0n
    ? formatUnits(allowance, tokenInfo.decimals)
    : '0';

  const myAddr = (address ?? '').toLowerCase();

  return (
    <div style={{ padding: '32px 36px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 6 }}>ProtectedPay</p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-1px' }}>Protected Transfer</h1>
        <p style={{ fontSize: 14, color: 'var(--foreground-muted)', marginTop: 4 }}>Lock funds until the recipient claims them</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: 20, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Create form ────────────────────────────────────────────────── */}
        <div style={{ padding: '28px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', alignSelf: 'flex-start', overflowY: 'auto' }}>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'var(--surface-elevated)', borderRadius: 12, padding: 4, border: '1px solid var(--border)' }}>
            {(['native', 'token'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: mode === m ? 'var(--primary)' : 'transparent', color: mode === m ? 'var(--primary-fg)' : 'var(--foreground-muted)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all 0.2s' }}>
                {m === 'native' ? <Lock size={13} /> : <Coins size={13} />}
                {m === 'native' ? `${NATIVE} Transfer` : 'ERC-20 Token'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Token picker (token mode only) */}
            {mode === 'token' && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Token</label>

                {/* Dropdown trigger */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setTokenPickerOpen(o => !o); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)',
                      background: 'var(--surface-elevated)', cursor: 'pointer', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = tokenPickerOpen ? 'var(--primary)' : 'var(--border)')}
                  >
                    {selectedPreset ? (
                      <>
                        <TokenLogo src={selectedPreset.logo} alt={selectedPreset.symbol} />
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{selectedPreset.label}</span>
                      </>
                    ) : customToken ? (
                      <>
                        <PenLine size={16} color="var(--foreground-muted)" style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Custom Token</span>
                      </>
                    ) : (
                      <>
                        <Coins size={16} color="var(--foreground-subtle)" style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 14, color: 'var(--foreground-subtle)' }}>Select a token…</span>
                      </>
                    )}
                    <ChevronDown size={14} color="var(--foreground-muted)" style={{ flexShrink: 0, transform: tokenPickerOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </button>

                  {/* Dropdown menu */}
                  {tokenPickerOpen && (
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{
                        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                        background: 'var(--surface-card)', border: '1px solid var(--border)',
                        borderRadius: 12, zIndex: 50, overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      }}
                    >
                      {PRESET_TOKENS.map(preset => {
                        const isActive = selectedPreset?.address === preset.address;
                        return (
                          <button
                            key={preset.address}
                            onClick={() => selectPreset(preset)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                              padding: '11px 14px', border: 'none', cursor: 'pointer',
                              background: isActive ? 'rgba(45,212,191,0.1)' : 'transparent',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-elevated)'; }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                          >
                            <TokenLogo src={preset.logo} alt={preset.symbol} />
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--primary)' : 'var(--foreground)', lineHeight: 1.2 }}>{preset.label}</p>
                              <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--foreground-subtle)', lineHeight: 1.2, marginTop: 1 }}>{shortAddress(preset.address)}</p>
                            </div>
                            {isActive && <Check size={14} color="var(--primary)" />}
                          </button>
                        );
                      })}
                      <div style={{ height: 1, background: 'var(--border)' }} />
                      <button
                        onClick={selectCustomToken}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '11px 14px', border: 'none', cursor: 'pointer',
                          background: customToken ? 'rgba(45,212,191,0.1)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!customToken) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-elevated)'; }}
                        onMouseLeave={e => { if (!customToken) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <PenLine size={16} color={customToken ? 'var(--primary)' : 'var(--foreground-muted)'} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 600, color: customToken ? 'var(--primary)' : 'var(--foreground)' }}>Custom Token Address</span>
                        {customToken && <Check size={14} color="var(--primary)" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Custom address input — only when "Custom Token" is selected */}
                {customToken && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input value={tokenAddress} onChange={e => { setTokenAddress(e.target.value); setTokenInfo(null); setAllowance(0n); setTokenBalance(null); }}
                      onBlur={e => lookupToken(e.target.value)}
                      placeholder="0x… ERC-20 token address"
                      style={{ ...INPUT, flex: 1, fontFamily: 'monospace', fontSize: 12 }}
                      onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                    />
                    <button onClick={() => lookupToken(tokenAddress)} disabled={tokenLookup || tokenAddress.length < 42}
                      style={{ padding: '0 16px', borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {tokenLookup ? '…' : 'Lookup'}
                    </button>
                  </div>
                )}

                {/* Resolved token info — only shown for custom tokens (presets already show their name in the dropdown) */}
                {customToken && tokenLookup && (
                  <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RefreshCw size={13} color="var(--foreground-muted)" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Looking up token…</span>
                  </div>
                )}
                {customToken && tokenInfo && !tokenLookup && (
                  <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Coins size={14} color="var(--primary)" />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{tokenInfo.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--foreground-muted)', marginLeft: 8 }}>{tokenInfo.symbol} · {tokenInfo.decimals} decimals</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recipient */}
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

            {/* Amount */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>
                  Amount {mode === 'token' ? (tokenInfo ? `(${tokenInfo.symbol})` : '(select a token first)') : `(${NATIVE})`}
                </label>
                {/* Available balance for whichever asset is selected */}
                {mode === 'native' && nativeBalance && (
                  <button
                    onClick={() => setAmount(formatEther(nativeBalance.value))}
                    title="Use max"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: 'var(--foreground-subtle)' }}
                  >
                    <Wallet size={11} />
                    {parseFloat(formatEther(nativeBalance.value)).toLocaleString('en-US', { maximumFractionDigits: 4 })} {NATIVE}
                    <span style={{ color: 'var(--primary)', fontWeight: 700, marginLeft: 2 }}>MAX</span>
                  </button>
                )}
                {mode === 'token' && tokenInfo && (
                  <button
                    onClick={() => tokenBalance != null && setAmount(formatUnits(tokenBalance, tokenInfo.decimals))}
                    disabled={tokenBalance == null}
                    title="Use max"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: tokenBalance != null ? 'pointer' : 'default', padding: 0, fontSize: 11, color: 'var(--foreground-subtle)' }}
                  >
                    <Wallet size={11} />
                    {balanceLoading
                      ? 'Loading…'
                      : tokenBalance != null
                        ? `${parseFloat(formatUnits(tokenBalance, tokenInfo.decimals)).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${tokenInfo.symbol}`
                        : `— ${tokenInfo.symbol}`}
                    {tokenBalance != null && <span style={{ color: 'var(--primary)', fontWeight: 700, marginLeft: 2 }}>MAX</span>}
                  </button>
                )}
              </div>
              <input value={amount} onChange={e => setAmount(e.target.value)}
                type="number" min="0" step="0.0001" placeholder="0.01"
                style={INPUT}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              {/* Insufficient balance warning */}
              {mode === 'token' && tokenInfo && tokenBalance != null && amount && (() => {
                try { return parseUnits(amount, tokenInfo.decimals) > tokenBalance; } catch { return false; }
              })() && (
                <p style={{ fontSize: 11, color: 'var(--error)', marginTop: 6 }}>Insufficient {tokenInfo.symbol} balance</p>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Remarks</label>
              <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Payment for services…"
                style={INPUT}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Token: approve step — shown until the on-chain allowance covers the amount */}
            {mode === 'token' && !hasEnoughAllowance && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--foreground-muted)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--foreground)' }}>Step 1:</strong> Approve the contract to spend your tokens.<br />
                  <strong style={{ color: 'var(--foreground)' }}>Step 2:</strong> Create the protected transfer.
                  {tokenInfo && allowance > 0n && requiredWei > 0n && allowance < requiredWei && (
                    <>
                      <br />
                      <span style={{ color: 'var(--warning)' }}>
                        Current approval is {allowanceDisplay} {tokenInfo.symbol} — approve {amount} {tokenInfo.symbol} to continue.
                      </span>
                    </>
                  )}
                </div>
                <button onClick={handleApprove}
                  disabled={approving || txKind === 'approve' || !tokenInfo || !amount || parseFloat(amount) <= 0}
                  style={{ width: '100%', padding: '13px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--primary)', color: 'var(--primary)', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (approving || txKind === 'approve' || !tokenInfo || !amount) ? 0.5 : 1 }}>
                  {txKind === 'approve'
                    ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Confirming approval…</>
                    : <><Coins size={15} /> {approving ? 'Approving…' : 'Approve Tokens'}</>}
                </button>
              </div>
            )}

            {/* Token: approved banner */}
            {mode === 'token' && hasEnoughAllowance && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.25)', fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                <CheckCircle2 size={15} />
                Approved {allowanceDisplay} {tokenInfo?.symbol} — ready to create transfer
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={mode === 'native' ? handleCreate : handleCreateToken}
              disabled={loading || (mode === 'token' && (!hasEnoughAllowance || checkingAllowance))}
              style={{ width: '100%', padding: '13px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (loading || (mode === 'token' && (!hasEnoughAllowance || checkingAllowance))) ? 0.5 : 1 }}>
              {mode === 'native' ? <Lock size={15} /> : <Coins size={15} />}
              {mode === 'native' ? 'Create Transfer' : 'Create Token Transfer'}
            </button>
          </div>
        </div>

        {/* ── Transfers list ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)' }}>
              My Transfers
              {(escrows.length + tokenEscrows.length) > 0 && (
                <span style={{ marginLeft: 10, padding: '3px 10px', borderRadius: 999, background: 'rgba(45,212,191,0.12)', color: 'var(--primary)', border: '1px solid rgba(45,212,191,0.25)', fontSize: 12, fontWeight: 700 }}>
                  {escrows.length + tokenEscrows.length}
                </span>
              )}
            </span>
            <button onClick={refresh} disabled={histLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              <RefreshCw size={13} style={{ animation: histLoading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Native escrows */}
            {escrows.map((e: EscrowRecord) => {
              const isSender    = e.sender.toLowerCase() === myAddr;
              const isPending   = e.status === 'Pending' || Number(e.status) === 0;
              const statusLabel = ESCROW_STATUS_LABEL[Number(e.status)] ?? e.status;
              const statusColor = statusLabel === 'Refunded' ? 'var(--foreground-muted)' : 'var(--primary)';
              return (
                <div key={`e-${e.id}`} style={{ padding: '20px 22px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(45,212,191,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={16} color={isSender ? 'var(--foreground-muted)' : 'var(--primary)'} />
                      </div>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', display: 'block' }}>#{e.id}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isSender ? 'var(--foreground-muted)' : 'var(--primary)' }}>{isSender ? 'SENT' : 'RECEIVED'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {e.createdAt && e.createdAt !== '0' && (
                        <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>
                          {new Date(parseInt(e.createdAt) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, padding: '3px 10px', borderRadius: 999, background: statusColor === 'var(--primary)' ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)' }}>{statusLabel}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px' }}>{formatPOT(e.amount)}</span>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(isSender ? e.recipient : e.sender)}
                      style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--foreground-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {isSender ? `→ ${shortAddress(e.recipient)}` : `← ${shortAddress(e.sender)}`}
                    </button>
                  </div>
                  {e.remarks && <p style={{ fontSize: 12, color: 'var(--foreground-subtle)', marginBottom: isPending ? 12 : 0, fontStyle: 'italic' }}>&ldquo;{e.remarks}&rdquo;</p>}
                  {isPending && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      {!isSender && (
                        <button onClick={() => handleClaim(e.id)} disabled={loading} style={{ flex: 1, padding: '10px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <ArrowDownCircle size={14} /> Claim
                        </button>
                      )}
                      {isSender && (
                        <button onClick={() => handleRefund(e.id)} disabled={loading} style={{ flex: 1, padding: '10px', borderRadius: 999, background: 'var(--surface-elevated)', color: 'var(--foreground-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <RotateCcw size={14} /> Refund
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Token escrows */}
            {tokenEscrows.map((e: TokenEscrowRecord) => {
              const isSender    = e.sender.toLowerCase() === myAddr;
              const isPending   = e.status === 'Pending' || Number(e.status) === 0;
              const statusLabel = ESCROW_STATUS_LABEL[Number(e.status)] ?? e.status;
              const statusColor = statusLabel === 'Refunded' ? 'var(--foreground-muted)' : 'var(--primary)';
              const knownToken  = getKnownToken(e.token);
              // Known tokens carry their real decimals; unknown ones fall back to 18.
              const amtDisplay  = (() => {
                try { return formatUnits(BigInt(e.amount), knownToken?.decimals ?? 18); }
                catch { return e.amount; }
              })();
              return (
                <div key={`t-${e.id}`} style={{ padding: '20px 22px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {knownToken ? <TokenLogo src={knownToken.logo} alt={knownToken.symbol} size={22} /> : <Coins size={16} color="var(--warning)" />}
                      </div>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', display: 'block' }}>#{e.id} · {knownToken ? knownToken.symbol : 'ERC-20'}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isSender ? 'var(--foreground-muted)' : 'var(--primary)' }}>{isSender ? 'SENT' : 'RECEIVED'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {e.createdAt && e.createdAt !== '0' && (
                        <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>
                          {new Date(parseInt(e.createdAt) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, padding: '3px 10px', borderRadius: 999, background: statusColor === 'var(--primary)' ? 'rgba(45,212,191,0.12)' : 'rgba(0,0,0,0.06)' }}>{statusLabel}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px' }}>
                        {parseFloat(amtDisplay).toLocaleString('en-US', { maximumFractionDigits: 6 })}
                        {knownToken && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground-muted)', marginLeft: 6 }}>{knownToken.symbol}</span>}
                      </span>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(isSender ? e.recipient : e.sender)}
                      style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--foreground-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {isSender ? `→ ${shortAddress(e.recipient)}` : `← ${shortAddress(e.sender)}`}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', fontFamily: 'monospace', marginBottom: e.remarks || isPending ? 8 : 0 }}>
                    Token: {shortAddress(e.token)}
                  </p>
                  {e.remarks && <p style={{ fontSize: 12, color: 'var(--foreground-subtle)', marginBottom: isPending ? 12 : 0, fontStyle: 'italic' }}>&ldquo;{e.remarks}&rdquo;</p>}
                  {isPending && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      {!isSender && (
                        <button onClick={() => handleClaimToken(e.id)} disabled={loading} style={{ flex: 1, padding: '10px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <ArrowDownCircle size={14} /> Claim Tokens
                        </button>
                      )}
                      {isSender && (
                        <button onClick={() => handleRefundToken(e.id)} disabled={loading} style={{ flex: 1, padding: '10px', borderRadius: 999, background: 'var(--surface-elevated)', color: 'var(--foreground-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <RotateCcw size={14} /> Refund Tokens
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {escrows.length === 0 && tokenEscrows.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                <Lock size={28} color="var(--foreground-subtle)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 15, color: 'var(--foreground-muted)' }}>No transfers yet</p>
              </div>
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

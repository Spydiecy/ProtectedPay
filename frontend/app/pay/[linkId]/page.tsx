'use client';

import { useState, useEffect, useCallback } from 'react';
import { parseEther, formatEther, createPublicClient, http } from 'viem';
import { useParams } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { PROTECTED_PAY_ABI } from '../../lib/abi';
import { shortAddress, xLayerTestnet, CONTRACT_ADDRESSES, EXPLORER_URLS } from '../../lib/wagmi';
import { useContractAddress } from '../../hooks/useContract';
import Toast, { ToastType } from '../../components/Toast';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { generateInvoicePDF } from '../../lib/invoice';
import { CheckCircle2, Ban, ArrowRight, ExternalLink, Shield, Copy, Check, Download, Share2 } from 'lucide-react';

const NATIVE = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'OKB';

// ── Dedicated read-only client — completely independent of wallet state ────────
const testnetClient = createPublicClient({
  chain: xLayerTestnet,
  transport: http('https://testrpc.xlayer.tech/terigon'),
});

interface LinkData {
  linkId: string;
  creator: string;
  amount: bigint;
  description: string;
  status: number;
  createdAt: bigint;
  paidAt: bigint;
  paidBy: string;
  remarks: string;
}

function fmtDate(ts: bigint) {
  if (!ts || ts === 0n) return '—';
  return new Date(Number(ts) * 1000).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Row({ label, value, highlight, mono, italic, copyVal }: {
  label: string; value: string;
  highlight?: boolean; mono?: boolean; italic?: boolean; copyVal?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--foreground-subtle)', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: highlight ? 16 : 13, fontWeight: highlight ? 800 : 500,
          color: highlight ? 'var(--primary)' : 'var(--foreground)',
          fontFamily: mono ? 'monospace' : 'inherit',
          fontStyle: italic ? 'italic' : 'normal',
        }}>{value}</span>
        {copyVal && (
          <button onClick={() => { navigator.clipboard.writeText(copyVal); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--foreground-subtle)', display: 'flex' }}>
            {copied ? <Check size={11} color="var(--primary)" /> : <Copy size={11} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Minimal branded header ────────────────────────────────────────────────────
function PageHeader() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, padding: '14px 24px' }}>
      <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <img src="/logo.png" alt="ProtectedPay" style={{ width: 26, height: 26, borderRadius: 7, objectFit: 'cover' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground-muted)', letterSpacing: '-0.2px' }}>
          Protected<span style={{ color: 'var(--primary)' }}>Pay</span>
        </span>
      </a>
    </div>
  );
}

export default function PayPage() {
  const params = useParams();
  const linkId = params?.linkId as string;

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const contractAddress = useContractAddress();

  const [link,        setLink]        = useState<LinkData | null>(null);
  const [notFound,    setNotFound]    = useState(false);
  const [fetching,    setFetching]    = useState(true);
  const [remarks,     setRemarks]     = useState('');
  const [customAmt,   setCustomAmt]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; type: ToastType } | null>(null);
  const [txHash,      setTxHash]      = useState<`0x${string}` | undefined>();
  const [savedTxHash, setSavedTxHash] = useState<string | undefined>(); // persisted after receipt confirmed
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [addrCopied,  setAddrCopied]  = useState(false);
  const [justPaid,    setJustPaid]    = useState(false); // true if this browser session did the payment

  const [detectedChainId, setDetectedChainId] = useState<number | null>(null);

  const t = (msg: string, type: ToastType) => setToast({ msg, type });
  const { isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  const loadLink = useCallback(async () => {
    if (!linkId) return;
    setFetching(true);
    setNotFound(false);

    // Read-only client — works even with no wallet connected, on any browser.
    const chainId = xLayerTestnet.id;
    const addr = CONTRACT_ADDRESSES[chainId];

    try {
      const data = await testnetClient.readContract({
        address: addr, abi: PROTECTED_PAY_ABI,
        functionName: 'getPaymentLink', args: [linkId as `0x${string}`],
      }) as LinkData;
      if (data && data.creator !== '0x0000000000000000000000000000000000000000') {
        setLink(data);
        setDetectedChainId(chainId);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const user = await testnetClient.readContract({ address: addr, abi: PROTECTED_PAY_ABI, functionName: 'getUser', args: [data.creator as `0x${string}`] }) as any;
          if (user?.username) setCreatorName(user.username);
        } catch { /* no username */ }
        setFetching(false);
        return;
      }
    } catch { /* not found */ }

    setNotFound(true);
    setFetching(false);
  }, [linkId]);

  useEffect(() => { loadLink(); }, [loadLink]);

  useEffect(() => {
    if (isSuccess) {
      setSavedTxHash(receipt?.transactionHash);
      setJustPaid(true);
      t('Payment sent! 🎉', 'success');
      loadLink();
      setTxHash(undefined);
    }
  }, [isSuccess, loadLink, receipt]);

  const handlePay = useCallback(async () => {
    if (!link || !isConnected) return;
    const value = link.amount > 0n ? link.amount : parseEther(customAmt || '0');
    if (value === 0n) { t('Enter an amount', 'error'); return; }
    // Use the contract address where the link was found
    const payContractAddress = detectedChainId
      ? CONTRACT_ADDRESSES[detectedChainId]
      : contractAddress;
    setLoading(true); t('Submitting…', 'loading');
    try {
      const hash = await writeContractAsync({
        address: payContractAddress, abi: PROTECTED_PAY_ABI,
        functionName: 'payLink', args: [linkId as `0x${string}`, remarks], value,
      });
      setTxHash(hash);
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [link, linkId, remarks, customAmt, writeContractAsync, isConnected, detectedChainId, contractAddress]);

  const handleDownloadInvoice = useCallback((l: LinkData, txH?: string) => {
    const explorer = detectedChainId ? EXPLORER_URLS[detectedChainId] : EXPLORER_URLS[xLayerTestnet.id];
    const amtDisplay = l.amount === 0n
      ? 'Custom'
      : `${parseFloat(formatEther(l.amount)).toFixed(4)} ${NATIVE}`;
    generateInvoicePDF({
      invoiceId:         l.linkId,
      description:       l.description,
      amount:            amtDisplay,
      paidBy:            l.paidBy,
      paidTo:            creatorName ? `@${creatorName} (${l.creator})` : l.creator,
      paidAt:            fmtDate(l.paidAt),
      remarks:           l.remarks || undefined,
      txHash:            txH,
      explorerUrl:       txH ? `${explorer}/tx/${txH}` : undefined,
      payerExplorerUrl:  `${explorer}/address/${l.paidBy}`,
    });
  }, [creatorName, detectedChainId]);

  const handleShare = useCallback(async (l: LinkData) => {
    const url = `${window.location.origin}/pay/${l.linkId}`;
    const amtText = l.amount === 0n ? '' : ` · ${parseFloat(formatEther(l.amount)).toFixed(4)} ${NATIVE}`;
    const shareData = {
      title: `Payment Receipt — ${l.description}`,
      text:  `View the payment receipt for "${l.description}"${amtText}`,
      url,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        t('Link copied to clipboard!', 'success');
      }
    } catch { /* user cancelled share */ }
  }, []);

  const creatorDisplay = creatorName ? `@${creatorName}` : shortAddress(link?.creator ?? '');

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className="pay-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ fontSize: 13, color: 'var(--foreground-subtle)' }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (notFound || !link) {
    return (
      <>
        <PageHeader />
        <div className="pay-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 340 }}>
            <Ban size={40} color="var(--foreground-subtle)" style={{ margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', marginBottom: 8 }}>Link Not Found</h1>
            <p style={{ fontSize: 13, color: 'var(--foreground-muted)', lineHeight: 1.6, marginBottom: 24 }}>This payment link doesn&apos;t exist or has been removed.</p>
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              Go to ProtectedPay
            </a>
          </div>
        </div>
      </>
    );
  }

  if (link.status === 2) {
    return (
      <>
        <PageHeader />
        <div className="pay-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 340 }}>
            <Ban size={40} color="var(--foreground-subtle)" style={{ margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', marginBottom: 8 }}>Link Cancelled</h1>
            <p style={{ fontSize: 13, color: 'var(--foreground-muted)', lineHeight: 1.6 }}>This payment link has been cancelled by the creator.</p>
          </div>
        </div>
      </>
    );
  }

  if (link.status === 1) {
    const effectiveTxHash = savedTxHash ?? receipt?.transactionHash;
    const isPayer = address && link.paidBy.toLowerCase() === address.toLowerCase();

    return (
      <>
        <PageHeader />
        <div className="pay-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, width: '100%' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 32px rgba(45,212,191,0.2)' }}>
                <CheckCircle2 size={30} color="var(--primary)" />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', marginBottom: 4, letterSpacing: '-0.5px' }}>
                {justPaid ? 'Payment Sent! 🎉' : 'Payment Complete'}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>{link.description}</p>
            </div>

            {/* Receipt card */}
            <div style={{
              padding: '24px', borderRadius: 20,
              background: 'var(--surface-card)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
              backdropFilter: 'blur(8px)',
              marginBottom: 14,
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 8 }}>Receipt</p>
              <Row label="Amount"  value={link.amount === 0n ? 'Custom' : `${parseFloat(formatEther(link.amount)).toFixed(4)} ${NATIVE}`} highlight />
              <Row label="Paid by" value={shortAddress(link.paidBy)} mono copyVal={link.paidBy} />
              <Row label="To"      value={creatorDisplay} mono copyVal={link.creator} />
              <Row label="Date"    value={fmtDate(link.paidAt)} />
              {link.remarks && <Row label="Note" value={`"${link.remarks}"`} italic />}
              {effectiveTxHash && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>Transaction</span>
                  <a href={`${detectedChainId ? EXPLORER_URLS[detectedChainId] : EXPLORER_URLS[xLayerTestnet.id]}/tx/${effectiveTxHash}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'monospace', color: 'var(--primary)', textDecoration: 'none' }}>
                    {shortAddress(effectiveTxHash)} <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>

            {/* Download + Share buttons */}
            {(justPaid || isPayer || link.status === 1) && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <button
                  onClick={() => handleDownloadInvoice(link, effectiveTxHash)}
                  style={{ flex: 1, padding: '12px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(45,212,191,0.3)' }}>
                  <Download size={15} /> Download Invoice
                </button>
                <button
                  onClick={() => handleShare(link)}
                  style={{ padding: '12px 18px', borderRadius: 999, background: 'var(--surface-elevated)', color: 'var(--foreground-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Share2 size={15} /> Share
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Shield size={11} color="var(--foreground-subtle)" />
              <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>Secured by ProtectedPay · X Layer Testnet</span>
            </div>
          </div>
        </div>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  const payLabel = link.amount > 0n
    ? `Pay ${parseFloat(formatEther(link.amount)).toFixed(4)} ${NATIVE}`
    : customAmt ? `Pay ${customAmt} ${NATIVE}` : 'Pay Now';

  return (
    <>
      <PageHeader />
      <div className="pay-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 420, width: '100%' }}>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {/* Floating icon */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(45,212,191,0.12)',
              border: '1px solid rgba(45,212,191,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 32px rgba(45,212,191,0.18)',
            }}>
              <Shield size={24} color="var(--primary)" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px', marginBottom: 8 }}>
              {link.description}
            </h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}>Requested by</span>
              <button onClick={() => { navigator.clipboard.writeText(link.creator); setAddrCopied(true); setTimeout(() => setAddrCopied(false), 1500); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                {creatorDisplay}
                {addrCopied ? <Check size={10} color="var(--primary)" /> : <Copy size={10} />}
              </button>
            </div>
          </div>

          {/* Payment card */}
          <div style={{
            padding: '28px', borderRadius: 22,
            background: 'var(--surface-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(45,212,191,0.05)',
            backdropFilter: 'blur(12px)',
            marginBottom: 16,
          }}>

            {/* Fixed amount */}
            {link.amount > 0n && (
              <div style={{
                textAlign: 'center', paddingBottom: 24, marginBottom: 22,
                borderBottom: '1px solid var(--border)',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--foreground-subtle)', textTransform: 'uppercase', marginBottom: 10 }}>Amount Due</p>
                <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 52, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-3px', lineHeight: 1 }}>
                    {parseFloat(formatEther(link.amount)).toFixed(4)}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)', opacity: 0.7 }}>{NATIVE}</span>
                </div>

              </div>
            )}

            {/* Open amount */}
            {link.amount === 0n && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--foreground-subtle)', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>Enter Amount</p>
                <input value={customAmt} onChange={e => setCustomAmt(e.target.value)}
                  type="number" min="0" step="0.001" placeholder={`0.00`}
                  style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'var(--surface-elevated)', color: 'var(--primary)', border: '1px solid var(--border)', fontSize: 28, fontWeight: 800, outline: 'none', boxSizing: 'border-box' as const, textAlign: 'center', letterSpacing: '-1px' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--foreground-subtle)', marginTop: 6 }}>{NATIVE}</p>
              </div>
            )}

            {/* Note */}
            <div style={{ marginBottom: 20 }}>
              <input value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder="Add a note (optional)"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, background: 'var(--surface-elevated)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Action */}
            {isConnected ? (
              <button onClick={handlePay} disabled={loading}
                style={{ width: '100%', padding: '15px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? 0.65 : 1, transition: 'opacity 0.15s', boxShadow: '0 4px 20px rgba(45,212,191,0.35)' }}>
                {loading
                  ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />Processing…</>
                  : <>{payLabel} <ArrowRight size={18} /></>
                }
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--foreground-subtle)', marginBottom: 4 }}>Connect your wallet to pay</p>
                <ConnectButton />
              </div>
            )}
          </div>

          {/* Trust line */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Shield size={11} color="var(--foreground-subtle)" />
            <span style={{ fontSize: 11, color: 'var(--foreground-subtle)' }}>Secured by ProtectedPay · X Layer Testnet</span>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

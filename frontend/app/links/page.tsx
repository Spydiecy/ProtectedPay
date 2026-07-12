'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useHistory, formatPOT, PaymentLinkRecord } from '../hooks/useHistory';
import { PROTECTED_PAY_ABI } from '../lib/abi';
import { shortAddress } from '../lib/wagmi';
import { useContractAddress } from '../hooks/useContract';
import WalletGuard from '../components/WalletGuard';
import Toast, { ToastType } from '../components/Toast';
import QRCode from 'qrcode';
import { generateInvoicePDF } from '../lib/invoice';
import {
  Link2, Plus, Copy, Check, QrCode, XCircle,
  RefreshCw, ExternalLink, Clock, CheckCircle2, Ban, Download, Share2,
} from 'lucide-react';

const NATIVE = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'HSK';

const LINK_COLORS: Record<string, string> = {
  Active:    'var(--primary)',
  Paid:      'var(--success)',
  Cancelled: 'var(--foreground-muted)',
};
const LINK_BG: Record<string, string> = {
  Active:    'rgba(45,212,191,0.12)',
  Paid:      'rgba(45,212,191,0.12)',
  Cancelled: 'rgba(0,0,0,0.06)',
};

function fmtDate(ts: string) {
  if (!ts || ts === '0') return '—';
  return new Date(parseInt(ts) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function payUrl(linkId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/pay/${linkId}`;
}

// ── QR modal ─────────────────────────────────────────────────────────────────
function QRModal({ linkId, description, onClose }: { linkId: string; description: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = payUrl(linkId);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 260,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }, [url]);

  const download = () => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.download = `payment-link-${linkId.slice(0, 10)}.png`;
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--overlay)' }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface-card)', borderRadius: 20, padding: 32, border: '1px solid var(--border)', maxWidth: 340, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>QR Code</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{description}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)', padding: 4 }}>
            <XCircle size={18} />
          </button>
        </div>
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', background: '#fff', padding: 8 }}>
          <canvas ref={canvasRef} />
        </div>
        <div style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'monospace', color: 'var(--foreground-muted)', wordBreak: 'break-all', textAlign: 'center' }}>
          {url}
        </div>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button onClick={() => navigator.clipboard.writeText(url)}
            style={{ flex: 1, padding: '10px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Copy size={13} /> Copy Link
          </button>
          <button onClick={download}
            style={{ flex: 1, padding: '10px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <QrCode size={13} /> Download
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Link card ─────────────────────────────────────────────────────────────────
function LinkCard({ link, onCancel, onQR }: {
  link: PaymentLinkRecord;
  onCancel: (id: string) => void;
  onQR: (id: string, desc: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = payUrl(link.linkId);
  const isActive = link.status === 'Active';
  const isPaid   = link.status === 'Paid';

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const EXPLORER = 'https://testnet-explorer.hsk.xyz';
    generateInvoicePDF({
      invoiceId:        link.linkId,
      description:      link.description,
      amount:           link.amount === '0' ? 'Custom' : `${parseFloat(formatEther(BigInt(link.amount))).toFixed(4)} ${NATIVE}`,
      paidBy:           link.paidBy,
      paidTo:           link.creator,
      paidAt:           fmtDate(link.paidAt),
      remarks:          link.remarks || undefined,
      payerExplorerUrl: link.paidBy && link.paidBy !== '0x0000000000000000000000000000000000000000'
                          ? `${EXPLORER}/address/${link.paidBy}` : undefined,
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: isActive ? `Pay: ${link.description}` : `Receipt: ${link.description}`,
      text:  isActive
        ? `Pay ${link.amount !== '0' ? `${parseFloat(formatEther(BigInt(link.amount))).toFixed(4)} ${NATIVE}` : ''} for "${link.description}"`
        : `Payment receipt for "${link.description}"`,
      url,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch { /* user cancelled */ }
  };

  return (
    <div style={{ padding: '20px 24px', borderRadius: 14, background: 'var(--surface-card)', border: `1px solid ${isActive ? 'var(--border)' : 'var(--border)'}`, overflow: 'hidden' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: isPaid ? 'rgba(45,212,191,0.12)' : 'rgba(45,212,191,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isPaid ? <CheckCircle2 size={18} color="var(--primary)" /> : isActive ? <Link2 size={18} color="var(--primary)" /> : <Ban size={18} color="var(--foreground-muted)" />}
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>{link.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {link.amount !== '0' ? (
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{formatPOT(link.amount)}</span>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--foreground-muted)', fontStyle: 'italic' }}>any amount</span>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: LINK_BG[link.status] ?? 'rgba(0,0,0,0.06)', color: LINK_COLORS[link.status] ?? 'var(--foreground-muted)' }}>
                {link.status}
              </span>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', flexShrink: 0, marginLeft: 8 }}>
          {fmtDate(link.createdAt).split(',')[0]}
        </p>
      </div>

      {/* Link ID chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: 'var(--surface-elevated)', border: '1px solid var(--border)', marginBottom: 12, fontSize: 11, fontFamily: 'monospace', color: 'var(--foreground-subtle)', overflow: 'hidden' }}>
        <Link2 size={11} color="var(--foreground-subtle)" style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{url}</span>
      </div>

      {/* Receipt (if paid) */}
      {isPaid && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.2)', marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 6 }}>Receipt</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--foreground-subtle)', marginBottom: 2 }}>Paid by</p>
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--foreground-muted)' }}>{shortAddress(link.paidBy)}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'var(--foreground-subtle)', marginBottom: 2 }}>Paid at</p>
              <p style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>{fmtDate(link.paidAt)}</p>
            </div>
            {link.remarks && (
              <div>
                <p style={{ fontSize: 10, color: 'var(--foreground-subtle)', marginBottom: 2 }}>Note</p>
                <p style={{ fontSize: 12, color: 'var(--foreground-muted)', fontStyle: 'italic' }}>&ldquo;{link.remarks}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={copy}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {copied ? <Check size={12} color="var(--primary)" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button onClick={() => onQR(link.linkId, link.description)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <QrCode size={12} /> QR Code
        </button>
        <button onClick={handleShare}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <Share2 size={12} /> Share
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
          <ExternalLink size={12} /> {isPaid ? 'View Receipt' : 'Preview'}
        </a>
        {isPaid && (
          <button onClick={handleDownload}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 999, background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={12} /> Download Invoice
          </button>
        )}
        {isActive && (
          <button onClick={() => onCancel(link.linkId)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 999, background: 'transparent', border: '1px solid var(--error-container)', color: 'var(--error)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
            <XCircle size={12} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────
function LinksContent() {
  const contractAddress = useContractAddress();
  const chainId = useChainId();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { paymentLinks, loading: histLoading, refresh } = useHistory();

  const [description, setDescription] = useState('');
  const [amount,      setAmount]      = useState('');
  const [anyAmount,   setAnyAmount]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; type: ToastType } | null>(null);
  const [txHash,      setTxHash]      = useState<`0x${string}` | undefined>();
  const [qrTarget,    setQrTarget]    = useState<{ linkId: string; description: string } | null>(null);
  const [filter,      setFilter]      = useState<'all' | 'Active' | 'Paid' | 'Cancelled'>('all');

  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const t = (msg: string, type: ToastType) => setToast({ msg, type });

  useEffect(() => { refresh(); }, [address, chainId]); // eslint-disable-line
  useEffect(() => { if (isSuccess) { t('Done!', 'success'); refresh(); setTxHash(undefined); } }, [isSuccess]); // eslint-disable-line

  const handleCreate = useCallback(async () => {
    if (!description.trim()) { t('Add a description', 'error'); return; }
    if (!anyAmount && (!amount || parseFloat(amount) <= 0)) { t('Enter an amount or enable "any amount"', 'error'); return; }
    setLoading(true); t('Creating link…', 'loading');
    try {
      const weiAmount = anyAmount ? 0n : parseEther(amount);
      const hash = await writeContractAsync({
        address: contractAddress, abi: PROTECTED_PAY_ABI,
        functionName: 'createPaymentLink',
        args: [weiAmount, description.trim()],
      });
      setTxHash(hash);
      setDescription(''); setAmount(''); setAnyAmount(false);
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [description, amount, anyAmount, writeContractAsync]);

  const handleCancel = useCallback(async (linkId: string) => {
    setLoading(true); t('Cancelling…', 'loading');
    try {
      const hash = await writeContractAsync({
        address: contractAddress, abi: PROTECTED_PAY_ABI,
        functionName: 'cancelPaymentLink',
        args: [linkId as `0x${string}`],
      });
      setTxHash(hash);
    } catch (e: unknown) { t(e instanceof Error ? e.message.slice(0, 80) : 'Failed', 'error'); }
    finally { setLoading(false); }
  }, [writeContractAsync]);

  const filtered = filter === 'all' ? paymentLinks : paymentLinks.filter(l => l.status === filter);

  const counts = {
    all:       paymentLinks.length,
    Active:    paymentLinks.filter(l => l.status === 'Active').length,
    Paid:      paymentLinks.filter(l => l.status === 'Paid').length,
    Cancelled: paymentLinks.filter(l => l.status === 'Cancelled').length,
  };

  const INPUT: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    background: 'var(--surface-elevated)', color: 'var(--foreground)',
    border: '1px solid var(--border)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '32px 36px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 6 }}>HashKey Pay</p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-1px' }}>Payment Links</h1>
        <p style={{ fontSize: 14, color: 'var(--foreground-muted)', marginTop: 4 }}>Create shareable payment links with QR codes</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Create form ── */}
        <div style={{ padding: '28px', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <Link2 size={17} color="var(--primary)" />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Create Link</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Invoice #42, Coffee, Design work…"
                style={INPUT}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Amount ({NATIVE})</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--foreground-muted)' }}>
                  <input type="checkbox" checked={anyAmount} onChange={e => setAnyAmount(e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  Any amount
                </label>
              </div>
              <input value={amount} onChange={e => setAmount(e.target.value)}
                type="number" min="0" step="0.0001" placeholder="0.01"
                disabled={anyAmount}
                style={{ ...INPUT, opacity: anyAmount ? 0.4 : 1 }}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Preview */}
            {description && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--foreground-subtle)', textTransform: 'uppercase', marginBottom: 6 }}>Preview</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 2 }}>{description}</p>
                <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>
                  {anyAmount ? 'Payer chooses amount' : amount ? `${amount} ${NATIVE}` : '—'}
                </p>
              </div>
            )}

            <button onClick={handleCreate} disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.6 : 1 }}>
              <Plus size={16} /> Create Payment Link
            </button>
          </div>
        </div>

        {/* ── Links list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)' }}>
              My Links
              {paymentLinks.length > 0 && <span style={{ marginLeft: 10, padding: '3px 10px', borderRadius: 999, background: 'rgba(45,212,191,0.12)', color: 'var(--primary)', border: '1px solid rgba(45,212,191,0.25)', fontSize: 12, fontWeight: 700 }}>{paymentLinks.length}</span>}
            </span>
            <button onClick={refresh} disabled={histLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              <RefreshCw size={13} style={{ animation: histLoading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, padding: 3, borderRadius: 9, background: 'var(--surface-elevated)', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
            {(['all', 'Active', 'Paid', 'Cancelled'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', background: filter === f ? 'var(--surface-card)' : 'transparent', color: filter === f ? 'var(--primary)' : 'var(--foreground-muted)', fontSize: 12, fontWeight: filter === f ? 700 : 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                {f === 'Active' && <Clock size={11} />}
                {f === 'Paid' && <CheckCircle2 size={11} />}
                {f === 'Cancelled' && <Ban size={11} />}
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span style={{ fontSize: 10, color: filter === f ? 'var(--primary)' : 'var(--foreground-subtle)' }}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                <Link2 size={28} color="var(--foreground-subtle)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 15, color: 'var(--foreground-muted)' }}>
                  {filter === 'all' ? 'No payment links yet' : `No ${filter.toLowerCase()} links`}
                </p>
              </div>
            ) : (
              filtered.map(link => (
                <LinkCard key={link.linkId} link={link}
                  onCancel={handleCancel}
                  onQR={(id, desc) => setQrTarget({ linkId: id, description: desc })}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {qrTarget && <QRModal linkId={qrTarget.linkId} description={qrTarget.description} onClose={() => setQrTarget(null)} />}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function LinksPage() {
  return <WalletGuard><LinksContent /></WalletGuard>;
}

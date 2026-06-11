'use client';

import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Wallet, Loader2 } from 'lucide-react';

export default function WalletGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting } = useAccount();
  const { openConnectModal } = useConnectModal();

  if (isConnecting) {
    return (
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>Connecting wallet…</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--background)' }}>
        <div style={{ maxWidth: 380, width: '100%', padding: 40, borderRadius: 20, textAlign: 'center', background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <Wallet size={32} color="var(--primary)" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', marginBottom: 10, letterSpacing: '-0.5px' }}>Connect Wallet</h2>
          <p style={{ fontSize: 14, color: 'var(--foreground-muted)', lineHeight: 1.6, marginBottom: 28 }}>
            Connect your EVM wallet to use ProtectedPay on QIE Testnet.
          </p>
          <button
            onClick={() => openConnectModal?.()}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}
          >
            <Wallet size={16} /> Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

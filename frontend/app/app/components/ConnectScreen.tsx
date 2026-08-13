'use client';

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Wallet, Lock, Users, Zap, Globe } from 'lucide-react';

export default function ConnectScreen() {
  const { openConnectModal } = useConnectModal();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: 24 }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <img src="/logo.png" alt="FlarePay" style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover', display: 'block', margin: '0 auto 24px' }} />
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-1px', marginBottom: 10 }}>Connect your wallet</h1>
        <p style={{ fontSize: 15, color: 'var(--foreground-muted)', lineHeight: 1.7, marginBottom: 32 }}>
          Connect your EVM wallet to access FlarePay on the Flare Testnet Coston2.
        </p>
        <button onClick={() => openConnectModal?.()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, marginBottom: 32 }}>
          <Wallet size={17} /> Connect Wallet
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: Lock,  label: 'Protected Transfer', accent: 'var(--escrow-accent)',  bg: 'var(--escrow-bg)'  },
            { icon: Users, label: 'Group Split',        accent: 'var(--group-accent)',   bg: 'var(--group-bg)'   },
            { icon: Zap,   label: 'Batch Payment',      accent: 'var(--batch-accent)',   bg: 'var(--batch-bg)'   },
            { icon: Globe, label: 'Username Registry',  accent: 'var(--profile-accent)', bg: 'var(--profile-bg)' },
          ].map(({ icon: Icon, label, accent, bg }) => (
            <div key={label} style={{ padding: '14px 16px', borderRadius: 12, background: bg, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={16} color={accent} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

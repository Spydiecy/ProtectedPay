'use client';

import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { X, Wallet, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { flareTestnet, shortAddress } from '../lib/wagmi';

interface WalletModalProps {
  onClose: () => void;
}

export default function WalletModal({ onClose }: WalletModalProps) {
  const { openConnectModal } = useConnectModal();
  const { disconnect }  = useDisconnect();
  const { isConnected, address, connector: activeConnector } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== flareTestnet.id;

  const handleConnect = () => {
    onClose();
    openConnectModal?.();
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--overlay)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201, width: 'calc(100% - 32px)', maxWidth: 400,
      }}>
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/logo.png" alt="FlarePay"
                style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'cover' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.3px' }}>
                {isConnected ? 'Wallet' : 'Connect Wallet'}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: '3px 8px', borderRadius: 999,
                background: 'rgba(45,212,191,0.12)',
                color: 'var(--primary)',
                border: '1px solid rgba(45,212,191,0.25)',
              }}>
                Flare Testnet
              </span>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, color: 'var(--foreground-muted)',
              display: 'flex', borderRadius: 8,
            }}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: 24 }}>

            {/* Wrong network */}
            {isWrongNetwork && (
              <div style={{
                display: 'flex', gap: 12, padding: '14px 16px', borderRadius: 12,
                background: 'var(--warning-container)',
                border: '1px solid rgba(251,191,36,0.3)',
                marginBottom: 18,
              }}>
                <AlertCircle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)', marginBottom: 8 }}>
                    Wrong network — switch to Flare Testnet
                  </p>
                  <button
                    onClick={() => switchChain({ chainId: flareTestnet.id })}
                    disabled={isSwitching}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 999,
                      background: 'var(--primary)', color: 'var(--primary-fg)',
                      border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {isSwitching && <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                    Switch to Flare Testnet Coston2
                  </button>
                </div>
              </div>
            )}

            {isConnected && address ? (
              /* Connected state */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px', borderRadius: 14,
                  background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: 'var(--primary-container)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckCircle size={20} color="var(--primary)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>
                      {activeConnector?.name || 'Wallet'}
                    </p>
                    <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--foreground-muted)' }}>
                      {shortAddress(address)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { disconnect(); onClose(); }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 999,
                    background: 'transparent', color: 'var(--error)',
                    border: '1px solid var(--error-container)',
                    cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              /* Not connected */
              <div>
                <p style={{ fontSize: 14, color: 'var(--foreground-muted)', marginBottom: 20, lineHeight: 1.65 }}>
                  Connect your EVM wallet to use FlarePay on the Flare Testnet Coston2. Supports MetaMask, Rainbow, Coinbase Wallet, WalletConnect, and more.
                </p>
                <button
                  onClick={handleConnect}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px', borderRadius: 999,
                    background: 'var(--primary)', color: 'var(--primary-fg)',
                    border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700,
                    marginBottom: 16,
                  }}
                >
                  <Wallet size={17} /> Choose Wallet
                </button>
                <p style={{ fontSize: 12, color: 'var(--foreground-subtle)', textAlign: 'center' }}>
                  New to Flare?{' '}
                  <a href="https://coston2-explorer.flare.network" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    View explorer ↗
                  </a>
                  {' '}·{' '}
                  <a href="https://faucet.flare.network/" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    Get test funds ↗
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

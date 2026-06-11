'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAccount, useDisconnect, useChainId } from 'wagmi';
import WalletModal from './WalletModal';
import { Menu, X, Sun, Moon, ArrowRight, Wallet, ChevronDown } from 'lucide-react';

const LANDING_LINKS = [
  { href: '#features',     label: 'Features'      },
  { href: '#how-it-works', label: 'How it Works'  },
  { href: '#faq',          label: 'FAQs'          },
];

export default function Navbar() {
  const pathname  = usePathname();
  const { theme, setTheme } = useTheme();
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId   = useChainId();

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [showAccount,  setShowAccount]  = useState(false);
  const [mounted,      setMounted]      = useState(false);
  const [scrolled,     setScrolled]     = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/app')) return null;

  const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileOpen(false);
  };

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'color-mix(in srgb, var(--background) 92%, transparent)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'all 0.3s',
      }}>
        <div className="page-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <img src="/logo.png" alt="ProtectedPay" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.3px' }}>
                Protected<span style={{ color: 'var(--primary)' }}>Pay</span>
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {LANDING_LINKS.map(({ href, label }) => (
                <a key={href} href={href} onClick={e => handleAnchor(e, href)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--foreground-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--foreground-muted)')}
                >
                  {label}
                </a>
              ))}
            </div>

            {/* Right */}
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Theme toggle */}
              {mounted && (
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground-muted)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground-muted)'; }}
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
              )}

              {/* Wallet button */}
              {isConnected && address ? (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowAccount(!showAccount)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: 'var(--primary-container)', color: 'var(--on-primary-container)', border: '1px solid rgba(45,212,191,0.3)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <Wallet size={13} />
                    {shortAddr(address)}
                    <ChevronDown size={12} style={{ transform: showAccount ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                  {showAccount && (
                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 240, borderRadius: 14, zIndex: 200, background: 'var(--surface-card)', border: '1px solid var(--border)', boxShadow: '0 16px 48px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', marginBottom: 2 }}>{connector?.name}</p>
                        <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--foreground-muted)' }}>{address}</p>
                        <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', marginTop: 2 }}>Chain ID: {chainId}</p>
                      </div>
                      <div style={{ padding: 8 }}>
                        <button onClick={() => { disconnect(); setShowAccount(false); }} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 13, fontWeight: 500, transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--error-container)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                  <Wallet size={14} /> Connect
                </button>
              )}

              <Link href="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 999, background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-muted)', fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--foreground-muted)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground-muted)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; }}
              >
                Launch App <ArrowRight size={14} />
              </Link>
            </div>

            {/* Mobile */}
            <div className="show-mobile" style={{ alignItems: 'center', gap: 8 }}>
              {mounted && (
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)', padding: 6 }}>
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              )}
              <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', padding: 6 }}>
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-elevated)', padding: '12px 24px 20px' }}>
            {LANDING_LINKS.map(({ href, label }) => (
              <a key={href} href={href} onClick={e => handleAnchor(e, href)} style={{ display: 'block', padding: '12px 0', fontSize: 16, fontWeight: 500, color: 'var(--foreground)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>
                {label}
              </a>
            ))}
            <div style={{ marginTop: 16 }}>
              {isConnected && address ? (
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--foreground-muted)' }}>{shortAddr(address)}</p>
                </div>
              ) : (
                <button onClick={() => { setShowModal(true); setMobileOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                  <Wallet size={16} /> Connect Wallet
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {showModal && <WalletModal onClose={() => setShowModal(false)} />}
    </>
  );
}

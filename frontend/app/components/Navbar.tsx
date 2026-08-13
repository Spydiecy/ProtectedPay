'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Menu, X, Sun, Moon, ArrowRight } from 'lucide-react';

const LANDING_LINKS = [
  { href: '#features',     label: 'Features'     },
  { href: '#how-it-works', label: 'How it Works' },
  { href: '#faq',          label: 'FAQs'         },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hide on /app and /pay routes
  if (pathname?.startsWith('/app') || pathname?.startsWith('/pay')) return null;

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileOpen(false);
  };

  return (
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
            <img src="/logo.png" alt="FlarePay" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.3px' }}>
              Flare<span style={{ color: 'var(--primary)' }}>Pay</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {LANDING_LINKS.map(({ href, label }) => (
              <a key={href} href={href} onClick={e => handleAnchor(e, href)}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--foreground-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--foreground-muted)')}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Desktop right — theme toggle + Launch App */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground-muted)', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground-muted)'; }}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            )}

            <Link href="/app"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 14, fontWeight: 700, textDecoration: 'none', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '0.88'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '1'}
            >
              Launch App <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile controls */}
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
            <a key={href} href={href} onClick={e => handleAnchor(e, href)}
              style={{ display: 'block', padding: '12px 0', fontSize: 16, fontWeight: 500, color: 'var(--foreground)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}
            >
              {label}
            </a>
          ))}
          <div style={{ marginTop: 16 }}>
            <Link href="/app" onClick={() => setMobileOpen(false)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
            >
              Launch App <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

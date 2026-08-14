'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ContainerScroll } from './components/ui/container-scroll-animation';
import {
  ArrowRight, Lock, Users, Zap, Globe,
  ShieldCheck, Sparkles, ChevronDown, Link2, Bot, Coins,
} from 'lucide-react';

// Official X (Twitter) logo SVG
const XLogo = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// GitHub logo SVG
const GithubLogo = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const FEATURES = [
  {
    num: '01', tag: 'PROTECTED', icon: Lock,
    title: 'Lock funds until the recipient claims.',
    desc: 'Create a protected transfer. Recipient claims when ready, or you refund if they don\'t. Zero trust required.',
    stat: '100%', statLabel: 'NON-CUSTODIAL',    href: '/app',
  },
  {
    num: '02', tag: 'TOKEN ESCROW', icon: Coins,
    title: 'Escrow any ERC-20 token, not just C2FLR.',
    desc: 'Paste a token contract address, approve once, and lock any ERC-20 in the same trustless escrow flow. Claim or refund anytime.',    stat: 'ANY', statLabel: 'ERC-20',
    href: '/app',
  },
  {
    num: '03', tag: 'GROUP', icon: Users,
    title: 'Crowdfund a payment with your team.',
    desc: 'Set a total, invite contributors. Funds auto-release to the recipient when everyone has paid. Anyone can withdraw their share anytime.',
    stat: 'N→1', statLabel: 'CONTRIBUTORS',
    href: '/app',
  },
  {
    num: '04', tag: 'BATCH', icon: Zap,
    title: 'One transaction to pay everyone.',
    desc: 'Send to dozens of recipients atomically. All succeed or all revert. Perfect for payroll, airdrops, and bulk payouts.',
    stat: '1 TX', statLabel: 'ATOMIC',
    href: '/app',
  },
  {
    num: '05', tag: 'PAYMENT LINKS', icon: Link2,
    title: 'Create a link. Get paid. Download invoice.',
    desc: 'Share a URL or QR code for any payment — fixed or open amount. Once paid, both parties get a downloadable PDF receipt with the transaction hash.',
    stat: 'QR', statLabel: '+ PDF RECEIPT',
    href: '/app',
  },
  {
    num: '06', tag: 'PAYBOT AI', icon: Bot,
    title: 'Talk to your wallet in plain English.',
    desc: 'Ask PayBot to send funds, check history, or create payment links. It executes real on-chain transactions directly from the chat — no page navigation needed.',
    stat: 'AI', statLabel: 'POWERED',
    href: '/app',
  },
  {
    num: '07', tag: 'IDENTITY', icon: Globe,
    title: 'Send to names, not addresses.',
    desc: 'Register a human-readable username on-chain. Anyone can resolve @yourname to your address instantly. Works across all features.',
    stat: '@you', statLabel: 'ON-CHAIN',
    href: '/app',
  },
  {
    num: '08', tag: 'SECURITY', icon: ShieldCheck,
    title: 'Smart contracts, not promises.',
    desc: 'No admin key, no upgrade mechanism, no pause function. Every payment is enforced by EVM code on Flare.',
    stat: '0', statLabel: 'MIDDLEMEN',
    href: '/app',
  },
  {
    num: '09', tag: 'SIMPLICITY', icon: Sparkles,
    title: 'Web3 payments that actually make sense.',
    desc: 'No seed phrases in forms. No manual gas estimation. Connect your wallet, pick a feature, and go.',
    stat: '<1min', statLabel: 'TO START',
    href: '/app',
  },
];

const FAQS = [
  {
    q: 'What is a protected transfer?',
    a: 'A protected transfer locks your C2FLR in a smart contract on the Flare Testnet Coston2. The recipient can claim at any time. If they don\'t, you refund yourself — no third party holds the funds, only the contract.',
  },
  {
    q: 'Can I escrow ERC-20 tokens too?',
    a: 'Yes. On the Protected Transfer page, switch to ERC-20 Token mode, paste any token contract address, approve the contract to spend your tokens, then create the escrow. The recipient claims tokens directly from the contract.',
  },
  {
    q: 'How does a group payment work?',
    a: 'You create a group payment with a total amount and participant count, paying your share upfront. Others join using the Group ID. Once everyone has contributed, the full amount auto-releases. Anyone can withdraw their share anytime before the group completes.',
  },
  {
    q: 'What is a batch transfer?',
    a: 'A batch transfer lets you send different amounts to multiple addresses in one transaction. It\'s atomic — if any transfer fails, the entire batch reverts. Great for payroll, airdrops, or splitting bills.',
  },
  {
    q: 'How do payment links work?',
    a: 'Create a payment link with a description and optional fixed amount. Share the URL or QR code with anyone. When they pay, both parties can download a PDF invoice with the full receipt including transaction hash.',
  },
  {
    q: 'What is PayBot?',
    a: 'PayBot is an AI assistant built into the dashboard. You can ask it in plain English — "send 1 C2FLR to @alice as escrow" — and it will trigger the wallet confirmation popup instantly. It can also check your history, resolve usernames, and explain any feature.',
  },
  {
    q: 'What is the username registry?',
    a: 'You can register a unique on-chain username (3–30 characters). Others send to @yourname instead of your full address. It works across all FlarePay features and is fully on-chain — no off-chain indexer needed.',
  },
  {
    q: 'What token is used for gas?',
    a: 'All transactions use C2FLR, the native gas token of the Flare Testnet Coston2. You need a small amount of C2FLR in your wallet to pay for gas — grab some free from the Flare faucet.',
  },
  {
    q: 'Is FlarePay non-custodial?',
    a: 'Yes. FlarePay is a set of EVM smart contracts on Flare. No company or individual holds your funds. No admin key, no upgrade mechanism, no pause function. The contract code is open source and auditable by anyone.',
  },
  {
    q: 'Which wallets are supported?',
    a: 'FlarePay works with any EVM-compatible wallet: MetaMask, Rainbow, Coinbase Wallet, Trust Wallet, and more. Switch to the Flare Testnet Coston2 and connect.',
  },
  {
    q: 'How do I get test funds?',
    a: 'Click "Get Test Funds" in the dashboard sidebar, or visit the official Flare faucet directly. It sends free C2FLR to your wallet on the Coston2 testnet so you can try every feature at no cost.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '28px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--foreground)', lineHeight: 1.4, paddingRight: 32 }}>
          {q}
        </span>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: open ? 'var(--foreground)' : 'transparent',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.25s ease',
        }}>
          <ChevronDown
            size={16}
            color={open ? 'var(--background)' : 'var(--foreground-muted)'}
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </div>
      </button>
      {/* Smooth height animation using max-height trick */}
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '300px' : '0px',
        transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <p style={{ fontSize: 15, color: 'var(--foreground-muted)', lineHeight: 1.8, paddingBottom: 28, maxWidth: 760 }}>
          {a}
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main style={{ background: 'var(--background)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <ContainerScroll
        titleComponent={
          <div style={{ paddingTop: 0, paddingBottom: 0 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--primary)',
              textTransform: 'uppercase', marginBottom: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--primary)',
                display: 'inline-block',
              }} />
              Flare Testnet Coston2 · EVM Smart Contracts · C2FLR Gas
            </p>
            <h1 style={{ fontSize: 'clamp(44px, 7vw, 88px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-3px', marginBottom: 28 }}>
              <span style={{ color: 'var(--foreground)', display: 'block' }}>Protected Payments</span>
              <span className="text-gradient" style={{ display: 'block' }}>Built on Flare</span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--foreground-muted)', maxWidth: 520, margin: '0 auto 40px' }}>
              Trustless escrow, group crowdfunding, and batch transfers — secured by EVM smart contracts on the Flare Testnet Coston2. No intermediaries. No trust required.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <Link href="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Launch App <ArrowRight size={17} />
              </Link>
              <a href="https://faucet.flare.network/" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 999,
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--foreground-muted)', fontSize: 15, fontWeight: 600,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--foreground)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground)';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-elevated)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground-muted)';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                }}
              >
                Get Test Funds
              </a>
              <a href="https://x.com/flarepay_" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 999,
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--foreground-muted)', fontSize: 15, fontWeight: 600,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--foreground)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground)';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-elevated)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground-muted)';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                }}
              >
                <XLogo size={16} />
                Follow on X
              </a>
            </div>
          </div>
        }
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-elevated)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-card)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {['#FF5F57','#FFBD2E','#28C840'].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
            </div>
            <div style={{ flex: 1, background: 'var(--surface-elevated)', borderRadius: 6, padding: '4px 12px', fontSize: 11, color: 'var(--foreground-subtle)', border: '1px solid var(--border)', maxWidth: 280, margin: '0 auto', textAlign: 'center' }}>
              localhost:3000
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <img
              src="/hero-img-dark.png"
              alt="FlarePay app"
              className="hero-dark"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left' }}
            />
            <img
              src="/hero-img-light.png"
              alt="FlarePay app"
              className="hero-light"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left', position: 'absolute', top: 0, left: 0 }}
            />
          </div>
        </div>
      </ContainerScroll>

      {/* ── Powered by ───────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 0 72px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--foreground-subtle)', fontWeight: 400 }}>Powered by</span>
          <img src="/chain/flare.png" alt="Flare"
            style={{ height: 48, width: 'auto', objectFit: 'contain', display: 'block' }}
            onError={e => {
              const el = e.currentTarget as HTMLImageElement;
              el.style.display = 'none';
              const span = document.createElement('span');
              span.textContent = 'Flare';
              span.style.cssText = 'font-size:28px;font-weight:800;color:var(--foreground);letter-spacing:-1px';
              el.parentElement?.appendChild(span);
            }}
          />
        </div>
      </section>

      {/* ── Features — 3 per row ─────────────────────────────────────────── */}
      <section id="features" style={{ padding: '0 0 96px' }}>
        <div className="page-container">
          <div style={{ marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 16 }}>BUILT FOR EVERYONE</p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.1 }}>
              <span style={{ color: 'var(--foreground)' }}>Simplifying On-Chain</span><br />
              <span style={{ color: 'var(--foreground-muted)' }}>Payments for Everyone.</span>
            </h2>
          </div>

          {/* Strict 3-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>
            {FEATURES.map(({ num, tag, icon: Icon, title, desc, stat, statLabel, href }) => (
              <Link key={num} href={href} style={{ textDecoration: 'none' }}>
                <div
                  style={{ padding: '36px 28px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface-card)', transition: 'background 0.2s', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-elevated)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-card)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)' }}>{num}</span>
                    <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-subtle)', letterSpacing: 1 }}>{tag}</span>
                    <Icon size={13} color="var(--primary)" style={{ marginLeft: 'auto' }} />
                  </div>
                  <h3 style={{ fontSize: 'clamp(16px, 1.6vw, 20px)', fontWeight: 700, lineHeight: 1.3, color: 'var(--foreground)', letterSpacing: '-0.4px', marginBottom: 12, flex: 1 }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--foreground-muted)', lineHeight: 1.65, marginBottom: 24 }}>{desc}</p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8, background: 'var(--surface-elevated)', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-1px' }}>{stat}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground-subtle)', letterSpacing: 1 }}>{statLabel}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '0 0 96px', borderTop: '1px solid var(--border)' }}>
        <div className="page-container" style={{ paddingTop: 80 }}>
          <div style={{ marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 16 }}>HOW IT WORKS</p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.1 }}>
              <span style={{ color: 'var(--foreground)' }}>Up and running</span><br />
              <span style={{ color: 'var(--foreground-muted)' }}>in minutes.</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>
            {[
              { n: '01', title: 'Connect Wallet',    desc: 'Install MetaMask, Rainbow, or any EVM wallet. Connect to the Flare Testnet Coston2 in one click — the app will prompt you to add the chain.' },
              { n: '02', title: 'Register Username', desc: 'Claim a unique on-chain name. Others can send to @you instead of a long address.' },
              { n: '03', title: 'Send or Receive',   desc: 'Create an escrow, start a group payment, or batch-send to multiple addresses.' },
              { n: '04', title: 'Claim Funds',       desc: 'Recipients claim directly from the contract. Fully trustless. No middleman.' },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{ padding: '36px 28px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--foreground-subtle)', letterSpacing: '-2px', marginBottom: 20, fontFamily: 'monospace' }}>{n}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 10, letterSpacing: '-0.3px' }}>{title}</p>
                <p style={{ fontSize: 13, color: 'var(--foreground-muted)', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Editorial statement — below How it works ─────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border)' }}>
        <div className="page-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', padding: '80px 0' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
                Why builders choose FlarePay
              </p>
              <h2 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, letterSpacing: '-2.5px', lineHeight: 1.05 }}>
                <span style={{ color: 'var(--foreground)' }}>See where every C2FLR lands —</span>
                <br />
                <span style={{ color: 'var(--foreground-muted)' }}>before it leaves.</span>
              </h2>
            </div>
            <div>
              <p style={{ fontSize: 16, color: 'var(--foreground-muted)', lineHeight: 1.75, marginBottom: 32 }}>
                On-chain transparency, post-transfer certainty. Every escrow, group payment, and batch transfer is recorded on the Flare Testnet Coston2 — visible to anyone, controlled by no one.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Funds locked in smart contracts, not company wallets',
                  'Every transaction verifiable on-chain',
                  'Refund or claim at any time — no support tickets',
                  'Open source contracts, auditable by anyone',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 14, color: 'var(--foreground-muted)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: '0 0 96px', borderTop: '1px solid var(--border)' }}>
        <div className="page-container" style={{ paddingTop: 80 }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 20 }}>COMMON QUESTIONS</p>
            <h2 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, letterSpacing: '-2.5px', lineHeight: 1.05 }}>
              <span style={{ color: 'var(--foreground)' }}>Frequently Asked</span>
              <br />
              <span style={{ color: 'var(--foreground-muted)', fontStyle: 'italic' }}>Questions.</span>
            </h2>
          </div>
          <div>
            {FAQS.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 0' }}>
        <div className="page-container">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            {/* Left — brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/logo.png" alt="FlarePay" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', display: 'block' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>FlarePay</span>
              <span style={{ fontSize: 13, color: 'var(--foreground-subtle)', marginLeft: 4 }}>· EVM · Flare Testnet Coston2</span>
            </div>

            {/* Right — nav links + social icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {[
                { href: '/app',  label: 'Launch App' },
                { href: '#features', label: 'Features' },
                { href: '#faq',      label: 'FAQ'      },
              ].map(({ href, label }) => (
                <Link key={href} href={href} style={{ fontSize: 13, color: 'var(--foreground-subtle)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground-muted)'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground-subtle)'}
                >
                  {label}
                </Link>
              ))}

              {/* Divider */}
              <span style={{ width: 1, height: 16, background: 'var(--border)' }} />

              {/* X / Twitter */}
              <a href="https://x.com/flarepay_" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 8,
                  background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                  color: 'var(--foreground-muted)', textDecoration: 'none', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--foreground-muted)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground-muted)';
                }}
                title="Follow on X"
              >
                <XLogo size={15} />
              </a>

              {/* GitHub */}
              <a href="https://github.com/Spydiecy/FlarePay" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 8,
                  background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                  color: 'var(--foreground-muted)', textDecoration: 'none', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--foreground-muted)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground-muted)';
                }}
                title="View on GitHub"
              >
                <GithubLogo size={15} />
              </a>
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}

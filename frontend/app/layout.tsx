import type { Metadata } from 'next';
import './globals.css';
import Providers from './components/Providers';
import Navbar from './components/Navbar';
import SmoothScroll from './components/SmoothScroll';

export const metadata: Metadata = {
  title: 'ProtectedPay — Trustless Payments on X Layer',
  description: 'Protected transfers, group splits, and batch payments secured by EVM smart contracts on the X Layer Testnet.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <Providers>
          <Navbar />
          <SmoothScroll />
          {children}
        </Providers>
      </body>
    </html>
  );
}

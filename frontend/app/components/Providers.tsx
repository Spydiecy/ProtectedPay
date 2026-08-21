'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig, xLayerTestnet } from '../lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';
import { useEffect, useState } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10_000 },
  },
});

const rkDark = darkTheme({
  accentColor: '#2DD4BF',
  accentColorForeground: '#042F2E',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

const rkLight = lightTheme({
  accentColor: '#0D9488',
  accentColorForeground: '#ffffff',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

// Defers RainbowKit theme until after hydration so server/client CSS match.
function RainbowKitWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Before mount: always render with the default (dark) theme — same as SSR.
  // After mount: switch to the actual resolved theme.
  const theme = mounted && resolvedTheme === 'light' ? rkLight : rkDark;

  return (
    <RainbowKitProvider
      theme={theme}
      initialChain={xLayerTestnet.id}
      appInfo={{
        appName: 'ProtectedPay',
        learnMoreUrl: 'https://github.com/Spydiecy/ProtectedPay',
      }}
    >
      {children}
    </RainbowKitProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      themes={['dark', 'light']}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitWrapper>
            {children}
          </RainbowKitWrapper>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}

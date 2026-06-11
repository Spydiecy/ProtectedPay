import { createConfig, http } from 'wagmi';
import { injected, metaMask, coinbaseWallet, walletConnect } from 'wagmi/connectors';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet as coinbaseWalletRK,
  walletConnectWallet,
  injectedWallet,
  rainbowWallet,
  argentWallet,
  trustWallet,
  ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';
import type { Chain } from 'wagmi/chains';

// ── QIE Testnet chain definition ──────────────────────────────────────────────
export const qieTestnet = {
  id: 5656,
  name: 'QIE Testnet',
  nativeCurrency: {
    name: 'QIE',
    symbol: 'QIE',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc1testnet.qie.digital'] },
    public:  { http: ['https://rpc1testnet.qie.digital'] },
  },
  blockExplorers: {
    default: {
      name: 'QIE Testnet Explorer',
      url: 'https://testnet.qie.digital',
    },
  },
  testnet: true,
} as const satisfies Chain;

// ── Contract address ──────────────────────────────────────────────────────────
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xF93132d75c20EfeD556EC2Bc5aC777750665D3a9'
) as `0x${string}`;

// ── WalletConnect project ID ──────────────────────────────────────────────────
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '';

// ── RainbowKit connectors ─────────────────────────────────────────────────────
const connectors = WC_PROJECT_ID
  ? connectorsForWallets(
      [
        {
          groupName: 'Popular',
          wallets: [
            metaMaskWallet,
            rainbowWallet,
            coinbaseWalletRK,
            walletConnectWallet,
            trustWallet,
          ],
        },
        {
          groupName: 'More',
          wallets: [argentWallet, ledgerWallet, injectedWallet],
        },
      ],
      {
        appName: 'ProtectedPay',
        projectId: WC_PROJECT_ID,
      }
    )
  : [injected(), metaMask(), coinbaseWallet({ appName: 'ProtectedPay' })];

// ── Wagmi config ──────────────────────────────────────────────────────────────
export const wagmiConfig = createConfig({
  chains: [qieTestnet],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectors: connectors as any,
  transports: {
    [qieTestnet.id]: http('https://rpc1testnet.qie.digital'),
  },
  ssr: true,
});

// ── Helpers ───────────────────────────────────────────────────────────────────
export function formatNative(wei: bigint, decimals = 4): string {
  if (wei === 0n) return '0';
  const val = Number(wei) / 1e18;
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function toWei(amount: string): bigint {
  if (!amount || amount === '0') return 0n;
  const [whole, frac = ''] = amount.split('.');
  const fracPadded = frac.padEnd(18, '0').slice(0, 18);
  return BigInt(whole || '0') * BigInt(10 ** 18) + BigInt(fracPadded);
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export const EXPLORER_URL = 'https://testnet.qie.digital';

export function explorerTx(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddress(addr: string): string {
  return `${EXPLORER_URL}/address/${addr}`;
}

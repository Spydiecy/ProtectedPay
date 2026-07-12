import { createConfig, http } from 'wagmi';
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet as coinbaseWalletRK,
  walletConnectWallet,
  injectedWallet,
  rainbowWallet,
  trustWallet,
} from '@rainbow-me/rainbowkit/wallets';
import type { Chain } from 'wagmi/chains';

// ── HashKey Chain Mainnet ─────────────────────────────────────────────────────
export const hashkeyMainnet = {
  id: 177,
  name: 'HashKey Chain',
  nativeCurrency: {
    name: 'HSK',
    symbol: 'HSK',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://mainnet.hsk.xyz'] },
    public:  { http: ['https://mainnet.hsk.xyz'] },
  },
  blockExplorers: {
    default: {
      name: 'HashKey Explorer',
      url: 'https://hashkey.blockscout.com',
    },
  },
  testnet: false,
} as const satisfies Chain;

// ── HashKey Chain Testnet ─────────────────────────────────────────────────────
export const hashkeyTestnet = {
  id: 133,
  name: 'HashKey Chain Testnet',
  nativeCurrency: {
    name: 'HSK',
    symbol: 'HSK',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://testnet.hsk.xyz'] },
    public:  { http: ['https://testnet.hsk.xyz'] },
  },
  blockExplorers: {
    default: {
      name: 'HashKey Testnet Explorer',
      url: 'https://testnet-explorer.hsk.xyz',
    },
  },
  testnet: true,
} as const satisfies Chain;

// ── Contract addresses per network ───────────────────────────────────────────
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  [hashkeyTestnet.id]: (
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET || '0xF93132d75c20EfeD556EC2Bc5aC777750665D3a9'
  ) as `0x${string}`,
  [hashkeyMainnet.id]: (
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET || '0xCa36dD890F987EDcE1D6D7C74Fb9df627c216BF6'
  ) as `0x${string}`,
};

// Default contract address (falls back to testnet)
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || CONTRACT_ADDRESSES[hashkeyTestnet.id]
) as `0x${string}`;

export function getContractAddress(chainId: number): `0x${string}` {
  return CONTRACT_ADDRESSES[chainId] ?? CONTRACT_ADDRESSES[hashkeyTestnet.id];
}

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
          wallets: [injectedWallet],
        },
      ],
      {
        appName: 'HashKey Pay',
        projectId: WC_PROJECT_ID,
      }
    )
  : [injected(), metaMask(), coinbaseWallet({ appName: 'HashKey Pay' })];

// ── Wagmi config ──────────────────────────────────────────────────────────────
export const wagmiConfig = createConfig({
  chains: [hashkeyTestnet, hashkeyMainnet],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectors: connectors as any,
  transports: {
    [hashkeyTestnet.id]: http('https://testnet.hsk.xyz'),
    [hashkeyMainnet.id]: http('https://mainnet.hsk.xyz'),
  },
  ssr: true,
});

// ── Explorer URLs per chain ───────────────────────────────────────────────────
export const EXPLORER_URLS: Record<number, string> = {
  [hashkeyTestnet.id]: 'https://testnet-explorer.hsk.xyz',
  [hashkeyMainnet.id]: 'https://hashkey.blockscout.com',
};

export const EXPLORER_URL = EXPLORER_URLS[hashkeyTestnet.id];

export function getExplorerUrl(chainId: number): string {
  return EXPLORER_URLS[chainId] ?? EXPLORER_URLS[hashkeyTestnet.id];
}

export function explorerTx(hash: string, chainId?: number): string {
  const base = chainId ? getExplorerUrl(chainId) : EXPLORER_URL;
  return `${base}/tx/${hash}`;
}

export function explorerAddress(addr: string, chainId?: number): string {
  const base = chainId ? getExplorerUrl(chainId) : EXPLORER_URL;
  return `${base}/address/${addr}`;
}

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

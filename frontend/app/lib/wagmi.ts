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

// ── Flare Testnet Coston2 ─────────────────────────────────────────────────────
export const flareTestnet = {
  id: 114,
  name: 'Flare Testnet Coston2',
  nativeCurrency: {
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://coston2-api.flare.network/ext/C/rpc'] },
    public:  { http: ['https://coston2-api.flare.network/ext/C/rpc'] },
  },
  blockExplorers: {
    default: {
      name: 'Coston2 Explorer',
      url: 'https://coston2-explorer.flare.network',
    },
  },
  testnet: true,
} as const satisfies Chain;

// ── Contract address ──────────────────────────────────────────────────────────
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xCa36dD890F987EDcE1D6D7C74Fb9df627c216BF6'
) as `0x${string}`;

// Single-chain deployment — kept as a map for backward-compatible call sites.
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  [flareTestnet.id]: CONTRACT_ADDRESS,
};

export function getContractAddress(chainId?: number): `0x${string}` {
  return CONTRACT_ADDRESSES[chainId ?? flareTestnet.id] ?? CONTRACT_ADDRESS;
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
        appName: 'FlarePay',
        projectId: WC_PROJECT_ID,
      }
    )
  : [injected(), metaMask(), coinbaseWallet({ appName: 'FlarePay' })];

// ── Wagmi config ──────────────────────────────────────────────────────────────
export const wagmiConfig = createConfig({
  chains: [flareTestnet],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectors: connectors as any,
  transports: {
    [flareTestnet.id]: http('https://coston2-api.flare.network/ext/C/rpc'),
  },
  ssr: true,
});

// ── Explorer URLs ──────────────────────────────────────────────────────────────
export const EXPLORER_URL = flareTestnet.blockExplorers.default.url;

export const EXPLORER_URLS: Record<number, string> = {
  [flareTestnet.id]: EXPLORER_URL,
};

export function getExplorerUrl(chainId?: number): string {
  return EXPLORER_URLS[chainId ?? flareTestnet.id] ?? EXPLORER_URL;
}

export function explorerTx(hash: string, chainId?: number): string {
  const base = getExplorerUrl(chainId);
  return `${base}/tx/${hash}`;
}

export function explorerAddress(addr: string, chainId?: number): string {
  const base = getExplorerUrl(chainId);
  return `${base}/address/${addr}`;
}

// ── Faucet ─────────────────────────────────────────────────────────────────────
export const FAUCET_URL = 'https://faucet.flare.network/';

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

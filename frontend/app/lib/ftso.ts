/**
 * FTSOv2 live price feeds (Flare Testnet Coston2).
 *
 * FlarePay settles in C2FLR (native), FXRP and USDT0. This module reads the
 * matching FTSOv2 block-latency feeds so the UI can render a "≈ $X" USD
 * equivalent next to any amount.
 *
 * Block-latency feeds update roughly every 1.8s and are free to query, so we
 * read them with plain eth_call and poll on an interval.
 *
 * Purely additive — nothing here touches escrow / token / payment-link logic.
 */

import { createPublicClient, http, formatUnits } from 'viem';
import { flareTestnet } from './wagmi';

// ── Feed IDs ──────────────────────────────────────────────────────────────────
// category 01 (crypto) + hex-encoded feed name, zero-padded to 21 bytes.
export const FEED_IDS = {
  FLR_USD:  '0x01464c522f55534400000000000000000000000000',
  XRP_USD:  '0x015852502f55534400000000000000000000000000',
  USDT_USD: '0x01555344542f555344000000000000000000000000',
} as const;

export type FeedId = (typeof FEED_IDS)[keyof typeof FEED_IDS];

/** Which FTSOv2 feed prices each asset FlarePay supports. */
export const SYMBOL_FEED: Record<string, FeedId> = {
  // native gas token
  C2FLR: FEED_IDS.FLR_USD,
  FLR:   FEED_IDS.FLR_USD,
  // FXRP is a 1:1 FAsset representation of XRP
  FXRP:  FEED_IDS.XRP_USD,
  XRP:   FEED_IDS.XRP_USD,
  // USDT0 tracks USDT
  USDT0: FEED_IDS.USDT_USD,
  USDT:  FEED_IDS.USDT_USD,
};

/** Feeds we keep warm in the poller. */
export const TRACKED_FEEDS: FeedId[] = [
  FEED_IDS.FLR_USD,
  FEED_IDS.XRP_USD,
  FEED_IDS.USDT_USD,
];

// ── Contracts ─────────────────────────────────────────────────────────────────
// The registry lives at the same address on every Flare network and is the only
// trusted source for protocol contract addresses.
const FLARE_CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as const;

// Known Coston2 FtsoV2 address — used only as a fallback if the registry lookup fails.
const FTSOV2_FALLBACK = '0xC4e9c78EA53db782E28f28Fdf80BaF59336B304d' as const;

const REGISTRY_ABI = [
  {
    name: 'getContractAddressByName',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_name', type: 'string' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// getFeedById / getFeedsById are `payable` on FtsoV2Interface, but block-latency
// feeds are free, so they read cleanly over eth_call. Declared view locally.
const FTSOV2_ABI = [
  {
    name: 'getFeedById',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_feedId', type: 'bytes21' }],
    outputs: [
      { name: '_value', type: 'uint256' },
      { name: '_decimals', type: 'int8' },
      { name: '_timestamp', type: 'uint64' },
    ],
  },
  {
    name: 'getFeedsById',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_feedIds', type: 'bytes21[]' }],
    outputs: [
      { name: '_values', type: 'uint256[]' },
      { name: '_decimals', type: 'int8[]' },
      { name: '_timestamp', type: 'uint64' },
    ],
  },
] as const;

const readClient = createPublicClient({
  chain: flareTestnet,
  transport: http('https://coston2-api.flare.network/ext/C/rpc'),
});

let ftsoV2Address: `0x${string}` | null = null;

async function resolveFtsoV2(): Promise<`0x${string}`> {
  if (ftsoV2Address) return ftsoV2Address;
  try {
    const addr = await readClient.readContract({
      address: FLARE_CONTRACT_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: 'getContractAddressByName',
      args: ['FtsoV2'],
    }) as `0x${string}`;
    if (addr && addr !== '0x0000000000000000000000000000000000000000') {
      ftsoV2Address = addr;
      return addr;
    }
  } catch { /* fall through to the known address */ }
  ftsoV2Address = FTSOV2_FALLBACK;
  return FTSOV2_FALLBACK;
}

export interface FeedPrice {
  /** USD price as a plain number, e.g. 2.1043 */
  price: number;
  /** Unix seconds of the last feed update */
  timestamp: number;
}

/** Read a single feed. Returns null if the feed is unavailable. */
export async function fetchFeed(feedId: FeedId): Promise<FeedPrice | null> {
  try {
    const ftso = await resolveFtsoV2();
    const [value, decimals, timestamp] = await readClient.readContract({
      address: ftso,
      abi: FTSOV2_ABI,
      functionName: 'getFeedById',
      args: [feedId as `0x${string}`],
    }) as [bigint, number, bigint];

    const dec = Number(decimals);
    const price = dec >= 0
      ? Number(formatUnits(value, dec))
      : Number(value) * 10 ** Math.abs(dec);

    if (!Number.isFinite(price)) return null;
    return { price, timestamp: Number(timestamp) };
  } catch {
    return null;
  }
}

/**
 * Read several feeds. Each feed is fetched independently so one unavailable
 * feed never blanks out the others.
 */
export async function fetchFeeds(feedIds: FeedId[]): Promise<Record<string, FeedPrice>> {
  const results = await Promise.allSettled(feedIds.map(id => fetchFeed(id)));
  const out: Record<string, FeedPrice> = {};
  results.forEach((res, i) => {
    if (res.status === 'fulfilled' && res.value) out[feedIds[i]] = res.value;
  });
  return out;
}

/** Format a USD number for display next to an amount. */
export function formatUsd(usd: number): string {
  if (!Number.isFinite(usd)) return '—';
  if (usd === 0) return '$0.00';
  if (usd > 0 && usd < 0.01) return '<$0.01';
  return `$${usd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: usd < 1 ? 4 : 2,
  })}`;
}

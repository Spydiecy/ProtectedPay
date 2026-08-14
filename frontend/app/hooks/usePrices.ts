'use client';

/**
 * usePrices — shared FTSOv2 price store.
 *
 * A single module-level poller keeps the tracked feeds warm and every component
 * that renders a "≈ $X" label subscribes to it, so 20 labels on screen still
 * cost exactly one round of RPC reads.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  fetchFeeds, formatUsd, SYMBOL_FEED, TRACKED_FEEDS,
  type FeedPrice, type FeedId,
} from '../lib/ftso';

const REFRESH_MS = 30_000;

type Store = Record<string, FeedPrice>;

let store: Store = {};
let loading = false;
let started = false;
let timer: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<(s: Store) => void>();

function emit() {
  subscribers.forEach(fn => fn(store));
}

async function refreshNow() {
  loading = true;
  emit();
  const next = await fetchFeeds(TRACKED_FEEDS as FeedId[]);
  // Merge rather than replace so a transient failure keeps the last good price.
  store = { ...store, ...next };
  loading = false;
  emit();
}

function start() {
  if (started) return;
  started = true;
  refreshNow();
  timer = setInterval(refreshNow, REFRESH_MS);
}

function stopIfIdle() {
  if (subscribers.size > 0) return;
  if (timer) { clearInterval(timer); timer = null; }
  started = false;
}

export function usePrices() {
  const [prices, setPrices] = useState<Store>(store);
  const [isLoading, setIsLoading] = useState<boolean>(loading);

  useEffect(() => {
    const onChange = (s: Store) => { setPrices({ ...s }); setIsLoading(loading); };
    subscribers.add(onChange);
    start();
    // Seed immediately with whatever is already cached.
    onChange(store);
    return () => { subscribers.delete(onChange); stopIfIdle(); };
  }, []);

  /** Live USD price for an asset symbol, or null if that feed isn't available. */
  const priceFor = useCallback((symbol?: string | null): number | null => {
    if (!symbol) return null;
    const feedId = SYMBOL_FEED[symbol.toUpperCase()];
    if (!feedId) return null;
    return prices[feedId]?.price ?? null;
  }, [prices]);

  /** USD value of `amount` units of `symbol`, or null if unpriceable. */
  const usdFor = useCallback((symbol?: string | null, amount?: number | string | null): number | null => {
    const price = priceFor(symbol);
    if (price == null) return null;
    const amt = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (amt == null || !Number.isFinite(amt)) return null;
    return amt * price;
  }, [priceFor]);

  /** Preformatted "$1,234.56" string, or null. */
  const usdLabel = useCallback((symbol?: string | null, amount?: number | string | null): string | null => {
    const usd = usdFor(symbol, amount);
    return usd == null ? null : formatUsd(usd);
  }, [usdFor]);

  /** Timestamp of the newest feed update we hold, in unix seconds. */
  const lastUpdated = Object.values(prices).reduce(
    (max, p) => (p.timestamp > max ? p.timestamp : max), 0,
  );

  return {
    prices,
    loading: isLoading,
    priceFor,
    usdFor,
    usdLabel,
    lastUpdated,
    refresh: refreshNow,
    /** True when at least one feed has loaded. */
    ready: Object.keys(prices).length > 0,
  };
}

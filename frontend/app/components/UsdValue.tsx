'use client';

/**
 * UsdValue — renders "≈ $X" next to a token amount, priced live from FTSOv2.
 *
 * Renders nothing at all when the asset has no feed or the feed hasn't loaded,
 * so it can be dropped in anywhere without risking a broken-looking label.
 */

import { usePrices } from '../hooks/usePrices';

interface UsdValueProps {
  /** Asset symbol — C2FLR, FXRP, USDT0 … */
  symbol?: string | null;
  /** Human-readable amount (not base units). */
  amount?: number | string | null;
  size?: number;
  /** Show a small "FTSOv2" provenance tag after the value. */
  showSource?: boolean;
  style?: React.CSSProperties;
}

export default function UsdValue({
  symbol, amount, size = 11, showSource = false, style,
}: UsdValueProps) {
  const { usdLabel } = usePrices();
  const label = usdLabel(symbol, amount);
  if (!label) return null;

  return (
    <span
      title={`Live ${symbol?.toUpperCase()} price via Flare FTSOv2`}
      style={{
        fontSize: size,
        color: 'var(--foreground-subtle)',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      ≈ {label}
      {showSource && (
        <span style={{ marginLeft: 5, fontSize: size - 2, opacity: 0.7 }}>FTSOv2</span>
      )}
    </span>
  );
}

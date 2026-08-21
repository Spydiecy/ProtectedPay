/**
 * Preset ERC-20 tokens available on the X Layer Testnet.
 *
 * Single source of truth for known token metadata (symbol, decimals, logo) so
 * every page — Protected Transfer, History, Dashboard — renders the same
 * logo and decimals for USDT / USDC / USDG instead of falling back to a
 * generic coin icon or assuming 18 decimals.
 */

export interface PresetToken {
  symbol: string;
  label: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  logo: string;
}

export const PRESET_TOKENS: PresetToken[] = [
  { symbol: 'USDT', label: 'USDT', name: 'Tether USD',   address: '0x9e29b3AaDa05Bf2D2c827Af80Bd28Dc0b9b4FB0c', decimals: 6, logo: '/token/usdt.png' },
  { symbol: 'USDC', label: 'USDC', name: 'USD Coin',      address: '0xcB8BF24c6cE16Ad21D707c9505421a17f2bec79D', decimals: 6, logo: '/token/usdc.png' },
  { symbol: 'USDG', label: 'USDG', name: 'Global Dollar', address: '0xA78E2baaBaf5c4f36b7Fc394725Deb68D332EeC1', decimals: 6, logo: '/token/usdg.png' },
];

/** Lookup a preset token by its contract address (case-insensitive). */
export function getKnownToken(address?: string | null): PresetToken | undefined {
  if (!address) return undefined;
  const lower = address.toLowerCase();
  return PRESET_TOKENS.find(p => p.address.toLowerCase() === lower);
}

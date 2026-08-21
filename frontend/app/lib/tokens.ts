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
  { symbol: 'USDT', label: 'USDT', name: 'Tether USD',   address: '0x9E29b3AAdA05BF2D2c827aF80bd28dc0b9B4Fb0c', decimals: 6, logo: '/token/usdt.png' },
  { symbol: 'USDC', label: 'USDC', name: 'USD Coin',      address: '0xCB8bF24c6cE16aD21d707C9505421A17F2Bec79D', decimals: 6, logo: '/token/usdc.png' },
  { symbol: 'USDG', label: 'USDG', name: 'Global Dollar', address: '0xA78E2bAABAf5c4F36B7fC394725DEb68d332Eec1', decimals: 6, logo: '/token/usdg.png' },
];

/** Lookup a preset token by its contract address (case-insensitive). */
export function getKnownToken(address?: string | null): PresetToken | undefined {
  if (!address) return undefined;
  const lower = address.toLowerCase();
  return PRESET_TOKENS.find(p => p.address.toLowerCase() === lower);
}

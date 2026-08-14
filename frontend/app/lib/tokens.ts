/**
 * Preset ERC-20 tokens available on the Flare Testnet Coston2.
 *
 * Single source of truth for known token metadata (symbol, decimals, logo) so
 * every page — Protected Transfer, History, Dashboard — renders the same
 * logo and decimals for FXRP / USDT0 instead of falling back to a generic
 * coin icon or assuming 18 decimals.
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
  { symbol: 'FXRP',  label: 'FXRP',  name: 'FXRP',  address: '0x0b6A3645c240605887a5532109323A3E12273dc7', decimals: 6, logo: '/token/fxrp.png'  },
  { symbol: 'USDT0', label: 'USDT0', name: 'USDT0', address: '0xC1A5B41512496B80903D1f32d6dEa3a73212E71F', decimals: 6, logo: '/token/usdt0.png' },
];

/** Lookup a preset token by its contract address (case-insensitive). */
export function getKnownToken(address?: string | null): PresetToken | undefined {
  if (!address) return undefined;
  const lower = address.toLowerCase();
  return PRESET_TOKENS.find(p => p.address.toLowerCase() === lower);
}

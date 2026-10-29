import {
  hashSynthesisToken,
  newSynthesisToken,
  SYNTHESIS_TOKEN_PATTERN,
} from '@/features/seller-synthesis/services/synthesis-token';

// Mission 127 — le lien du Point marché : même jeton que la synthèse (43 caractères, seul le
// condensat est gardé), sous « /point-marche/ ».
export const MARKET_UPDATE_TOKEN_PATTERN = SYNTHESIS_TOKEN_PATTERN;
export const newMarketUpdateToken = newSynthesisToken;
export const hashMarketUpdateToken = hashSynthesisToken;
export const marketUpdatePath = (token: string): string => `/point-marche/${token}`;

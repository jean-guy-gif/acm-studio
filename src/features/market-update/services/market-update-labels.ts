import type { MarketUpdateSummary } from '@/features/market-update/services/market-update-summary';

// Mission 128 B — les états d'un concurrent au Point marché et ce que le Suivi en dit, sans zod :
// la relecture du résumé reste au serveur (`market-update-summary.ts`). Pur.

export const MARKET_UPDATE_STATES = [
  'unchanged',
  'dropped',
  'raised',
  'unread',
  'probable_sale',
  'withdrawn',
  // Disparue (sur preuve, M103) sans durée de commercialisation connue : la règle ne conclut rien.
  'gone',
  // Mission 127 B — retenu après le rendez-vous : pas de prix du rendez-vous, la ligne 3 seulement.
  'newcomer',
] as const;
export type MarketUpdateState = (typeof MARKET_UPDATE_STATES)[number];

export const MARKET_UPDATE_STATE_LABELS: Record<MarketUpdateState, string> = {
  unchanged: 'Inchangé',
  dropped: 'Baisse',
  raised: 'Hausse',
  unread: 'Non relu',
  probable_sale: 'Vente probable',
  withdrawn: 'Probablement retiré sans vente',
  gone: 'Retirée',
  newcomer: 'Nouveau venu',
};

// « Ont baissé depuis le rendez-vous : 2 sur 5 » — sur le prix du rendez-vous.
export function droppedSinceMeetingLabel(summary: MarketUpdateSummary): string | null {
  const compared = summary.competitors.filter(
    (item) => !item.newcomer && item.meetingPrice != null && item.meetingPriceSource !== 'current',
  ).length;
  if (compared === 0) return null;
  return `Ont baissé depuis le rendez-vous : ${summary.counts.dropped} sur ${compared}`;
}

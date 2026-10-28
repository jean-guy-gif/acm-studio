import type { BuyerProspectCard } from '@/features/buyer-prospecting/types';
import type { ProspectingCard } from '@/features/prospecting/types';

// Mission 120 — une carte née d'une recherche acquéreur, sous la forme d'une carte de
// Prospection : une seule copie, aucun dossier vendeur. Pur.
export function buyerProspectingCard(card: BuyerProspectCard): ProspectingCard {
  const seller = { projectId: '', name: '', label: null, advisorId: null };
  return { row: card.row, seller, sellers: [], copies: [{ row: card.row, seller }] };
}

// Le filtre « Origine » de la page Prospection : les cartes des dossiers vendeurs, celles des
// recherches acquéreur (une carte de concurrent visée par une recherche est des deux), ou tout.
export const PROSPECTING_ORIGINS = ['all', 'seller', 'buyer'] as const;
export type ProspectingOrigin = (typeof PROSPECTING_ORIGINS)[number];

export const PROSPECTING_ORIGIN_LABELS: Record<ProspectingOrigin, string> = {
  all: 'Toutes les origines',
  seller: 'Dossiers vendeurs',
  buyer: 'Recherches acquéreur',
};

// « ?origine=vendeur » / « ?origine=acquereur » : un filtre inconnu retombe sur « tout ».
const ORIGIN_PARAMS: Record<string, ProspectingOrigin> = { vendeur: 'seller', acquereur: 'buyer' };

export function parseProspectingOrigin(raw: string | undefined): ProspectingOrigin {
  return ORIGIN_PARAMS[raw ?? ''] ?? 'all';
}

export function originParam(origin: ProspectingOrigin): string | null {
  return origin === 'seller' ? 'vendeur' : origin === 'buyer' ? 'acquereur' : null;
}

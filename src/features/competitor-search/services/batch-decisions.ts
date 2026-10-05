import type { BatchDecision } from '@/features/competitor-search/actions/record-competitor-decisions';
import type { RankedCandidate } from '@/features/competitor-search/types';

// Ce que l'apprentissage reçoit d'une validation en lot : les annonces IMPORTÉES, comme retenues.
// Rien d'autre. Une annonce affichée mais non cochée, ou restée derrière « Voir les N autres »,
// n'est enregistrée ni comme retenue ni comme écartée : le conseiller ne l'a pas jugée. Seul
// « Écarter avec un motif » enregistre un refus (décision explicite, avec son motif).
export function decisionOf(
  entry: RankedCandidate,
  decision: 'accepted' | 'rejected',
): BatchDecision {
  return {
    url: entry.candidate.url,
    decision,
    price: entry.candidate.price,
    surfaceArea: entry.candidate.surfaceArea,
    roomsCount: entry.candidate.roomsCount,
    city: entry.candidate.city,
    propertyType: entry.candidate.propertyType,
  };
}

export function batchDecisions(imported: RankedCandidate[]): BatchDecision[] {
  return imported.map((entry) => decisionOf(entry, 'accepted'));
}

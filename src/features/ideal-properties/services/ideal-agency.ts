import type { BuyerCandidate } from '@/features/meeting-conclusion/services/buyer-reconciliation';

// Mission 145 (partie A) — « Ce que l'agence a déjà », dans les biens idéaux : seul un bien sous
// mandat signé, sans offre acceptée, se propose à un acquéreur (décision de Jean-Guy, 07/11) ; un
// vendeur à relancer n'y entre plus. Les concurrents à prospecter restent : le courrier au
// propriétaire ou le dossier au confrère (M120) vient avant toute visite. Le rapprochement (M86),
// recherche du conseiller, garde ses trois groupes. Pur.
export function idealAgencyCandidates(
  candidates: readonly BuyerCandidate[],
  underOffer: ReadonlySet<string>,
): BuyerCandidate[] {
  return candidates.filter(
    (candidate) =>
      candidate.group === 'competitor' ||
      (candidate.group === 'mandate' && !underOffer.has(candidate.projectId)),
  );
}

export const NOT_PROPOSABLE =
  'Ce bien ne se propose pas : seul un mandat signé, sans offre acceptée, se propose à un acquéreur.';

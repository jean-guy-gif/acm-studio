import type { PortalSearchResult, RankedCandidate } from '@/features/competitor-search/types';

// MISSION 71 §1 — « Retenir et importer les N cochés » est visible dès qu'au moins un candidat est
// affiché : dans la liste classée, OU dans le bloc d'un portail (Stream Estate compris). Avant, le
// bouton ne vivait que dans la liste classée : quand le classement écartait tout (un bien vendeur
// écrit « St Laurent du Var » contre des biens « Saint-Laurent-du-Var »), les cartes restaient
// affichées dans le bloc Stream Estate et le bouton disparaissait. Sans case cochée, il reste
// visible mais désactivé.
export function showBatchImport(
  undecided: RankedCandidate[],
  portals: PortalSearchResult[] | null,
): boolean {
  return (
    undecided.length > 0 ||
    (portals ?? []).some((portal) => portal.status === 'ok' && portal.candidates.length > 0)
  );
}

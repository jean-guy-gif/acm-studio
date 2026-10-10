import 'server-only';

import { getProspectingRows } from '@/features/competitor-locator/queries/get-prospecting-rows';
import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import type { ProspectingEntry, ProspectingSeller } from '@/features/prospecting/types';
import { propertyLabel } from '@/features/projects/services/property-label';

export type AgencyProspecting = {
  // Les mandats signés de l'agence, dans l'ordre du Suivi.
  sellers: ProspectingSeller[];
  // Tous leurs concurrents à prospecter, chacun avec son bien vendeur.
  entries: ProspectingEntry[];
};

// Mission 86 — la page Prospection : les concurrents à prospecter de TOUS les mandats signés de
// l'agence. Aucun calcul en double : chaque mandat passe par getProspectingRows (M75), cadré sur
// l'agence de l'appelant. Le Suivi est déjà chargé par la page : on le reçoit, on ne le relit pas.
export async function getAgencyProspecting(dossiers: SuiviDossier[]): Promise<AgencyProspecting> {
  const signed = dossiers.filter((dossier) => dossier.conclusion?.outcome === 'signed');
  const sellers: ProspectingSeller[] = signed.map((dossier) => ({
    projectId: dossier.project.id,
    name: dossier.project.seller_name ?? 'Dossier vendeur',
    label: propertyLabel(dossier.property),
  }));
  const rowsBySeller = await Promise.all(
    sellers.map((seller) => getProspectingRows(seller.projectId)),
  );
  const entries = sellers.flatMap((seller, index) =>
    rowsBySeller[index].map((row) => ({ row, seller })),
  );
  return { sellers, entries };
}

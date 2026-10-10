import {
  PROSPECTING_TARGETS,
  type ProspectingEntry,
  type ProspectingTarget,
} from '@/features/prospecting/types';

// Mission 86 — les deux filtres de la page Prospection, purs. Un filtre inconnu (adresse
// retouchée à la main, mandat qui n'est plus signé) retombe sur « tout » : rien n'est masqué
// sans que l'écran le dise.

export function parseProspectingTarget(raw: string | undefined): ProspectingTarget {
  return (PROSPECTING_TARGETS as readonly string[]).includes(raw ?? '')
    ? (raw as ProspectingTarget)
    : 'all';
}

export function parseSellerFilter(
  raw: string | undefined,
  sellers: { projectId: string }[],
): string | null {
  return raw && sellers.some((seller) => seller.projectId === raw) ? raw : null;
}

// Un concurrent « à vérifier » (ACM ne sait pas à qui s'adresser) reste dans les deux listes :
// l'écarter d'office reviendrait à décider à la place du conseiller.
export function filterProspecting(
  entries: ProspectingEntry[],
  sellerId: string | null,
  target: ProspectingTarget,
): ProspectingEntry[] {
  return entries.filter((entry) => {
    if (sellerId != null && entry.seller.projectId !== sellerId) {
      return false;
    }
    if (target === 'colleagues') {
      return entry.row.step !== 'owner';
    }
    if (target === 'owners') {
      return entry.row.step !== 'colleague';
    }
    return true;
  });
}

export function prospectionHref(sellerId: string | null, target: ProspectingTarget): string {
  const params = new URLSearchParams();
  if (sellerId != null) {
    params.set('bien', sellerId);
  }
  if (target !== 'all') {
    params.set('cible', target);
  }
  const query = params.toString();
  return query === '' ? '/prospection' : `/prospection?${query}`;
}

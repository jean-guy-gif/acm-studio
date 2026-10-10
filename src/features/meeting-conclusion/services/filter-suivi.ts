import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';

// Mission 86 — le Suivi se lit en TROIS groupes : mandats signés, à relancer, et « vendus
// ailleurs · retirés » réunis (pour le conseiller, c'est le même geste : plus rien à faire
// aujourd'hui). L'issue elle-même reste distincte en base et sur le badge (M54).
export type SuiviGroup = 'signed' | 'follow_up' | 'lost';

export const SUIVI_GROUPS: SuiviGroup[] = ['signed', 'follow_up', 'lost'];

export const SUIVI_GROUP_LABELS: Record<SuiviGroup, string> = {
  signed: 'Mandats signés',
  follow_up: 'À relancer',
  lost: 'Vendus ailleurs · retirés',
};

export function suiviGroup(outcome: ConclusionOutcome | null | undefined): SuiviGroup | null {
  if (outcome === 'signed' || outcome === 'follow_up') {
    return outcome;
  }
  if (outcome === 'sold_elsewhere' || outcome === 'withdrawn') {
    return 'lost';
  }
  return null;
}

// Le filtre de l'adresse. Les anciens liens par issue (« ?issue=withdrawn ») mènent à leur groupe.
export function parseSuiviGroup(raw: string | undefined): SuiviGroup | null {
  if ((SUIVI_GROUPS as string[]).includes(raw ?? '')) {
    return raw as SuiviGroup;
  }
  return raw === 'sold_elsewhere' || raw === 'withdrawn' ? 'lost' : null;
}

// Mission 54 §2 — le filtre, PUR. `null` = « Tous » (aucun dossier masqué) : aucun dossier
// n'est caché sans que le filtre le dise.
export function filterSuiviByGroup(
  dossiers: SuiviDossier[],
  group: SuiviGroup | null,
): SuiviDossier[] {
  if (group == null) {
    return dossiers;
  }
  return dossiers.filter((dossier) => suiviGroup(dossier.conclusion?.outcome) === group);
}

export function suiviCounts(dossiers: SuiviDossier[]): Record<SuiviGroup, number> {
  const counts: Record<SuiviGroup, number> = { signed: 0, follow_up: 0, lost: 0 };
  for (const dossier of dossiers) {
    const group = suiviGroup(dossier.conclusion?.outcome);
    if (group != null) {
      counts[group] += 1;
    }
  }
  return counts;
}

// « Écart moyen : prix du vendeur → prix de commercialisation », en %, sur les MANDATS SIGNÉS
// dont les deux prix sont connus. Moyenne des écarts de chaque dossier (un gros bien ne pèse
// pas plus qu'un petit). Null s'il n'y a rien à moyenner : le compteur ne s'affiche pas.
export function averageJourneyGap(dossiers: SuiviDossier[]): number | null {
  const gaps: number[] = [];
  for (const dossier of dossiers) {
    const conclusion = dossier.conclusion;
    if (conclusion?.outcome !== 'signed') {
      continue;
    }
    const start = conclusion.sellerPerceivedPrice;
    const end = conclusion.commercializationPrice;
    if (start == null || end == null || start === 0) {
      continue;
    }
    gaps.push(((end - start) / start) * 100);
  }
  if (gaps.length === 0) {
    return null;
  }
  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
}

// « Ce qui le retient » d'un vendeur à relancer : ce qu'il a dit lui manquer pour être à 10
// (M85), sinon le motif noté par le conseiller à la conclusion.
export function whatHoldsBack(
  conclusion: { launchReadinessMissing: string | null; followUpReason: string | null } | null,
): string | null {
  return conclusion?.launchReadinessMissing?.trim() || conclusion?.followUpReason?.trim() || null;
}

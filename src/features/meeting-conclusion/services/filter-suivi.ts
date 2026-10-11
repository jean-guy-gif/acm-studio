import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  isFollowUpMotive,
  type ConclusionOutcome,
  type FollowUpMotive,
} from '@/features/meeting-conclusion/types';

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

// Mission 90 — « Mandats signés : 6, dont 4 exclusifs ». Seuls les mandats dont le type est
// renseigné comptent : un mandat signé avant la mission, sans type, n'est pas réputé simple.
export function exclusiveSignedCount(dossiers: SuiviDossier[]): number {
  return dossiers.filter(
    (dossier) =>
      dossier.conclusion?.outcome === 'signed' && dossier.conclusion.mandateType === 'exclusive',
  ).length;
}

// « dont 1 exclusif », « dont 4 exclusifs », « dont aucun exclusif ».
export function exclusiveLabel(count: number): string {
  if (count === 0) {
    return 'dont aucun exclusif';
  }
  return `dont ${count} exclusif${count > 1 ? 's' : ''}`;
}

const concludedTime = (dossier: SuiviDossier): number => {
  const time = new Date(dossier.conclusion?.concludedAt ?? dossier.project.updated_at).getTime();
  return Number.isNaN(time) ? 0 : time;
};

// Mission 96 — les vendeurs « à relancer » se lisent du plus ANCIEN contact au plus récent :
// celui qu'on n'a pas contacté depuis le plus longtemps d'abord. Le dernier contact est la
// relance la plus récente, sinon la conclusion du rendez-vous (seule connue avant la mission).
// Les autres dossiers gardent leur ordre et leur place ; seuls les « à relancer » sont
// réordonnés entre eux (remplace M90, « du plus ancien rendez-vous au plus récent »).
export function sortSuivi(
  dossiers: SuiviDossier[],
  lastContactByProject: ReadonlyMap<string, string | null> = new Map(),
): SuiviDossier[] {
  const contactTime = (dossier: SuiviDossier): number => {
    const last = lastContactByProject.get(dossier.project.id);
    const time = last ? new Date(last).getTime() : Number.NaN;
    return Number.isNaN(time) ? concludedTime(dossier) : time;
  };
  const followUps = dossiers
    .filter((dossier) => dossier.conclusion?.outcome === 'follow_up')
    .sort((a, b) => contactTime(a) - contactTime(b));
  let next = 0;
  return dossiers.map((dossier) =>
    dossier.conclusion?.outcome === 'follow_up' ? followUps[next++] : dossier,
  );
}

// Mission 96 — le filtre par motif de relance. Il ne porte que sur les « à relancer » : un motif
// choisi ne montre qu'eux, et l'écran le dit (pastille active). `null` = pas de filtre.
export function parseFollowUpMotive(raw: string | undefined): FollowUpMotive | null {
  return isFollowUpMotive(raw) ? raw : null;
}

export function filterSuiviByMotive(
  dossiers: SuiviDossier[],
  motive: FollowUpMotive | null,
): SuiviDossier[] {
  if (motive == null) {
    return dossiers;
  }
  return dossiers.filter(
    (dossier) =>
      dossier.conclusion?.outcome === 'follow_up' && dossier.conclusion.followUpMotive === motive,
  );
}

// Les motifs réellement portés par des dossiers « à relancer », avec leur nombre : seuls
// ceux-là sont proposés au filtre.
export function followUpMotiveCounts(dossiers: SuiviDossier[]): Map<FollowUpMotive, number> {
  const counts = new Map<FollowUpMotive, number>();
  for (const dossier of dossiers) {
    const motive =
      dossier.conclusion?.outcome === 'follow_up' ? dossier.conclusion.followUpMotive : null;
    if (motive != null) {
      counts.set(motive, (counts.get(motive) ?? 0) + 1);
    }
  }
  return counts;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Le nombre de jours pleins écoulés depuis une date ; null sans date lisible.
export function daysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) {
    return null;
  }
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) {
    return null;
  }
  return Math.max(0, Math.floor((now.getTime() - time) / DAY_MS));
}

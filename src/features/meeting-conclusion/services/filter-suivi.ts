import {
  mandateOfferOf,
  type MandateOfferAnswer,
} from '@/features/mandate-life/services/mandate-offer';
import { mandateStage } from '@/features/mandate-life/services/mandate-stage';
import { NO_MANDATE_LIFE, type MandateStage } from '@/features/mandate-life/types';
import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  isFollowUpMotive,
  type ConclusionOutcome,
  type FollowUpMotive,
} from '@/features/meeting-conclusion/types';

// Mission 86 — le Suivi se lit en groupes : mandats signés, à relancer, et « vendus ailleurs ·
// retirés » réunis (pour le conseiller, c'est le même geste : plus rien à faire aujourd'hui).
// L'issue elle-même reste distincte en base et sur le badge (M54).
// Lot C (maquette C0, validée le 28/11) — un mandat signé suit sa vie : « Sous offre · compromis »
// (offre acceptée ou compromis), « Vendus par l'agence », et le mandat terminé sans vente rejoint
// « Vendus ailleurs · retirés · terminés » ; « Mandats signés » ne garde que les mandats sans offre
// acceptée. L'étape vient des faits du mandat et des offres (`dossierStages`) ; inconnue, le
// mandat reste sous « Mandats signés ».
export type SuiviGroup = 'signed' | 'under_offer' | 'sold' | 'follow_up' | 'lost';

export const SUIVI_GROUPS: SuiviGroup[] = ['signed', 'under_offer', 'sold', 'follow_up', 'lost'];

export const SUIVI_GROUP_LABELS: Record<SuiviGroup, string> = {
  signed: 'Mandats signés',
  under_offer: 'Sous offre · compromis',
  sold: 'Vendus par l’agence',
  follow_up: 'À relancer',
  lost: 'Vendus ailleurs · retirés · terminés',
};

export type SuiviStage = MandateStage | 'unknown' | null | undefined;
export type SuiviStages = ReadonlyMap<string, SuiviStage>;

export function suiviGroup(
  outcome: ConclusionOutcome | null | undefined,
  stage?: SuiviStage,
): SuiviGroup | null {
  if (outcome === 'signed') {
    if (stage === 'offer_accepted' || stage === 'under_compromise') return 'under_offer';
    if (stage === 'sold') return 'sold';
    if (stage === 'ended') return 'lost';
    return 'signed';
  }
  if (outcome === 'follow_up') {
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

const groupOf = (dossier: SuiviDossier, stages?: SuiviStages) =>
  suiviGroup(dossier.conclusion?.outcome, stages?.get(dossier.project.id));

// Mission 54 §2 — le filtre, PUR. `null` = « Tous » (aucun dossier masqué) : aucun dossier
// n'est caché sans que le filtre le dise.
export function filterSuiviByGroup(
  dossiers: SuiviDossier[],
  group: SuiviGroup | null,
  stages?: SuiviStages,
): SuiviDossier[] {
  if (group == null) {
    return dossiers;
  }
  return dossiers.filter((dossier) => groupOf(dossier, stages) === group);
}

export function suiviCounts(
  dossiers: SuiviDossier[],
  stages?: SuiviStages,
): Record<SuiviGroup, number> {
  const counts: Record<SuiviGroup, number> = {
    signed: 0,
    under_offer: 0,
    sold: 0,
    follow_up: 0,
    lost: 0,
  };
  for (const dossier of dossiers) {
    const group = groupOf(dossier, stages);
    if (group != null) {
      counts[group] += 1;
    }
  }
  return counts;
}

// Lot C — l'étape de chaque mandat signé, lue dans ses faits et dans les offres de l'agence
// (illisibles : « unknown », jamais « Mandat signé » de travers, M98).
export function dossierStages(
  dossiers: SuiviDossier[],
  offers: readonly MandateOfferAnswer[] | null,
): Map<string, SuiviStage> {
  const stages = new Map<string, SuiviStage>();
  for (const dossier of dossiers) {
    if (dossier.conclusion?.outcome !== 'signed') continue;
    stages.set(
      dossier.project.id,
      mandateStage({
        outcome: 'signed',
        life: dossier.conclusion.life ?? NO_MANDATE_LIFE,
        offer: mandateOfferOf(offers, dossier.project.id),
      }),
    );
  }
  return stages;
}

// « Écart moyen : prix du vendeur → prix de commercialisation », en %, sur les MANDATS SIGNÉS
// dont les deux prix sont connus. Moyenne des écarts de chaque dossier (un gros bien ne pèse
// pas plus qu'un petit). Null s'il n'y a rien à moyenner : le compteur ne s'affiche pas.
export function averageJourneyGap(dossiers: SuiviDossier[]): number | null {
  return averageSignedPriceGap(dossiers.map((dossier) => dossier.conclusion));
}

// Mission 130 — le même calcul sur des conclusions seules : le tableau du manager le porte.
export function averageSignedPriceGap(
  conclusions: ({
    outcome: string | null;
    sellerPerceivedPrice: number | null;
    commercializationPrice: number | null;
  } | null)[],
): number | null {
  const gaps: number[] = [];
  for (const conclusion of conclusions) {
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

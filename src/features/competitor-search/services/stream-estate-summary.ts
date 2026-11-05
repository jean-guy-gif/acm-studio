import {
  sortedFiltersLoosened,
  sortReceived,
  type SearchFilters,
} from '@/features/competitor-search/services/search-filters';
import {
  settingsChangeKind,
  type SearchSettings,
} from '@/features/competitor-search/services/search-settings';
import {
  STREAM_ESTATE_MORE_CAP,
  STREAM_ESTATE_PRICE_PER_ADVERT_EUR,
  STREAM_ESTATE_TARGET,
} from '@/features/competitor-search/services/stream-estate-limits';
import type {
  TierCursor,
  TieredSearchCounts,
  TieredSearchMemory,
  TierReport,
} from '@/features/competitor-search/services/stream-estate-tiers';
import {
  STREAM_ESTATE_SOURCE,
  type CompetitorCandidate,
  type RankedCandidate,
  type StreamEstateTier,
} from '@/features/competitor-search/types';
import { formatEuro } from '@/lib/format';

// MISSION 71 §6 — la ligne de bilan d'une recherche Stream Estate, dite telle quelle :
// « 10 comparables : 2 identiques, 3 plus grands, 5 à moins de 2 km — 37 annonces facturées
// (0,37 €) ». Moins de 10 après le dernier cran : on affiche ce qu'on a et on dit pourquoi.
// Les comparables comptés sont ceux que le classement PROPOSE (anciens, hors neuf en complément).

export type StreamEstateSearchNote = {
  billed: number; // cumulé sur la recherche et ses reprises (« Chercher encore »)
  stop: 'target' | 'cap' | 'exhausted' | 'error';
  cursor: TierCursor | null; // où reprendre, au plafond
  tiers: TierReport[];
  counts: TieredSearchCounts;
  newBuild: number;
  located: boolean;
  communeName: string;
  inseeCode: string;
  // Mission 99 — les critères de départ de la recherche (« Rayon 2 km », « 3 à 4 pièces »…) et
  // si le conseiller en a réglé au moins un. Absents d'un résultat gardé avant la mission.
  criteriaUsed?: string[];
  customSettings?: boolean;
  // Mission 99 — Paris, Lyon, Marseille : la recherche porte sur l'arrondissement, puis ses voisins.
  arrondissement?: boolean;
  // Mission 111 — les critères triés ont changé depuis la recherche : réappliqués aux biens déjà
  // reçus, sans nouvel appel (« looser » : un critère s'est desserré).
  resorted?: 'tighter' | 'looser';
  // Mission 111 — un critère de la requête a changé depuis : ce résultat vient des réglages
  // précédents, jusqu'à la prochaine recherche réussie (M107).
  staleSettings?: boolean;
};

export const RESORTED_NOTE = 'Critères appliqués aux biens déjà trouvés, sans nouvelle recherche.';
export const RESORTED_LOOSER_NOTE =
  'Les biens déjà reçus qui y répondent maintenant reviennent ; pour en trouver d’autres, une nouvelle recherche serait nécessaire.';
export const STALE_SETTINGS_NOTE =
  'Résultat obtenu avec vos réglages précédents : relancez la recherche pour appliquer les nouveaux.';
export const PAID_CHANGE_WARNING =
  'Ce changement demande une nouvelle recherche payante (jusqu’à 0,60 €). Le résultat actuel sera remplacé quand elle aura réussi.';

const TIER_LABELS: Record<StreamEstateTier, [string, string]> = {
  1: ['identique', 'identiques'],
  2: ['plus grand', 'plus grands'],
  3: ['avec une pièce de plus', 'avec une pièce de plus'],
  4: ['à moins de 2 km', 'à moins de 2 km'],
  5: ['à moins de 5 km', 'à moins de 5 km'],
  6: ['dans la même ville, pièces libres', 'dans la même ville, pièces libres'],
  7: ['à moins de 10 km', 'à moins de 10 km'],
  8: ['prix hors fourchette (±5 %)', 'prix hors fourchette (±5 %)'],
};

// Mission 99 — dans une ville à arrondissements, l'étape qui suit le quartier n'est pas un cercle
// de 2 km : c'est l'arrondissement et ses voisins, et les pièces libres portent sur ce périmètre.
const ARRONDISSEMENT_TIER_LABELS: Partial<Record<StreamEstateTier, [string, string]>> = {
  4: ['dans l’arrondissement ou un voisin', 'dans l’arrondissement ou un voisin'],
  6: [
    'arrondissements voisins compris, pièces libres',
    'arrondissements voisins compris, pièces libres',
  ],
};

function labelsOf(tier: StreamEstateTier, arrondissement: boolean | undefined): [string, string] {
  return (arrondissement ? ARRONDISSEMENT_TIER_LABELS[tier] : undefined) ?? TIER_LABELS[tier];
}

// Mission 97 — un seul mot : « élargissement ». La première recherche est « à l'identique » ;
// chaque étape suivante l'élargit une fois de plus.
export function widenedTimes(tiers: readonly StreamEstateTier[]): number {
  return new Set(tiers.filter((tier) => tier > 1)).size;
}

function resumePoint(tier: StreamEstateTier, arrondissement: boolean | undefined): string {
  return tier === 1
    ? 'la recherche à l’identique'
    : `à l’élargissement « ${labelsOf(tier, arrondissement)[0]} »`;
}

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count > 1 ? many : one}`;

export const euroCost = (billed: number): string =>
  formatEuro(billed * STREAM_ESTATE_PRICE_PER_ADVERT_EUR, { minDecimals: 2, maxDecimals: 2 });

// « Chercher encore (20 annonces, 0,20 €) » : seulement au plafond, avant 10, s'il reste des crans.
export const MORE_LABEL = `Chercher encore (${STREAM_ESTATE_MORE_CAP} annonces, ${euroCost(STREAM_ESTATE_MORE_CAP)})`;

const proposedOf = (ranked: RankedCandidate[]) =>
  ranked.filter((entry) => entry.portal === STREAM_ESTATE_SOURCE && !entry.newBuildComplement);

export function canSearchMore(ranked: RankedCandidate[], note: StreamEstateSearchNote): boolean {
  return (
    note.stop === 'cap' && note.cursor != null && proposedOf(ranked).length < STREAM_ESTATE_TARGET
  );
}

// Une reprise s'ajoute à la recherche : le coût et les écartés se cumulent, les crans parcourus
// s'enchaînent, l'arrêt et le point de reprise sont ceux de la dernière reprise.
export function mergeStreamEstateNote(
  previous: StreamEstateSearchNote | null,
  next: StreamEstateSearchNote,
): StreamEstateSearchNote {
  if (previous == null) return next;
  const sum = (key: Exclude<keyof TieredSearchCounts, 'outsideCriteria'>) =>
    previous.counts[key] + next.counts[key];
  return {
    ...next,
    billed: previous.billed + next.billed,
    tiers: [...previous.tiers, ...next.tiers],
    newBuild: previous.newBuild + next.newBuild,
    counts: {
      unreadable: sum('unreadable'),
      outsideWhitelist: sum('outsideWhitelist'),
      expiredOrigin: sum('expiredOrigin'),
      otherCommune: sum('otherCommune'),
      unverifiedPosition: sum('unverifiedPosition'),
      duplicates: sum('duplicates'),
      outsideCriteria: (previous.counts.outsideCriteria ?? 0) + (next.counts.outsideCriteria ?? 0),
    },
  };
}

// Ce que l'écran renvoie au serveur pour reprendre : les biens déjà trouvés (jamais repris ni
// recomptés) et leurs positions (pour repérer le remplissage d'une page à l'autre).
// Mission 111 — `candidates` : TOUS les biens reçus (jamais repris) ; seuls ceux qui remplissent
// les critères triés comptent comme trouvés.
export function resumeMemory(
  candidates: CompetitorCandidate[],
  filters: SearchFilters | null = null,
): TieredSearchMemory {
  const found = candidates.filter((candidate) => candidate.key != null);
  const counted = sortReceived(found, filters).candidates;
  return {
    keys: found.map((candidate) => candidate.key!),
    oldCount: counted.filter((candidate) => !candidate.isNewBuild).length,
    locations: found.map((candidate) => ({
      uuid: candidate.key!,
      point: candidate.features?.location ?? null,
    })),
  };
}

export function describeStreamEstateSearch(
  ranked: RankedCandidate[],
  note: StreamEstateSearchNote,
): { headline: string; details: string[] } {
  const proposed = proposedOf(ranked);
  const byTier = new Map<StreamEstateTier, number>();
  for (const entry of proposed) {
    const tier = entry.candidate.streamEstate?.tier;
    if (tier != null) byTier.set(tier, (byTier.get(tier) ?? 0) + 1);
  }
  // Mission 99 — avec des réglages, la première recherche n'est plus « à l'identique » du bien :
  // elle est ce que le conseiller a réglé.
  const tierLabel = (tier: StreamEstateTier, count: number): string =>
    tier === 1 && note.customSettings
      ? 'selon vos réglages'
      : labelsOf(tier, note.arrondissement)[count > 1 ? 1 : 0];
  const composition = [...byTier]
    .sort(([a], [b]) => a - b)
    .map(([tier, count]) => `${count} ${tierLabel(tier, count)}`);
  const headline = `${plural(proposed.length, 'concurrent', 'concurrents')}${
    composition.length > 0 ? ` : ${composition.join(', ')}` : ''
  } — ${plural(note.billed, 'annonce facturée', 'annonces facturées')} (${euroCost(note.billed)})`;

  const details: string[] = [];
  // Mission 111 — ce que l'écran a fait des biens déjà reçus depuis la recherche.
  if (note.staleSettings) details.push(STALE_SETTINGS_NOTE);
  if (note.resorted) {
    details.push(
      note.resorted === 'looser' ? `${RESORTED_NOTE} ${RESORTED_LOOSER_NOTE}` : RESORTED_NOTE,
    );
  }
  const widenings = widenedTimes(note.tiers.map((report) => report.tier));
  if (note.criteriaUsed != null && note.criteriaUsed.length > 0) {
    // Mission 99 — le bilan dit quels critères ont servi : « Rayon 2 km · 300 000 – 380 000 € ·
    // 3 à 4 pièces · 60 à 80 m² · élargie 1 fois ».
    details.push(
      [
        ...note.criteriaUsed,
        widenings > 0 ? `élargie ${widenings} fois` : 'sans élargissement',
      ].join(' · '),
    );
  } else if (widenings > 0) {
    details.push(`La recherche a été élargie ${widenings} fois.`);
  }
  if (proposed.length < STREAM_ESTATE_TARGET) {
    const lastTier = note.tiers.at(-1)?.tier;
    details.push(
      note.stop === 'cap'
        ? `Moins de ${STREAM_ESTATE_TARGET} : plafond atteint, la recherche s’arrête là${
            note.cursor
              ? ` — « Chercher encore » reprend ${resumePoint(note.cursor.tier, note.arrondissement)}, page suivante.`
              : '.'
          }`
        : note.stop === 'error'
          ? `Moins de ${STREAM_ESTATE_TARGET} : Stream Estate n’a plus répondu en cours de recherche ; voici ce qui a été trouvé avant.`
          : note.stop === 'exhausted'
            ? `Moins de ${STREAM_ESTATE_TARGET} : plus aucun bien après le dernier élargissement (${
                note.customSettings
                  ? 'dans les limites de vos réglages'
                  : lastTier === 8
                    ? 'rayon de 10 km, prix à ±5 % hors fourchette'
                    : lastTier === 7
                      ? 'rayon de 10 km'
                      : note.arrondissement
                        ? 'l’arrondissement et ses voisins'
                        : 'toute la commune'
              }).`
            : `Moins de ${STREAM_ESTATE_TARGET} : ${plural(
                STREAM_ESTATE_TARGET - proposed.length,
                'bien trouvé n’a pas été retenu',
                'biens trouvés n’ont pas été retenus',
              )} par le classement (type ou donnée manquante).`,
    );
  }
  if (!note.located) {
    details.push(
      note.arrondissement
        ? 'Adresse du bien non localisée avec certitude : pas de quartier. La recherche et ses premiers élargissements portent sur tout l’arrondissement, puis sur ses voisins ; le rayon de 10 km part du centre de l’arrondissement.'
        : 'Adresse du bien non localisée avec certitude : pas de quartier. La recherche et ses premiers élargissements portent sur toute la commune, les cercles de 2 et 5 km sont sautés, le rayon de 10 km part du centre de la commune.',
    );
  }
  const fallback = [
    ...new Set(note.tiers.filter((report) => report.fallback).map((report) => report.tier)),
  ];
  if (fallback.length > 0) {
    details.push(
      `Pour ${fallback.map((tier) => `« ${labelsOf(tier, note.arrondissement)[0]} »`).join(', ')} : communes voisines non exclues de la recherche (liste indisponible ou refusée par l’API) — les biens hors de ${note.communeName} ont été écartés ici, mais facturés.`,
    );
  }
  const { counts } = note;
  const excluded = [
    counts.otherCommune > 0
      ? `${plural(counts.otherCommune, 'bien', 'biens')} hors de ${note.communeName} à un élargissement « même ville »`
      : null,
    counts.unverifiedPosition > 0
      ? `${plural(counts.unverifiedPosition, 'bien', 'biens')} sans position fiable aux élargissements de quartier`
      : null,
    counts.expiredOrigin > 0
      ? `${plural(counts.expiredOrigin, 'annonce d’origine expirée', 'annonces d’origine expirées')} ou plus revue${counts.expiredOrigin > 1 ? 's' : ''} depuis 7 jours (21 aux élargissements à pièces libres)`
      : null,
    counts.duplicates > 0
      ? `${plural(counts.duplicates, 'doublon', 'doublons')} (le même bien sous un second identifiant)`
      : null,
    (counts.outsideCriteria ?? 0) > 0
      ? `${plural(counts.outsideCriteria ?? 0, 'bien', 'biens')} hors de vos critères (DPE, étage, extérieur, terrain ou piscine)`
      : null,
    counts.outsideWhitelist > 0
      ? `${plural(counts.outsideWhitelist, 'bien', 'biens')} sans annonce sur un site que l’extension relit`
      : null,
    counts.unreadable > 0
      ? `${plural(counts.unreadable, 'bien illisible', 'biens illisibles')}`
      : null,
  ].filter((part): part is string => part != null);
  if (excluded.length > 0) {
    details.push(`Écartés, mais facturés : ${excluded.join(' · ')}.`);
  }
  if (note.newBuild > 0) {
    details.push(
      `${plural(note.newBuild, 'bien neuf reçu', 'biens neufs reçus')} : proposé${note.newBuild > 1 ? 's' : ''} seulement en complément, sous 3 concurrents dans l’ancien.`,
    );
  }
  return { headline, details };
}

// Mission 111 — ce que devient le résultat payé affiché quand un réglage est enregistré. Jamais un
// appel payant, jamais un résultat oublié (M107) :
//   • critère de la requête changé : le résultat reste, marqué « réglages précédents » — il ne sera
//     remplacé que par une recherche réussie ;
//   • seuls des critères triés changés : les biens REÇUS (tous) sont triés à nouveau ;
//   • rien : rien.
export function afterSettingsChange(input: {
  previous: SearchSettings;
  next: SearchSettings;
  received: CompetitorCandidate[];
  note: StreamEstateSearchNote;
}): { note: StreamEstateSearchNote; shown: CompetitorCandidate[] | null } {
  const kind = settingsChangeKind(input.previous, input.next);
  if (kind === 'paid') {
    return { note: { ...input.note, staleSettings: true }, shown: null };
  }
  if (kind === 'none') {
    return { note: input.note, shown: null };
  }
  const sorted = sortReceived(input.received, input.next.filters);
  return {
    shown: sorted.candidates,
    note: {
      ...input.note,
      counts: { ...input.note.counts, outsideCriteria: sorted.outsideCriteria },
      resorted: sortedFiltersLoosened(input.previous.filters, input.next.filters)
        ? 'looser'
        : 'tighter',
    },
  };
}

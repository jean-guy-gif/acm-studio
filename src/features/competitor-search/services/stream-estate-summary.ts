import {
  STREAM_ESTATE_MORE_CAP,
  STREAM_ESTATE_PRICE_PER_ADVERT_EUR,
  STREAM_ESTATE_TARGET,
  type TierCursor,
  type TieredSearchCounts,
  type TieredSearchMemory,
  type TierReport,
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
};

const TIER_LABELS: Record<StreamEstateTier, [string, string]> = {
  1: ['identique', 'identiques'],
  2: ['plus grand', 'plus grands'],
  3: ['avec une pièce de plus', 'avec une pièce de plus'],
  4: ['à moins de 2 km', 'à moins de 2 km'],
  5: ['à moins de 5 km', 'à moins de 5 km'],
  6: ['à moins de 10 km', 'à moins de 10 km'],
  7: ['prix hors fourchette (±5 %)', 'prix hors fourchette (±5 %)'],
};

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
  const sum = (key: keyof TieredSearchCounts) => previous.counts[key] + next.counts[key];
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
    },
  };
}

// Ce que l'écran renvoie au serveur pour reprendre : les biens déjà trouvés (jamais repris ni
// recomptés) et leurs positions (pour repérer le remplissage d'une page à l'autre).
export function resumeMemory(candidates: CompetitorCandidate[]): TieredSearchMemory {
  const found = candidates.filter((candidate) => candidate.key != null);
  return {
    keys: found.map((candidate) => candidate.key!),
    oldCount: found.filter((candidate) => !candidate.isNewBuild).length,
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
  const composition = [...byTier]
    .sort(([a], [b]) => a - b)
    .map(([tier, count]) => `${count} ${TIER_LABELS[tier][count > 1 ? 1 : 0]}`);
  const headline = `${plural(proposed.length, 'comparable', 'comparables')}${
    composition.length > 0 ? ` : ${composition.join(', ')}` : ''
  } — ${plural(note.billed, 'annonce facturée', 'annonces facturées')} (${euroCost(note.billed)})`;

  const details: string[] = [];
  if (proposed.length < STREAM_ESTATE_TARGET) {
    const lastTier = note.tiers.at(-1)?.tier;
    details.push(
      note.stop === 'cap'
        ? `Moins de ${STREAM_ESTATE_TARGET} : plafond atteint, la recherche s’arrête là${
            note.cursor
              ? ` — « Chercher encore » reprend au cran ${note.cursor.tier}, page suivante.`
              : '.'
          }`
        : note.stop === 'error'
          ? `Moins de ${STREAM_ESTATE_TARGET} : Stream Estate n’a plus répondu en cours de recherche ; voici ce qui a été trouvé avant.`
          : note.stop === 'exhausted'
            ? `Moins de ${STREAM_ESTATE_TARGET} : plus aucun bien après le dernier cran (${
                lastTier === 7
                  ? 'rayon de 10 km, prix à ±5 % hors fourchette'
                  : lastTier === 6
                    ? 'rayon de 10 km'
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
      'Adresse du bien non localisée avec certitude : pas de quartier. Les premiers crans cherchent dans toute la commune, les cercles de 2 et 5 km sont sautés, le rayon de 10 km part du centre de la commune.',
    );
  }
  const fallback = [
    ...new Set(note.tiers.filter((report) => report.fallback).map((report) => report.tier)),
  ];
  if (fallback.length > 0) {
    details.push(
      `${fallback.length > 1 ? 'Crans' : 'Cran'} ${fallback.join(', ')} : communes voisines non exclues de la recherche (liste indisponible ou refusée par l’API) — les biens hors de ${note.communeName} ont été écartés ici, mais facturés.`,
    );
  }
  const { counts } = note;
  const excluded = [
    counts.otherCommune > 0
      ? `${plural(counts.otherCommune, 'bien', 'biens')} hors de ${note.communeName} à un cran « même ville »`
      : null,
    counts.unverifiedPosition > 0
      ? `${plural(counts.unverifiedPosition, 'bien', 'biens')} sans position fiable aux crans de quartier`
      : null,
    counts.expiredOrigin > 0
      ? `${plural(counts.expiredOrigin, 'annonce d’origine expirée', 'annonces d’origine expirées')} ou plus revue${counts.expiredOrigin > 1 ? 's' : ''} depuis 7 jours`
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

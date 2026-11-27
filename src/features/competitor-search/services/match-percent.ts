import { UNKNOWN_LABELS } from '@/features/competitor-search/services/filter-labels';
import { DPE_MATCH_POINTS, dpeClass, dpeMatchPoints } from '@/features/dpe/services/dpe';
import { identicalSurfaceTolerance } from '@/features/competitor-search/utils/surface-tolerance';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
  ProximityReason,
} from '@/features/competitor-search/types';
import { formatNumber, formatPercent, formatSquareMeters } from '@/lib/format';

// MISSION 71 — LE % DE CORRESPONDANCE, sur chaque carte (portails compris), sur 100 points :
//   secteur 25 · surface 20 · prix 20 · pièces 15 · stationnement 5 · extérieur 5 ·
//   niveau 2 : état 2, étage 2, ascenseur 2, année 2, piscine 1, exposition 1.
// MISSION 80 — plus le DPE, sur 10 points, quand les deux classes sont connues.
// Un critère inconnu d'un côté OU de l'autre sort du calcul : % = points obtenus ÷ points possibles.
// La liste est triée par ce % décroissant ; à égalité, l'ordre « les plus proches » décide.
//
// Stationnement, extérieur et niveau 2 reprennent le verdict de l'ordre (proximity.ts) : un
// critère qui rapproche (> 0) gagne ses points, un critère connu qui ne rapproche pas n'en gagne
// aucun, un critère inconnu sort du calcul.

export type MatchPlace = {
  // Distance au bien vendeur, seulement si les deux positions sont sûres.
  distanceMeters: number | null;
  // Même commune que le bien vendeur (code INSEE pour Stream Estate, nom pour un portail).
  sameCommune: boolean;
};

type Facet = { earned: number; possible: number };
const out: Facet = { earned: 0, possible: 0 };

function sector(place: MatchPlace): Facet {
  const d = place.distanceMeters;
  if (d != null) {
    const earned = d < 500 ? 25 : d < 1000 ? 20 : d < 2000 ? 15 : d < 5000 ? 8 : d < 10000 ? 4 : 0;
    return { earned, possible: 25 };
  }
  return { earned: place.sameCommune ? 15 : 5, possible: 25 };
}

function surface(criteria: CompetitorSearchCriteria, candidate: CompetitorCandidate): Facet {
  const ref = criteria.surfaceArea;
  const value = candidate.surfaceArea;
  if (ref == null || ref <= 0 || value == null || value <= 0) return out;
  const gap = Math.abs(value - ref) / ref;
  const earned = gap <= 0.05 + 1e-9 ? 20 : gap <= 0.1 + 1e-9 ? 15 : gap <= 0.25 + 1e-9 ? 8 : 0;
  return { earned, possible: 20 };
}

// La fourchette telle que le conseiller l'a saisie (une seule borne vaut les deux).
function advisorRange(criteria: CompetitorSearchCriteria): { low: number; high: number } | null {
  const { advisorPriceMin: min, advisorPriceMax: max } = criteria;
  if (min == null && max == null) return null;
  return { low: min ?? max!, high: max ?? min! };
}

// Écart au-dessus (> 0) ou en dessous (< 0) de la fourchette, en fraction de la borne dépassée ;
// 0 dans la fourchette, null sans fourchette ou sans prix.
export function priceOutsideRange(
  criteria: CompetitorSearchCriteria,
  price: number | null,
): number | null {
  const range = advisorRange(criteria);
  if (range == null || price == null || price <= 0) return null;
  if (price > range.high) return (price - range.high) / range.high;
  if (price < range.low) return (price - range.low) / range.low;
  return 0;
}

function price(criteria: CompetitorSearchCriteria, candidate: CompetitorCandidate): Facet {
  const gap = priceOutsideRange(criteria, candidate.price);
  if (gap == null) return out;
  const earned = gap === 0 ? 20 : Math.abs(gap) <= 0.05 + 1e-9 ? 10 : 0;
  return { earned, possible: 20 };
}

function rooms(criteria: CompetitorSearchCriteria, candidate: CompetitorCandidate): Facet {
  const ref = criteria.roomsCount;
  const value = candidate.roomsCount;
  if (ref == null || value == null) return out;
  return { earned: value === ref ? 15 : value === ref + 1 ? 7 : 0, possible: 15 };
}

// Mission 80 — le DPE sur 10 points : même classe 10, une classe d'écart 5, au-delà 0. Inconnu
// d'un côté ou de l'autre : hors calcul. Il ne filtre jamais et ne crée aucun cran.
function energy(criteria: CompetitorSearchCriteria, candidate: CompetitorCandidate): Facet {
  const earned = dpeMatchPoints(dpeClass(candidate.energyClass), dpeClass(criteria.energyClass));
  return earned == null ? out : { earned, possible: DPE_MATCH_POINTS };
}

const FROM_PROXIMITY: Record<string, number> = {
  parking: 5,
  outdoor: 5,
  condition: 2,
  floor: 2,
  elevator: 2,
  year: 2,
  pool: 1,
  exposure: 1,
};

function fromProximity(reasons: ProximityReason[]): Facet[] {
  return reasons
    .filter((reason) => reason.known && FROM_PROXIMITY[reason.criterion] != null)
    .map((reason) => {
      const weight = FROM_PROXIMITY[reason.criterion];
      return { earned: reason.points > 0 ? weight : 0, possible: weight };
    });
}

// Mission 97 — ce qui a pesé dans le % : une ligne par critère, tirée des MÊMES facettes que le
// pourcentage. Le calcul ne change pas ; il se lit. « Surface : 68 m² pour 72 m² ✓ ».
export type MatchDetailLine = {
  label: string;
  text: string;
  // ✓ tous les points du critère, ~ une partie, ✗ aucun.
  verdict: 'full' | 'partial' | 'none';
  earned: number;
  possible: number;
};

export const MATCH_SUMMARY_LINE =
  'Ressemblance avec votre bien\u00a0: secteur, surface, prix, pièces et équipements';

const PROXIMITY_LABELS: Record<string, string> = {
  parking: 'Stationnement',
  outdoor: 'Extérieur',
  condition: 'État',
  floor: 'Étage',
  elevator: 'Ascenseur',
  year: 'Année de construction',
  pool: 'Piscine',
  exposure: 'Exposition',
};

type LabeledFacet = Facet & { label: string; text: string };

const pieces = (count: number): string => `${count} pièce${count > 1 ? 's' : ''}`;

function labeledFacets(
  criteria: CompetitorSearchCriteria,
  candidate: CompetitorCandidate,
  reasons: ProximityReason[],
  place: MatchPlace,
): LabeledFacet[] {
  const d = place.distanceMeters;
  const priceGap = priceOutsideRange(criteria, candidate.price);
  const facets: LabeledFacet[] = [
    {
      ...sector(place),
      label: 'Secteur',
      text:
        d != null
          ? `à ${d < 1000 ? `${fr(Math.round(d / 10) * 10)} m` : km(d)}`
          : place.sameCommune
            ? 'même commune'
            : 'autre commune',
    },
    {
      ...surface(criteria, candidate),
      label: 'Surface',
      text: `${formatSquareMeters(candidate.surfaceArea ?? 0)} pour ${formatSquareMeters(criteria.surfaceArea ?? 0)}`,
    },
    {
      ...price(criteria, candidate),
      label: 'Prix',
      text:
        priceGap === 0
          ? 'dans votre fourchette'
          : `hors fourchette (${formatPercent((priceGap ?? 0) * 100, { maxDecimals: 0, signed: true })})`,
    },
    {
      ...rooms(criteria, candidate),
      label: 'Pièces',
      text: `${pieces(candidate.roomsCount ?? 0)} pour ${pieces(criteria.roomsCount ?? 0)}`,
    },
    {
      ...energy(criteria, candidate),
      label: 'DPE',
      text: `${dpeClass(candidate.energyClass) ?? ''} pour ${dpeClass(criteria.energyClass) ?? ''}`,
    },
  ];
  const known = reasons.filter(
    (reason) => reason.known && FROM_PROXIMITY[reason.criterion] != null,
  );
  fromProximity(reasons).forEach((facet, index) => {
    const reason = known[index];
    facets.push({
      ...facet,
      label: PROXIMITY_LABELS[reason.criterion] ?? reason.criterion,
      text: reason.label,
    });
  });
  return facets;
}

export function matchPercent(
  criteria: CompetitorSearchCriteria,
  candidate: CompetitorCandidate,
  reasons: ProximityReason[],
  place: MatchPlace,
): number | null {
  const facets = labeledFacets(criteria, candidate, reasons, place);
  const possible = facets.reduce((total, facet) => total + facet.possible, 0);
  if (possible === 0) return null;
  const earned = facets.reduce((total, facet) => total + facet.earned, 0);
  return Math.round((earned / possible) * 100);
}

// Le détail du % : seuls les critères qui ont compté (un critère inconnu sort du calcul, donc
// du détail), dans l'ordre du barème.
export function matchDetail(
  criteria: CompetitorSearchCriteria,
  candidate: CompetitorCandidate,
  reasons: ProximityReason[],
  place: MatchPlace,
): MatchDetailLine[] {
  return labeledFacets(criteria, candidate, reasons, place)
    .filter((facet) => facet.possible > 0)
    .map((facet) => ({
      label: facet.label,
      text: facet.text,
      verdict: facet.earned >= facet.possible ? 'full' : facet.earned > 0 ? 'partial' : 'none',
      earned: facet.earned,
      possible: facet.possible,
    }));
}

const fr = (value: number, digits = 0): string => formatNumber(value, { maxDecimals: digits });

const km = (meters: number): string => `${fr(meters / 1000, 1)} km`;

// MISSION 71 §5 — sur chaque carte Stream Estate élargie, une ligne dit l'écart à l'identique :
// « Même ville, à 1,6 km », « Commune voisine : Cagnes-sur-Mer, 6,1 km », « Plus grand : 78 m²
// (+12 %) », « 5 pièces (+1) », « 7 pièces au lieu de 9 », « Annonce vue il y a 12 jours »,
// « Prix 4 % au-dessus de votre fourchette », et « Même ville —
// quartier non vérifié » pour un bien sans position fiable. null : rien ne l'écarte de l'identique.
export function gapLine(
  criteria: CompetitorSearchCriteria,
  candidate: CompetitorCandidate,
  place: MatchPlace,
): string | null {
  const parts: string[] = [];
  const d = place.distanceMeters;
  // Sans position fiable, la distance n'est pas connue : on dit la commune, et que le quartier
  // n'est pas vérifié (correction du 06/10 : « Même ville — quartier non vérifié »).
  const unverified = candidate.features?.location == null;
  if (!place.sameCommune) {
    const name = candidate.city ?? 'autre commune';
    parts.push(
      `Commune voisine\u00a0: ${name}${d != null ? `, ${km(d)}` : unverified ? ' — quartier non vérifié' : ''}`,
    );
  } else if (unverified) {
    parts.push('Même ville — quartier non vérifié');
  } else if (d != null && d >= 1000) {
    parts.push(`Même ville, à ${km(d)}`);
  }

  const ref = criteria.surfaceArea;
  const value = candidate.surfaceArea;
  if (ref != null && ref > 0 && value != null && value > ref + identicalSurfaceTolerance(ref)) {
    parts.push(
      `Plus grand\u00a0: ${formatSquareMeters(value)} (${formatPercent(((value - ref) / ref) * 100, { maxDecimals: 0, signed: true })})`,
    );
  }
  if (criteria.roomsCount != null) {
    const count = candidate.roomsCount;
    if (count === criteria.roomsCount + 1) {
      parts.push(`${count} pièces (+1)`);
    } else if (count != null && count !== criteria.roomsCount) {
      // Mission 78 — pièces libérées : « 7 pièces au lieu de 9 ».
      parts.push(`${count} pièce${count > 1 ? 's' : ''} au lieu de ${criteria.roomsCount}`);
    } else if (count == null) {
      parts.push('Nombre de pièces non indiqué');
    }
  }
  const priceGap = priceOutsideRange(criteria, candidate.price);
  if (priceGap != null && priceGap !== 0) {
    const pct = Math.max(1, Math.round(Math.abs(priceGap) * 100));
    parts.push(
      `Prix ${formatPercent(pct)} ${priceGap > 0 ? 'au-dessus de' : 'en dessous de'} votre fourchette`,
    );
  }
  // Mission 78 — annonce d'origine revue il y a plus de 7 jours (admise jusqu'à 21 jours aux
  // crans à pièces libres) : la carte le dit.
  const stale = candidate.streamEstate?.staleOriginDays;
  if (stale != null) parts.push(`Annonce vue il y a ${stale} jours`);
  // Mission 110 — un critère réglé dont la donnée manque : « Étage non indiqué ».
  for (const name of candidate.streamEstate?.criteriaUnknown ?? []) {
    if (name in UNKNOWN_LABELS) parts.push(UNKNOWN_LABELS[name]);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

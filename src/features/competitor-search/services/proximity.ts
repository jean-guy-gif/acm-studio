import type {
  CandidateFeatures,
  CompetitorCandidate,
  CompetitorSearchCriteria,
  GeoPoint,
  ProximityAssessment,
  ProximityReason,
  SubjectProximityFacts,
} from '@/features/competitor-search/types';
import { formatNumber, formatPercent, formatSquareMeters } from '@/lib/format';

// ÉTAPE 2 « LES 10 PLUS PROCHES » — l'ORDRE des candidats déjà admis, jamais un filtre.
//
// Deux niveaux, le niveau 1 prime TOUJOURS sur le niveau 2 (tri lexicographique) :
//   niveau 1 : secteur, surface, prix, stationnement, extérieur ;
//   niveau 2 : état, étage, ascenseur, piscine, exposition, année.
// Chaque critère vaut des points ENTIERS par tranches (> 0 rapproche, < 0 éloigne) : des tranches,
// pas un écart continu, pour que deux candidats puissent être à égalité au niveau 1 et que le
// niveau 2 les départage.
//
// Seuls des champs STRUCTURÉS entrent ici (fiche du bien vendeur, champs de l'API, quartier et
// étage écrits sur la carte). Une donnée inconnue d'un côté OU de l'autre vaut 0 — ni bonus ni
// malus — et s'affiche « non indiqué ».

export const VISIBLE_CANDIDATES = 10;
// Parmi les 10 montrés, seuls les 5 premiers sont cochés d'office ; les 5 suivants restent à
// cocher par le conseiller s'il les retient.
export const PRESELECTED_CANDIDATES = 5;

// Les 10 premiers sont montrés, les autres attendent derrière « Voir les N autres » — dans le même
// ordre, rien n'est supprimé. `preselected` = les 5 premiers des montrés, HORS neuf ajouté en
// complément : le conseiller le coche lui-même s'il le retient (pas de neuf par défaut).
export function splitVisible<T extends { newBuildComplement?: boolean }>(
  ordered: T[],
  limit: number = VISIBLE_CANDIDATES,
): { shown: T[]; others: T[]; preselected: T[] } {
  const shown = ordered.slice(0, limit);
  return {
    shown,
    others: ordered.slice(limit),
    preselected: shown
      .slice(0, PRESELECTED_CANDIDATES)
      .filter((entry) => entry.newBuildComplement !== true),
  };
}

const EMPTY_FEATURES: CandidateFeatures = {
  location: null,
  locationDiscarded: false,
  district: null,
  floor: null,
  hasElevator: null,
  hasPool: null,
  parking: null,
  outdoor: null,
  condition: null,
  exposure: null,
  constructionYear: null,
};

const EMPTY_SUBJECT: SubjectProximityFacts = {
  parkingTypes: [],
  outdoorSpaces: [],
  generalCondition: null,
  floor: null,
  hasElevator: null,
  hasPool: null,
  exposure: null,
  constructionYear: null,
};

const reason = (
  criterion: string,
  level: 1 | 2,
  label: string,
  points: number,
  known = true,
): ProximityReason => ({ criterion, level, label, points, known });

const unknown = (criterion: string, level: 1 | 2, label: string): ProximityReason =>
  reason(criterion, level, label, 0, false);

const fr = (value: number, digits = 0): string => formatNumber(value, { maxDecimals: digits });

// --- secteur --------------------------------------------------------------------------------

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

// Tranches : < 500 m (+2), 500 m – 1 km (+1), 1 – 2 km (0), > 2 km (−1). Une position inconnue
// vaut 0 : à autres critères égaux, une distance connue de moins de 1 km passe toujours devant,
// et de 1 à 2 km elle est à égalité avec l'inconnu (le reste départage).
export function distanceBand(meters: number): { points: number; label: string } {
  const label =
    meters < 1000 ? `à ${fr(Math.round(meters / 10) * 10)} m` : `à ${fr(meters / 1000, 1)} km`;
  if (meters < 500) return { points: 2, label };
  if (meters < 1000) return { points: 1, label };
  if (meters <= 2000) return { points: 0, label };
  return { points: -1, label };
}

export function normalizeDistrict(value: string | null): string | null {
  if (value == null) return null;
  const cleaned = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return cleaned === '' ? null : cleaned;
}

// « Caucade - Sainte Marguerite » correspond à « Sainte-Marguerite » : la carte nomme parfois deux
// quartiers voisins séparés par un tiret entouré d'espaces.
function sameDistrict(subject: string, card: string): boolean {
  const ref = normalizeDistrict(subject);
  if (ref == null) return false;
  const whole = normalizeDistrict(card);
  if (whole === ref) return true;
  return card.split(/\s+[-–]\s+/).some((part) => normalizeDistrict(part) === ref);
}

function sector(
  criteria: CompetitorSearchCriteria,
  features: CandidateFeatures,
  subjectLocation: GeoPoint | null,
): ProximityReason {
  if (subjectLocation != null && features.location != null) {
    const band = distanceBand(distanceMeters(subjectLocation, features.location));
    return reason('sector', 1, band.label, band.points);
  }
  // Portails : le quartier ÉCRIT sur la carte. Même quartier que le bien → rapproche ; un autre
  // quartier reste neutre (on ne sait pas à quelle distance il est).
  if (criteria.district != null && features.district != null) {
    return sameDistrict(criteria.district, features.district)
      ? reason('sector', 1, `même quartier (${features.district})`, 1)
      : reason('sector', 1, `quartier ${features.district}`, 0);
  }
  return unknown(
    'sector',
    1,
    features.locationDiscarded
      ? 'secteur non indiqué (position approximative)'
      : 'secteur non indiqué',
  );
}

// --- surface et prix --------------------------------------------------------------------------

function surface(
  criteria: CompetitorSearchCriteria,
  candidate: CompetitorCandidate,
): ProximityReason {
  const ref = criteria.surfaceArea;
  const value = candidate.surfaceArea;
  if (ref == null || ref <= 0 || value == null || value <= 0) {
    return unknown('surface', 1, 'surface non indiquée');
  }
  const gap = value - ref;
  const abs = Math.abs(gap);
  const label =
    abs < 0.5
      ? 'même surface'
      : `${formatSquareMeters(abs, { maxDecimals: 1 })} de ${gap > 0 ? 'plus' : 'moins'}`;
  if (abs <= Math.max(ref * 0.03, 1)) return reason('surface', 1, label, 1);
  if (abs <= Math.max(ref * 0.06, 2)) return reason('surface', 1, label, 0);
  return reason('surface', 1, label, -1);
}

function price(
  criteria: CompetitorSearchCriteria,
  candidate: CompetitorCandidate,
): ProximityReason {
  const { advisorPriceMin: min, advisorPriceMax: max } = criteria;
  const value = candidate.price;
  if ((min == null && max == null) || value == null || value <= 0) {
    return unknown('price', 1, 'prix non indiqué');
  }
  const center = ((min ?? max!) + (max ?? min!)) / 2;
  const rel = (value - center) / center;
  const pct = Math.round(Math.abs(rel) * 100);
  const label =
    pct === 0
      ? 'prix au centre de votre fourchette'
      : `prix ${rel > 0 ? '+' : '−'}${formatPercent(pct)} du centre de votre fourchette`;
  if (Math.abs(rel) <= 0.03) return reason('price', 1, label, 1);
  if (Math.abs(rel) <= 0.06) return reason('price', 1, label, 0);
  return reason('price', 1, label, -1);
}

// --- stationnement et extérieur ---------------------------------------------------------------

// Les types de la fiche, ramenés aux familles qu'une annonce sait nommer.
const SUBJECT_PARKING_FAMILY: Record<string, string> = {
  garage: 'garage',
  closed_box: 'box',
  indoor_parking: 'place',
  outdoor_parking: 'place',
  carport: 'place',
};
const PARKING_LABELS: Record<string, string> = {
  garage: 'garage',
  box: 'box',
  place: 'place de parking',
};

const list = (values: string[], labels: Record<string, string>): string =>
  values.map((value) => labels[value] ?? value).join(' + ');

function parking(subject: SubjectProximityFacts, features: CandidateFeatures): ProximityReason {
  const subjectTypes = subject.parkingTypes;
  const cand = features.parking;
  if (subjectTypes.length === 0 || cand == null || cand.length === 0) {
    return unknown('parking', 1, 'stationnement non indiqué');
  }
  if (subjectTypes.includes('none')) {
    return reason('parking', 1, `${list(cand, PARKING_LABELS)} ≠ aucun`, -1);
  }
  const families = [
    ...new Set(subjectTypes.map((type) => SUBJECT_PARKING_FAMILY[type]).filter(Boolean)),
  ];
  const common = cand.filter((family) => families.includes(family));
  if (common.length > 0) {
    return reason('parking', 1, `même stationnement (${list(common, PARKING_LABELS)})`, 1);
  }
  return reason(
    'parking',
    1,
    `${list(cand, PARKING_LABELS)} ≠ ${list(families, PARKING_LABELS)}`,
    -1,
  );
}

const OUTDOOR_LABELS: Record<string, string> = {
  balcony: 'balcon',
  terrace: 'terrasse',
  garden: 'jardin',
  loggia: 'loggia',
  veranda: 'véranda',
};

function outdoor(subject: SubjectProximityFacts, features: CandidateFeatures): ProximityReason {
  const subjectSpaces = [
    ...new Set(
      subject.outdoorSpaces.map((space) => (space === 'roof_terrace' ? 'terrace' : space)),
    ),
  ];
  const cand = features.outdoor;
  if (subjectSpaces.length === 0 || cand == null) {
    return unknown('outdoor', 1, 'extérieur non indiqué');
  }
  if (subjectSpaces.includes('none')) {
    return cand.present.length > 0
      ? reason('outdoor', 1, `${list(cand.present, OUTDOOR_LABELS)} ≠ aucun`, -1)
      : unknown('outdoor', 1, 'extérieur non indiqué');
  }
  const common = cand.present.filter((space) => subjectSpaces.includes(space));
  if (common.length > 0) {
    return reason('outdoor', 1, `même extérieur (${list(common, OUTDOOR_LABELS)})`, 1);
  }
  if (cand.present.length > 0) {
    return reason(
      'outdoor',
      1,
      `${list(cand.present, OUTDOOR_LABELS)} ≠ ${list(subjectSpaces, OUTDOOR_LABELS)}`,
      -1,
    );
  }
  // L'annonce dit seulement ce qu'elle n'a PAS (« Pas de balcon ») : ça ne compte que si elle
  // écarte tout ce que le bien vendeur a.
  if (subjectSpaces.every((space) => cand.absent.includes(space))) {
    return reason('outdoor', 1, `pas de ${list(subjectSpaces, OUTDOOR_LABELS)}`, -1);
  }
  return unknown('outdoor', 1, 'extérieur non indiqué');
}

// --- niveau 2 ---------------------------------------------------------------------------------

const CONDITION_LABELS: Record<string, string> = {
  new: 'neuf',
  excellent: 'excellent',
  good: 'bon',
  to_refresh: 'à rafraîchir',
  to_renovate: 'à rénover',
  major_renovation: 'gros travaux',
};
const WORKS = new Set(['to_refresh', 'to_renovate', 'major_renovation']);

function condition(subject: SubjectProximityFacts, features: CandidateFeatures): ProximityReason {
  const ref = subject.generalCondition;
  const value = features.condition;
  if (ref == null || value == null || !(ref in CONDITION_LABELS) || !(value in CONDITION_LABELS)) {
    return unknown('condition', 2, 'état non indiqué');
  }
  return WORKS.has(ref) === WORKS.has(value)
    ? reason('condition', 2, `même état (${CONDITION_LABELS[value]})`, 1)
    : reason('condition', 2, `état ${CONDITION_LABELS[value]} ≠ ${CONDITION_LABELS[ref]}`, -1);
}

const floorLabel = (floor: number): string =>
  floor === 0 ? 'RDC' : floor === 1 ? '1er' : floor < 0 ? 'sous-sol' : `${floor}e`;

function floor(subject: SubjectProximityFacts, features: CandidateFeatures): ProximityReason {
  const ref = subject.floor;
  const value = features.floor;
  if (ref == null || value == null) return unknown('floor', 2, 'étage non indiqué');
  if (ref <= 0 !== value <= 0) {
    return reason('floor', 2, `${floorLabel(value)} ≠ ${floorLabel(ref)}`, -1);
  }
  const gap = Math.abs(value - ref);
  if (gap === 0) return reason('floor', 2, `même étage (${floorLabel(value)})`, 1);
  if (gap === 1) return reason('floor', 2, `étage proche (${floorLabel(value)})`, 1);
  if (gap >= 3) return reason('floor', 2, `${floorLabel(value)} ≠ ${floorLabel(ref)}`, -1);
  return reason('floor', 2, `${floorLabel(value)} étage`, 0);
}

function equipment(
  criterion: string,
  noun: string,
  unknownLabel: string,
  ref: boolean | null,
  value: boolean | null,
): ProximityReason {
  if (ref == null || value == null) return unknown(criterion, 2, unknownLabel);
  // « avec ascenseur » (comme le bien) ; « sans ascenseur ≠ avec » (le bien en a un).
  const word = (flag: boolean) => (flag ? 'avec' : 'sans');
  return ref === value
    ? reason(criterion, 2, `${word(value)} ${noun}`, 1)
    : reason(criterion, 2, `${word(value)} ${noun} ≠ ${word(ref)}`, -1);
}

const EXPOSURE_ANGLES: Record<string, number> = {
  north: 0,
  north_east: 45,
  east: 90,
  south_east: 135,
  south: 180,
  south_west: 225,
  west: 270,
  north_west: 315,
};
const EXPOSURE_LABELS: Record<string, string> = {
  north: 'nord',
  north_east: 'nord-est',
  east: 'est',
  south_east: 'sud-est',
  south: 'sud',
  south_west: 'sud-ouest',
  west: 'ouest',
  north_west: 'nord-ouest',
};

function exposure(subject: SubjectProximityFacts, features: CandidateFeatures): ProximityReason {
  const ref = subject.exposure;
  const value = features.exposure;
  // « Traversant », « multiple », « non renseignée » : pas une direction, donc pas comparable.
  if (ref == null || value == null || !(ref in EXPOSURE_ANGLES) || !(value in EXPOSURE_ANGLES)) {
    return unknown('exposure', 2, 'exposition non indiquée');
  }
  const raw = Math.abs(EXPOSURE_ANGLES[ref] - EXPOSURE_ANGLES[value]) % 360;
  const gap = Math.min(raw, 360 - raw);
  if (gap === 0) return reason('exposure', 2, `même exposition (${EXPOSURE_LABELS[value]})`, 1);
  if (gap === 45) return reason('exposure', 2, `exposition proche (${EXPOSURE_LABELS[value]})`, 0);
  return reason('exposure', 2, `${EXPOSURE_LABELS[value]} ≠ ${EXPOSURE_LABELS[ref]}`, -1);
}

function constructionYear(
  subject: SubjectProximityFacts,
  features: CandidateFeatures,
): ProximityReason {
  const ref = subject.constructionYear;
  const value = features.constructionYear;
  if (ref == null || value == null) return unknown('year', 2, 'année non indiquée');
  const gap = Math.abs(value - ref);
  if (gap <= 10) return reason('year', 2, `même époque (${value})`, 1);
  if (gap <= 30) return reason('year', 2, `construit en ${value}`, 0);
  return reason('year', 2, `${value} ≠ ${ref}`, -1);
}

// --- évaluation et ordre ----------------------------------------------------------------------

export function assessProximity(
  criteria: CompetitorSearchCriteria,
  candidate: CompetitorCandidate,
  subjectLocation: GeoPoint | null,
  subjectType: string | null,
): ProximityAssessment {
  const features = candidate.features ?? EMPTY_FEATURES;
  const subject = criteria.subject ?? EMPTY_SUBJECT;
  // Étage et ascenseur n'ont de sens que pour un appartement : pour une maison vendeuse, ils ne
  // sont ni comptés ni affichés.
  const flat = subjectType !== 'house';
  const reasons: ProximityReason[] = [
    sector(criteria, features, subjectLocation),
    surface(criteria, candidate),
    price(criteria, candidate),
    parking(subject, features),
    outdoor(subject, features),
    condition(subject, features),
    ...(flat
      ? [
          floor(subject, features),
          equipment(
            'elevator',
            'ascenseur',
            'ascenseur non indiqué',
            subject.hasElevator,
            features.hasElevator,
          ),
        ]
      : []),
    equipment('pool', 'piscine', 'piscine non indiquée', subject.hasPool, features.hasPool),
    exposure(subject, features),
    constructionYear(subject, features),
  ];
  const sum = (level: 1 | 2) =>
    reasons.filter((r) => r.level === level).reduce((total, r) => total + r.points, 0);
  return { level1: sum(1), level2: sum(2), reasons };
}

// Le niveau 1 d'abord, TOUJOURS ; le niveau 2 ne départage qu'à niveau 1 égal. 0 = égalité.
export function compareProximity(a: ProximityAssessment, b: ProximityAssessment): number {
  return b.level1 - a.level1 || b.level2 - a.level2;
}

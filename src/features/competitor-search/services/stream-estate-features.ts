import type { CandidateFeatures, GeoPoint } from '@/features/competitor-search/types';

// ÉTAPE 2 — ce que l'API Stream Estate dit d'un bien EN CHAMPS STRUCTURÉS : position, étage,
// ascenseur, et la liste `features` des annonces (des étiquettes courtes publiées par le portail :
// « Terrasse », « 1 parking: Garage », « Etat : très bon », « Exposition sud »). On ne lit que des
// étiquettes ENTIÈRES de forme connue ; jamais la description ni le titre. Ce qui n'est pas écrit
// reste null (inconnu → neutre). Deux annonces du même bien qui se contredisent → inconnu.

export type StreamEstateFeatureInput = {
  location?: { lat?: number | null; lon?: number | null } | null;
  floor?: number | null;
  elevator?: boolean | null;
  adverts: {
    floor?: number | null;
    elevator?: boolean | null;
    constructionYear?: number | null;
    features?: string[] | null;
  }[];
};

// --- position ---------------------------------------------------------------------------------

const decimals = (value: number): number => {
  const text = String(value);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
};

export const locationKey = (point: GeoPoint): string => `${point.lat},${point.lon}`;

export function readLocation(location: StreamEstateFeatureInput['location']): GeoPoint | null {
  const lat = location?.lat;
  const lon = location?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

// Coordonnées de REMPLISSAGE : Stream Estate place un bien sans adresse sur un point commun
// (« 43.7,7.25 », « 43,7 » à Nice, ou un centre de zone à 12 décimales partagé par plusieurs
// biens). Mesuré le 05/10 sur 136 biens : 14 au point grossier, plusieurs points répétés. Est du
// remplissage : moins de 3 décimales sur l'une des coordonnées (≈ 100 m), OU le même point exact
// porté par au moins deux biens distincts de la réponse.
export function isFillerLocation(point: GeoPoint, repeated: ReadonlySet<string>): boolean {
  return decimals(point.lat) < 3 || decimals(point.lon) < 3 || repeated.has(locationKey(point));
}

// Les points portés par au moins deux biens distincts d'une même réponse.
export function repeatedLocations(points: (GeoPoint | null)[]): Set<string> {
  const counts = new Map<string, number>();
  for (const point of points) {
    if (point == null) continue;
    const key = locationKey(point);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count >= 2).map(([key]) => key));
}

// --- étiquettes -------------------------------------------------------------------------------

const clean = (label: string): string =>
  label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// « 1 parking: Garage », « 2 parkings: Box de stationnement, Parking » : la liste après « : ».
function parkingItem(item: string): string | null {
  const text = clean(item).replace(/^\d+\s*/, '');
  if (/^garages?$/.test(text)) return 'garage';
  if (/^(box|boxs|boxes)( de stationnement)?$/.test(text)) return 'box';
  if (/^(places? de )?parkings?$/.test(text)) return 'place';
  return null;
}

function parkingFamilies(label: string): string[] {
  const text = clean(label);
  const listed = text.match(/^\d+ parkings?\s*:\s*(.+)$/);
  if (listed) {
    return listed[1]
      .split(',')
      .map(parkingItem)
      .filter((family): family is string => family != null);
  }
  const single = parkingItem(text);
  return single ? [single] : [];
}

const OUTDOOR_WORDS: [RegExp, string][] = [
  [/^balcon(s|y)?$/, 'balcony'],
  [/^terrasses?$/, 'terrace'],
  [/^jardins?( privatifs?)?$/, 'garden'],
  [/^loggias?$/, 'loggia'],
  [/^verandas?$/, 'veranda'],
];

function outdoorSpace(word: string): string | null {
  for (const [pattern, space] of OUTDOOR_WORDS) {
    if (pattern.test(word)) return space;
  }
  return null;
}

// « Terrasse », « 2 terrasses », « 3 m² Balcon » → présent ; « Pas de balcon » → absent.
function readOutdoor(label: string): { space: string; present: boolean } | null {
  const text = clean(label);
  const negative = text.match(/^(?:pas de|sans) (.+)$/);
  if (negative) {
    const space = outdoorSpace(negative[1]);
    return space ? { space, present: false } : null;
  }
  const space = outdoorSpace(text.replace(/^\d+(?:[.,]\d+)? m(?:²|2) /, '').replace(/^\d+ /, ''));
  return space ? { space, present: true } : null;
}

const CONDITIONS: [RegExp, string][] = [
  [/^(tres bon|excellent)( etat)?$/, 'excellent'],
  [/^bon( etat)?$/, 'good'],
  [/^neuf$/, 'new'],
  [/^a rafraichir$/, 'to_refresh'],
  [/^a renover$/, 'to_renovate'],
  [/^gros travaux$/, 'major_renovation'],
];

// « Etat : très bon ». Les étiquettes « Structure/extérieur … » parlent de l'immeuble, pas du bien.
function readCondition(label: string): string | null {
  const match = clean(label).match(/^etat\s*:\s*(.+)$/);
  if (!match) return null;
  for (const [pattern, value] of CONDITIONS) {
    if (pattern.test(match[1])) return value;
  }
  return null;
}

const EXPOSURES: Record<string, string> = {
  nord: 'north',
  'nord-est': 'north_east',
  est: 'east',
  'sud-est': 'south_east',
  sud: 'south',
  'sud-ouest': 'south_west',
  ouest: 'west',
  'nord-ouest': 'north_west',
};

function readExposure(label: string): string | null {
  const match = clean(label).match(/^(?:orientation|exposition) ([a-z-]+)$/);
  return match ? (EXPOSURES[match[1]] ?? null) : null;
}

function readYear(label: string): number | null {
  const match = clean(label).match(/^annee de construction:? (\d{4})$/);
  return match ? Number(match[1]) : null;
}

function readPool(label: string): boolean | null {
  const text = clean(label);
  if (/^piscines?( privee| collective| chauffee)?$/.test(text)) return true;
  if (/^(pas de|sans) piscine$/.test(text)) return false;
  return null;
}

// Une seule valeur si toutes les sources concordent ; sinon (aucune, ou contradiction) null.
function agreed<T>(values: (T | null | undefined)[]): T | null {
  const known = [...new Set(values.filter((value): value is T => value != null))];
  return known.length === 1 ? known[0] : null;
}

const sane = (value: number | null, min: number, max: number): number | null =>
  value != null && Number.isInteger(value) && value >= min && value <= max ? value : null;

export function readStreamEstateFeatures(
  property: StreamEstateFeatureInput,
  repeated: ReadonlySet<string>,
): CandidateFeatures {
  const labels = property.adverts.flatMap((advert) => advert.features ?? []);

  const point = readLocation(property.location);
  const discarded = point != null && isFillerLocation(point, repeated);

  const parking = [...new Set(labels.flatMap(parkingFamilies))];

  const present = new Set<string>();
  const absent = new Set<string>();
  for (const label of labels) {
    const read = readOutdoor(label);
    if (read) (read.present ? present : absent).add(read.space);
  }
  for (const space of present) absent.delete(space); // un « oui » quelque part l'emporte

  const poolValues = labels.map(readPool);
  const elevatorLabel = labels.some((label) => clean(label) === 'ascenseur') ? true : null;

  return {
    location: discarded ? null : point,
    locationDiscarded: discarded,
    district: null,
    floor: sane(property.floor ?? agreed(property.adverts.map((advert) => advert.floor)), -1, 80),
    hasElevator:
      property.elevator ??
      agreed(property.adverts.map((advert) => advert.elevator)) ??
      elevatorLabel,
    hasPool: poolValues.includes(true) ? true : agreed(poolValues),
    parking: parking.length > 0 ? parking : null,
    outdoor:
      present.size > 0 || absent.size > 0 ? { present: [...present], absent: [...absent] } : null,
    condition: agreed(labels.map(readCondition)),
    exposure: agreed(labels.map(readExposure)),
    constructionYear: sane(
      agreed([
        ...property.adverts.map((advert) => advert.constructionYear),
        ...labels.map(readYear),
      ]),
      1500,
      2100,
    ),
  };
}

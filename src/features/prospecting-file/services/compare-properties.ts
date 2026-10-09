import type { DpeClass } from '@/features/dpe/services/dpe';
import { communeKey } from '@/features/competitor-search/utils/commune-name';
import { capitalize, propertyWording } from '@/features/prospecting-file/services/property-wording';
import type {
  CardRow,
  ListedProperty,
  PropertyKind,
  ProspectingFileFacts,
} from '@/features/prospecting-file/types';
import {
  OUTDOOR_SPACE_LABELS,
  PARKING_TYPE_LABELS,
} from '@/features/subject-property/constants/property-options';
import { formatEuro, formatNumber, formatSquareMeters } from '@/lib/format';

// Mission 84 — notre bien face au leur. Pur. Deux règles tiennent tout le fichier :
//   - une ligne ne s'affiche que si elle est connue des DEUX côtés (jamais « — ») ;
//   - on énonce des faits, jamais un jugement (ni « mieux », ni « plus cher »).

const NBSP = '\u00a0';
const NONE = 'none';

// Notre prix au plus 5 % au-dessus du leur : les prix s'affichent. Au-delà, ou si l'un des
// deux manque, la ligne devient « Même gamme de prix », sans chiffre.
export const PRICE_GAP_LIMIT = 0.05;

export function pricesKnown(facts: ProspectingFileFacts): boolean {
  return facts.ours.price != null && facts.theirs.price != null;
}

export function defaultShowPrices(facts: ProspectingFileFacts): boolean {
  const { ours, theirs } = facts;
  if (ours.price == null || theirs.price == null) {
    return false;
  }
  return ours.price <= theirs.price * (1 + PRICE_GAP_LIMIT);
}

// Une distance s'arrondit pour se lire : au plus proche de 50 m, puis au dixième de kilomètre.
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${formatNumber(Math.max(50, Math.round(meters / 50) * 50))}${NBSP}m`;
  }
  return `${formatNumber(meters / 1000, { maxDecimals: 1 })}${NBSP}km`;
}

// La surface qui compte : celle du terrain pour un terrain, la surface habitable sinon.
const mainSurface = (kind: PropertyKind, property: ListedProperty): number | null =>
  kind === 'land' ? (property.landArea ?? property.surfaceArea) : property.surfaceArea;

// Les lignes comparées dépendent du type de bien.
const comparesLand = (kind: PropertyKind): boolean => kind === 'house';
const comparesAmenities = (kind: PropertyKind): boolean => kind === 'house' || kind === 'apartment';

// Surface proche : à 10 % près, jamais moins de ±3 m² (mêmes tolérances que la recherche).
function surfacesClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(a * 0.1, 3);
}

type Amenity = { known: boolean; labels: string[] };

// Une liste vide veut dire « non renseigné » ; « aucun » est une réponse connue.
function amenity(values: string[], labels: Record<string, string>): Amenity {
  const recognised = values.filter((value) => value in labels);
  return {
    known: recognised.length > 0,
    labels: recognised.filter((value) => value !== NONE).map((value) => labels[value]),
  };
}

const amenityValue = (item: Amenity): string =>
  item.labels.length > 0 ? item.labels.join(', ') : 'Aucun';

type Pair<T> = { ours: T; theirs: T };

// Les deux valeurs, ou null dès qu'une des deux manque.
function both<T>(ours: T | null, theirs: T | null): Pair<T> | null {
  return ours != null && theirs != null ? { ours, theirs } : null;
}

type Compared = {
  surface: Pair<number> | null;
  rooms: Pair<number> | null;
  land: Pair<number> | null;
  outdoor: Pair<Amenity> | null;
  parking: Pair<Amenity> | null;
  dpe: Pair<DpeClass> | null;
  district: Pair<string> | null;
  city: Pair<string> | null;
  price: Pair<number> | null;
};

function compare(facts: ProspectingFileFacts): Compared {
  const { kind, ours, theirs } = facts;
  const amenities = (
    a: string[],
    b: string[],
    labels: Record<string, string>,
  ): Pair<Amenity> | null => {
    if (!comparesAmenities(kind)) {
      return null;
    }
    const pair = { ours: amenity(a, labels), theirs: amenity(b, labels) };
    return pair.ours.known && pair.theirs.known ? pair : null;
  };
  const text = (value: string | null): string | null => value?.trim() || null;
  return {
    surface: both(mainSurface(kind, ours), mainSurface(kind, theirs)),
    rooms: kind === 'land' ? null : both(ours.roomsCount, theirs.roomsCount),
    land: comparesLand(kind) ? both(ours.landArea, theirs.landArea) : null,
    outdoor: amenities(ours.outdoorSpaces, theirs.outdoorSpaces, OUTDOOR_SPACE_LABELS),
    parking: amenities(ours.parkingTypes, theirs.parkingTypes, PARKING_TYPE_LABELS),
    dpe: both(ours.dpe, theirs.dpe),
    district: both(text(ours.district), text(theirs.district)),
    city: both(text(ours.city), text(theirs.city)),
    price: both(ours.price, theirs.price),
  };
}

export type ComparedCards = { ours: CardRow[]; theirs: CardRow[] };

// Les lignes des deux cartes, dans le même ordre des deux côtés. `compact` : la version
// confrère, où la surface passe dans le titre et le secteur dans l'en-tête.
export function comparedRows(
  facts: ProspectingFileFacts,
  options: { showPrices: boolean; compact: boolean },
): ComparedCards {
  const compared = compare(facts);
  const cards: ComparedCards = { ours: [], theirs: [] };
  const push = (label: string, pair: Pair<string> | null, dpe: Pair<DpeClass> | null = null) => {
    if (pair) {
      cards.ours.push({ label, value: pair.ours, dpe: dpe?.ours ?? null });
      cards.theirs.push({ label, value: pair.theirs, dpe: dpe?.theirs ?? null });
    }
  };
  const map = <T>(pair: Pair<T> | null, format: (value: T) => string): Pair<string> | null =>
    pair ? { ours: format(pair.ours), theirs: format(pair.theirs) } : null;

  if (!options.compact) {
    push(
      'Surface',
      map(compared.surface, (value) => formatSquareMeters(value)),
    );
  }
  push(
    'Terrain',
    map(compared.land, (value) => formatSquareMeters(value)),
  );
  push('Extérieur', map(compared.outdoor, amenityValue));
  push('Stationnement', map(compared.parking, amenityValue));
  if (!options.compact) {
    push('Secteur', compared.district ?? compared.city);
  }
  push(
    'DPE',
    map(compared.dpe, (value) => value),
    compared.dpe,
  );
  if (options.showPrices) {
    push(
      'Prix affiché',
      map(compared.price, (value) => formatEuro(value)),
    );
  }
  return cards;
}

const TYPE_TITLES: Record<PropertyKind, string> = {
  apartment: 'Appartement',
  house: 'Maison',
  land: 'Terrain',
  building: 'Immeuble',
  commercial: 'Local commercial',
  parking: 'Parking',
  unknown: 'Bien',
};

const rooms = (count: number): string => `${count}${NBSP}pièce${count > 1 ? 's' : ''}`;

// « Maison 9 pièces » ; les pièces n'y figurent que si elles sont connues des deux côtés.
export function cardTitles(
  facts: ProspectingFileFacts,
  options: { compact: boolean },
): Pair<string> {
  const compared = compare(facts);
  const title = (side: 'ours' | 'theirs'): string => {
    const parts = [TYPE_TITLES[facts.kind]];
    if (compared.rooms) {
      parts[0] = `${parts[0]} ${rooms(compared.rooms[side])}`;
    }
    if (options.compact && compared.surface) {
      parts.push(formatSquareMeters(compared.surface[side]));
    }
    return parts.join(' · ');
  };
  return { ours: title('ours'), theirs: title('theirs') };
}

export function sameCity(facts: ProspectingFileFacts): boolean {
  const ours = communeKey(facts.ours.city);
  return ours != null && ours === communeKey(facts.theirs.city);
}

function sameDistrict(facts: ProspectingFileFacts): boolean {
  const ours = communeKey(facts.ours.district);
  return sameCity(facts) && ours != null && ours === communeKey(facts.theirs.district);
}

// « Ce qui les rapproche » : même secteur (et la distance quand elle est sûre), même gamme de
// prix, surface proche.
export function closeness(facts: ProspectingFileFacts, options: { showPrices: boolean }): string[] {
  const compared = compare(facts);
  const items: string[] = [];
  const distance =
    facts.distanceMeters != null ? `à ${formatDistance(facts.distanceMeters)}` : null;

  if (sameCity(facts)) {
    const sector = sameDistrict(facts) ? 'Même quartier' : 'Même secteur';
    items.push(distance ? `*${sector}*, ${distance} l’un de l’autre` : `*${sector}*`);
  } else if (distance) {
    items.push(`*${capitalize(distance)}* l’un de l’autre`);
  }

  if (facts.theirs.price != null) {
    items.push(
      options.showPrices && compared.price
        ? `*Même gamme de prix* : ${formatEuro(compared.price.ours)} et ${formatEuro(compared.price.theirs)}`
        : '*Même gamme de prix*',
    );
  }

  if (compared.surface && surfacesClose(compared.surface.ours, compared.surface.theirs)) {
    const ours = formatSquareMeters(compared.surface.ours);
    const theirs = formatSquareMeters(compared.surface.theirs);
    items.push(
      ours === theirs ? `*Même surface* : ${ours}` : `*Surface proche* : ${ours} et ${theirs}`,
    );
  }
  return items;
}

// Ce que chaque bien a et que l'autre n'a pas, des deux côtés, en faits seulement.
export function distinctFacts(facts: ProspectingFileFacts): Pair<string[]> {
  const compared = compare(facts);
  const result: Pair<string[]> = { ours: [], theirs: [] };
  const differ = <T>(pair: Pair<T> | null, format: (value: T) => string) => {
    if (pair && format(pair.ours) !== format(pair.theirs)) {
      result.ours.push(format(pair.ours));
      result.theirs.push(format(pair.theirs));
    }
  };
  const onlyOne = (pair: Pair<Amenity> | null) => {
    if (!pair) {
      return;
    }
    const missingFrom = (own: Amenity, other: Amenity): string[] =>
      own.labels
        .filter((label) => !other.labels.includes(label))
        .map((label) => label.toLowerCase());
    result.ours.push(...missingFrom(pair.ours, pair.theirs));
    result.theirs.push(...missingFrom(pair.theirs, pair.ours));
  };

  differ(compared.rooms, rooms);
  if (compared.surface && !surfacesClose(compared.surface.ours, compared.surface.theirs)) {
    differ(compared.surface, (value) => formatSquareMeters(value));
  }
  differ(compared.land, (value) => `terrain de ${formatSquareMeters(value)}`);
  onlyOne(compared.outdoor);
  onlyOne(compared.parking);
  differ(compared.dpe, (value) => `DPE ${value}`);
  return result;
}

// « Ce qui les distingue », dans les deux sens ; un côté sans rien à dire est omis.
export function differences(facts: ProspectingFileFacts): string[] {
  const wording = propertyWording(facts.kind);
  const distinct = distinctFacts(facts);
  const line = (owner: string, items: string[]): string | null =>
    items.length > 0 ? `*${capitalize(owner)}* : ${items.join(', ')}` : null;
  return [line(wording.ourOne, distinct.ours), line(wording.yourOne, distinct.theirs)].filter(
    (item): item is string => item !== null,
  );
}

import {
  LISTING_PORTAL_LABELS,
  extractListingKey,
} from '@/features/comparable-import/utils/extract-listing-key';
import type { CompetitorCandidate } from '@/features/competitor-search/types';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { DEMO_LISTING_HOST, DEMO_PORTAL } from '@/features/demo/constants';
import {
  EXPOSURE_LABELS,
  GENERAL_CONDITION_LABELS,
  HEATING_TYPE_LABELS,
  OUTDOOR_SPACE_LABELS,
  PARKING_TYPE_LABELS,
} from '@/features/subject-property/constants/property-options';
import {
  formatEuro,
  formatRelativeDay,
  formatRelativeSince,
  formatSquareMeters,
} from '@/lib/format';

// Mission 152 (partie B) — la fiche complète d'un bien, pour le conseiller SEUL, pour qu'il soit
// sûr des biens qu'il propose (Jean-Guy, 11/11) : toutes les photos, le prix et ses dates, toutes
// les caractéristiques connues (une absente n'a pas de case, jamais « — »), le texte complet, et
// « Voir l'annonce en ligne ↗ » pour un bien qui n'est pas de l'agence. Rien n'en part vers un
// acquéreur. Pur : les mêmes faits, d'où qu'ils viennent (une annonce du marché, un concurrent, un
// mandat de l'agence, un bien d'une sélection).

export type SheetOrigin = 'agency' | 'competitor' | 'market';

export type SheetFacts = {
  label: string;
  origin: SheetOrigin;
  photos: string[];
  price: number | null;
  // Le jour où ce prix a été vu affiché (relevé, recherche) ; null pour un mandat.
  priceSeenOn: string | null;
  // La date de mise en vente que l'annonce publie (M47) — jamais le premier passage de Stream
  // Estate, qui n'est pas la date du portail (M101).
  listedSince: string | null;
  // À défaut : la plus ancienne date connue du bien sur le marché (M129), dite « vu sur le marché ».
  seenOnMarketSince: string | null;
  knownDrops: number;
  propertyType: string | null;
  surfaceArea: number | null;
  landArea: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  bathroomsCount: number | null;
  energyRating: string | null;
  gesRating: string | null;
  outdoorSpaces: string[];
  parkingTypes: string[];
  hasPool: boolean | null;
  hasElevator: boolean | null;
  floor: number | null;
  heatingType: string | null;
  constructionYear: number | null;
  generalCondition: string | null;
  exposure: string | null;
  // Les points forts d'un mandat de l'agence (M44).
  strengths: string[];
  description: string | null;
  // L'adresse de l'annonce : seulement pour un bien qui n'est pas de l'agence.
  listingUrl: string | null;
};

export type SheetCharacteristic = { label: string; value: string };

export type PropertySheet = {
  label: string;
  // Un mandat de l'agence : « La description », pas « Le texte de l'annonce », et aucun lien.
  fromAgency: boolean;
  // « Dans l'agence », « Concurrent · SeLoger », « Marché · SeLoger ».
  originLabel: string;
  photos: string[];
  price: number | null;
  // « affiché le 10/11 · en vente depuis le 14/09 · 1 baisse connue ».
  priceLine: string | null;
  characteristics: SheetCharacteristic[];
  strengths: string[];
  description: string | null;
  // « Voir l'annonce en ligne ↗ » : un bien qui n'est pas de l'agence, une adresse http(s) qui
  // mène à un portail (jamais celle d'une annonce de démonstration, qui ne se résout pas, M114).
  onlineUrl: string | null;
};

const ORIGIN_LABELS: Record<SheetOrigin, string> = {
  agency: 'Dans l’agence',
  competitor: 'Concurrent',
  market: 'Marché',
};

export const SHEET_TEXT_MAX = 8_000;

// Le bouton du portail, lu avec le texte (« Voir plus »), n'est pas une coupure (mesure §2).
export function cleanListingText(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw
    .replace(/\s*(?:voir plus|lire la suite)\s*\.?\s*$/i, '')
    .trim()
    .slice(0, SHEET_TEXT_MAX);
  return text === '' ? null : text;
}

export function httpsPhotos(values: readonly unknown[], max = 40): string[] {
  const photos: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string' || value.length > 2_000) continue;
    // https, ou un chemin de l'application (les photos de la démo) — jamais « //autre-hôte/… ».
    const local = value.startsWith('/') && !value.startsWith('//');
    if (!value.startsWith('https://') && !local) continue;
    if (!photos.includes(value)) photos.push(value);
    if (photos.length === max) break;
  }
  return photos;
}

function onlineUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const host = url.hostname.toLowerCase();
    if (host === DEMO_LISTING_HOST || host.endsWith(`.${DEMO_LISTING_HOST}`)) return null;
    return url.href;
  } catch {
    return null;
  }
}

// Le portail d'une annonce, nommé (« SeLoger ») ; celui de la démonstration ne se nomme pas.
export function portalOf(url: string | null): string | null {
  if (!url) return null;
  const identity = extractListingKey(url);
  if (!identity || identity.portal === DEMO_PORTAL) return null;
  return LISTING_PORTAL_LABELS[identity.portal] ?? null;
}

function listed<T extends string>(
  values: readonly string[],
  labels: Record<T, string>,
): string | null {
  const known = values.filter(
    (value): value is T => value !== 'none' && Object.hasOwn(labels, value),
  );
  if (known.length > 0) return known.map((value) => labels[value]).join(', ');
  // Dit absent par l'annonce : c'est un fait connu (M118), pas une case vide.
  return values.includes('none') ? 'Aucun' : null;
}

function labelOf<T extends string>(value: string | null, labels: Record<T, string>): string | null {
  if (value == null || value === 'unknown') return null;
  return Object.hasOwn(labels, value) ? labels[value as T] : null;
}

// La recherche dit parfois « une place » sans dire laquelle : elle reste « place de stationnement ».
const SHEET_PARKING_LABELS: Record<string, string> = {
  ...PARKING_TYPE_LABELS,
  place: 'Place de stationnement',
};

function floorLabel(floor: number | null, house: boolean): string | null {
  if (floor == null || !Number.isFinite(floor)) return null;
  if (floor <= 0) return house ? 'Plain-pied' : 'Rez-de-chaussée';
  return floor === 1 ? '1er étage' : `${floor}e étage`;
}

const yesNo = (value: boolean | null): string | null =>
  value == null ? null : value ? 'Oui' : 'Non';

const rating = (value: string | null): string | null =>
  value != null && /^[A-G]$/.test(value.trim().toUpperCase()) ? value.trim().toUpperCase() : null;

export function sheetCharacteristics(facts: SheetFacts): SheetCharacteristic[] {
  const house = normalizePropertyType(facts.propertyType) === 'house';
  const dpe = rating(facts.energyRating);
  const ges = rating(facts.gesRating);
  const entries: [string, string | null][] = [
    [
      'Surface',
      facts.surfaceArea != null ? formatSquareMeters(Math.round(facts.surfaceArea)) : null,
    ],
    // M48 — le terrain se dit pour une maison.
    [
      'Terrain',
      house && facts.landArea != null ? formatSquareMeters(Math.round(facts.landArea)) : null,
    ],
    ['Pièces', facts.roomsCount != null ? String(facts.roomsCount) : null],
    ['Chambres', facts.bedroomsCount != null ? String(facts.bedroomsCount) : null],
    ['Salles de bains', facts.bathroomsCount != null ? String(facts.bathroomsCount) : null],
    [dpe && ges ? 'DPE · GES' : dpe ? 'DPE' : 'GES', dpe && ges ? `${dpe} · ${ges}` : (dpe ?? ges)],
    ['Extérieur', listed(facts.outdoorSpaces, OUTDOOR_SPACE_LABELS)],
    ['Stationnement', listed(facts.parkingTypes, SHEET_PARKING_LABELS)],
    ['Piscine', yesNo(facts.hasPool)],
    ['Étage', floorLabel(facts.floor, house)],
    ['Ascenseur', house ? null : yesNo(facts.hasElevator)],
    ['Chauffage', labelOf(facts.heatingType, HEATING_TYPE_LABELS)],
    ['Construction', facts.constructionYear != null ? String(facts.constructionYear) : null],
    ['État', labelOf(facts.generalCondition, GENERAL_CONDITION_LABELS)],
    ['Exposition', labelOf(facts.exposure, EXPOSURE_LABELS)],
  ];
  return entries
    .filter((entry): entry is [string, string] => entry[1] != null && entry[1] !== '')
    .map(([label, value]) => ({ label, value }));
}

export function buildPropertySheet(facts: SheetFacts, now: Date = new Date()): PropertySheet {
  const external = facts.origin !== 'agency';
  const url = external ? onlineUrl(facts.listingUrl) : null;
  const portal = external ? portalOf(facts.listingUrl) : null;
  const priceLine = [
    facts.price != null && facts.priceSeenOn
      ? `affiché ${formatRelativeDay(facts.priceSeenOn, now)}`
      : null,
    facts.listedSince
      ? `en vente ${formatRelativeSince(facts.listedSince, now)}`
      : facts.seenOnMarketSince
        ? `vu sur le marché ${formatRelativeSince(facts.seenOnMarketSince, now)}`
        : null,
    facts.knownDrops > 0
      ? `${facts.knownDrops} baisse${facts.knownDrops > 1 ? 's' : ''} de prix connue${facts.knownDrops > 1 ? 's' : ''}`
      : null,
  ].filter((part): part is string => part != null);
  return {
    label: facts.label,
    fromAgency: !external,
    originLabel: [ORIGIN_LABELS[facts.origin], portal].filter(Boolean).join(' · '),
    photos: facts.photos,
    price: facts.price,
    priceLine: priceLine.length > 0 ? priceLine.join(' · ') : null,
    characteristics: sheetCharacteristics(facts),
    strengths: facts.strengths.filter((strength) => strength.trim() !== ''),
    description: cleanListingText(facts.description),
    onlineUrl: url,
  };
}

// Le prix d'un bien en euros, pour la fiche (« 735 000 € »).
export const sheetPrice = (price: number | null): string | null =>
  price != null ? formatEuro(price) : null;

const parisDayOf = (iso: string | null | undefined): string | null =>
  typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null;

const featureList = (values: string[] | null | undefined): string[] => values ?? [];

// Une annonce du marché, telle que la recherche (ou la veille) l'a rendue : ses photos d'origine
// (sinon les copies de Stream Estate), son texte, la plus ancienne date connue du bien.
export function sheetFactsFromCandidate(
  candidate: CompetitorCandidate,
  label: string,
  seenOn: string | null,
): SheetFacts {
  const facts = candidate.features;
  const streamEstate = candidate.streamEstate;
  const original = streamEstate?.originalPhotos ?? [];
  const parking = facts?.parking ?? null;
  return {
    label,
    origin: 'market',
    photos: httpsPhotos(original.length > 0 ? original : candidate.photoUrls),
    price: candidate.price,
    priceSeenOn: seenOn,
    listedSince: null,
    seenOnMarketSince: parisDayOf(streamEstate?.firstKnownAt ?? streamEstate?.onlineSince),
    knownDrops: Array.isArray(streamEstate?.priceDrops) ? streamEstate.priceDrops.length : 0,
    propertyType: candidate.propertyType,
    surfaceArea: candidate.surfaceArea,
    landArea: candidate.landArea,
    roomsCount: candidate.roomsCount,
    bedroomsCount: streamEstate?.bedrooms ?? null,
    bathroomsCount: null,
    energyRating: candidate.energyClass ?? null,
    gesRating: null,
    outdoorSpaces: [
      ...featureList(facts?.outdoor?.present),
      ...(facts?.outdoor && facts.outdoor.present.length === 0 && facts.outdoor.absent.length > 0
        ? ['none']
        : []),
    ],
    parkingTypes:
      parking == null ? [] : parking.map((family) => (family === 'box' ? 'closed_box' : family)),
    hasPool: facts?.hasPool ?? null,
    hasElevator: facts?.hasElevator ?? null,
    floor: facts?.floor ?? null,
    heatingType: null,
    constructionYear: facts?.constructionYear ?? null,
    generalCondition: facts?.condition ?? null,
    exposure: facts?.exposure ?? null,
    strengths: [],
    description: streamEstate?.description ?? null,
    listingUrl: candidate.url,
  };
}

export function sheetFromCandidate(
  candidate: CompetitorCandidate,
  label: string,
  seenOn: string | null,
  now: Date = new Date(),
): PropertySheet {
  return buildPropertySheet(sheetFactsFromCandidate(candidate, label, seenOn), now);
}

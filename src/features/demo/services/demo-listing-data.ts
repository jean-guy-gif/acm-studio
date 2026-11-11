import type { ImportedComparableData } from '@/features/comparable-import/types';
import type { RawLocatorEntry } from '@/features/competitor-locator/types';
import { demoCommuneByCode } from '@/features/demo/data/communes';
import type { DemoListing, DemoScenario, DemoSubject } from '@/features/demo/data/types';
import { DEMO_SOURCE_LABEL } from '@/features/demo/constants';
import {
  demoListingUrl,
  demoPhotoUrl,
  demoSubjectListingUrl,
} from '@/features/demo/services/demo-urls';

// Mission 114 — ce qu'un bien de démonstration DIT, dans les formes que le reste de l'outil lit
// déjà : les données d'une annonce lue (`ImportedComparableData`, comme un lecteur de portail), la
// réponse du Localisateur (`RawLocatorEntry`, revalidée par le même schéma), et le bien tel que
// l'API Stream Estate le renvoie (un membre « hydra » relu par le même schéma zod). Rien n'est
// calculé ailleurs : la démo entre dans les chemins existants, elle ne les double pas.

const DAY_MS = 86_400_000;

const daysAgo = (now: Date, days: number): string =>
  new Date(now.getTime() - days * DAY_MS).toISOString();

const dateOnly = (iso: string): string => iso.slice(0, 10);

export function demoPostalCode(inseeCode: string): string | null {
  return demoCommuneByCode(inseeCode)?.codesPostaux[0] ?? null;
}

export function demoCityName(inseeCode: string): string | null {
  return demoCommuneByCode(inseeCode)?.nom ?? null;
}

// « 12 allée des Démonstrations, 06600 Antibes » — l'adresse fictive, telle que le Localisateur
// la rendrait (M75) et telle qu'un courrier l'écrirait (M108).
export function demoAddressLine(
  item: Pick<DemoListing, 'address' | 'inseeCode'> | Pick<DemoSubject, 'address' | 'inseeCode'>,
): string {
  const commune = demoCommuneByCode(item.inseeCode);
  return `${item.address.number} ${item.address.street}, ${commune ? `${commune.codesPostaux[0]} ${commune.nom}` : ''}`.trim();
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'Etat : neuf',
  excellent: 'Etat : très bon',
  good: 'Etat : bon',
  to_refresh: 'Etat : à rafraîchir',
  to_renovate: 'Etat : à rénover',
  major_renovation: 'Etat : gros travaux',
};

const EXPOSURE_LABELS: Record<string, string> = {
  north: 'Exposition nord',
  north_east: 'Exposition nord-est',
  east: 'Exposition est',
  south_east: 'Exposition sud-est',
  south: 'Exposition sud',
  south_west: 'Exposition sud-ouest',
  west: 'Exposition ouest',
  north_west: 'Exposition nord-ouest',
};

const OUTDOOR_LABELS: Record<string, string> = {
  balcony: 'Balcon',
  terrace: 'Terrasse',
  garden: 'Jardin',
  loggia: 'Loggia',
  veranda: 'Véranda',
};

const PARKING_LABELS: Record<string, string> = {
  garage: '1 parking: Garage',
  closed_box: '1 parking: Box de stationnement',
  indoor_parking: '1 parking: Parking',
  outdoor_parking: '1 parking: Parking',
  carport: '1 parking: Parking',
};

// Les étiquettes courtes qu'un portail publierait, dans les formes ENTIÈRES que lit
// `readStreamEstateFeatures` (services/stream-estate-features.ts). Rien d'autre.
export function demoFeatureLabels(listing: DemoListing): string[] {
  return [
    ...listing.outdoorSpaces.map((space) => OUTDOOR_LABELS[space]).filter(Boolean),
    ...listing.parkingTypes.map((type) => PARKING_LABELS[type]).filter(Boolean),
    listing.hasPool === true ? 'Piscine' : listing.hasPool === false ? 'Sans piscine' : null,
    listing.hasElevator === true ? 'Ascenseur' : null,
    listing.generalCondition ? CONDITION_LABELS[listing.generalCondition] : null,
    listing.exposure ? EXPOSURE_LABELS[listing.exposure] : null,
    listing.constructionYear != null ? `Année de construction: ${listing.constructionYear}` : null,
  ].filter((label): label is string => typeof label === 'string' && label !== '');
}

const listedOutdoor = (spaces: string[]): string[] => spaces.filter((space) => space !== 'none');
const listedParking = (types: string[]): string[] => types.filter((type) => type !== 'none');

// L'annonce d'un concurrent, telle qu'un lecteur de portail l'aurait lue (M83 : vendeur et
// exclusivité avec leur provenance ; une agence sans mention d'exclusivité = mandat simple).
export function demoImportedData(listing: DemoListing, now: Date): ImportedComparableData {
  const soldByAgency = listing.seller.agencyName != null;
  return {
    title: listing.title,
    listingUrl: demoListingUrl(listing),
    source: DEMO_SOURCE_LABEL,
    address: null,
    postalCode: demoPostalCode(listing.inseeCode),
    city: demoCityName(listing.inseeCode),
    district: listing.district,
    surfaceArea: listing.surfaceArea,
    landArea: listing.landArea,
    roomsCount: listing.roomsCount,
    bedroomsCount: listing.bedroomsCount,
    bathroomsCount: listing.bathroomsCount,
    energyRating: listing.energyRating,
    gesRating: listing.gesRating,
    constructionYear: listing.constructionYear,
    heatingType: listing.heatingType,
    energySource: null,
    price: listing.price,
    portalPricePerSquareMeter: Math.round(listing.price / listing.surfaceArea),
    floor: listing.floor,
    floorsCount: listing.floorsCount,
    listingDescription: listing.description,
    listingFeatures: demoFeatureLabels(listing),
    outdoorSuggestions: [],
    photoUrls: listing.photos.map(demoPhotoUrl),
    generalCondition: listing.generalCondition,
    exposure: listing.exposure,
    outdoorSpaces: listedOutdoor(listing.outdoorSpaces),
    parkingTypes: listedParking(listing.parkingTypes),
    listingPublishedAt: dateOnly(daysAgo(now, listing.publishedDaysAgo)),
    daysOnMarket: listing.publishedDaysAgo,
    publicationLowerBoundLabel: null,
    modifiedAt: null,
    viewCount: null,
    viewCountSince: null,
    soldBy: soldByAgency ? 'agency' : null,
    soldBySource: soldByAgency ? 'advertiser' : null,
    exclusivity: soldByAgency ? listing.seller.exclusivity : null,
    exclusivitySource: soldByAgency
      ? listing.seller.exclusivity === 'yes'
        ? 'badge'
        : 'no_mention'
      : null,
  };
}

// L'annonce du bien vendeur d'un scénario : ce que « Importer une annonce » lit. Le prix affiché
// reste une information (M38) : c'est le mapper du bien vendeur qui le garde hors des champs.
export function demoSubjectImportedData(scenario: DemoScenario, now: Date): ImportedComparableData {
  const { subject } = scenario;
  return {
    title: subject.title,
    listingUrl: demoSubjectListingUrl(scenario.id),
    source: DEMO_SOURCE_LABEL,
    address: `${subject.address.number} ${subject.address.street}`,
    postalCode: subject.postalCode,
    city: demoCityName(subject.inseeCode),
    district: subject.district,
    surfaceArea: subject.surfaceArea,
    landArea: subject.landArea,
    roomsCount: subject.roomsCount,
    bedroomsCount: subject.bedroomsCount,
    bathroomsCount: subject.bathroomsCount,
    energyRating: subject.energyRating,
    gesRating: subject.gesRating,
    constructionYear: subject.constructionYear,
    heatingType: subject.heatingType,
    energySource: null,
    price: subject.listedPrice,
    portalPricePerSquareMeter: Math.round(subject.listedPrice / subject.surfaceArea),
    floor: subject.floor,
    floorsCount: subject.floorsCount,
    listingDescription: subject.description,
    listingFeatures: [],
    outdoorSuggestions: [],
    photoUrls: subject.photos.map(demoPhotoUrl),
    generalCondition: subject.generalCondition,
    exposure: subject.exposure,
    outdoorSpaces: listedOutdoor(subject.outdoorSpaces),
    parkingTypes: listedParking(subject.parkingTypes),
    listingPublishedAt: dateOnly(daysAgo(now, 10)),
    daysOnMarket: 10,
    publicationLowerBoundLabel: null,
    modifiedAt: null,
    viewCount: null,
    viewCountSince: null,
    soldBy: 'agency',
    soldBySource: 'advertiser',
    exclusivity: 'yes',
    exclusivitySource: 'badge',
  };
}

// La réponse du Localisateur pour un concurrent (M75) : une adresse CONFIRMÉE, avec son étiquette
// et sa source d'origine ; revalidée par `parseLocatorProperty` comme une vraie réponse.
export function demoLocatorEntry(listing: DemoListing, now: Date): RawLocatorEntry {
  return {
    listingUrl: demoListingUrl(listing),
    raw: {
      etat: 'pret',
      etiquette: 'Adresse confirmée',
      etiquetteCle: 'confirmee',
      adresse: demoAddressLine(listing),
      source: listing.propertyType === 'apartment' ? 'copropriete' : 'terrain',
      confirme: true,
      bienId: `demo-${listing.id}`,
      lat: listing.location.lat,
      lon: listing.location.lon,
      analyseLe: now.toISOString(),
    },
  };
}

// Le bien tel que l'API Stream Estate le renvoie (un membre « hydra » : services/stream-estate.ts).
// `crawledAt` : le dernier passage du robot, dans les 7 jours — l'annonce d'origine est utilisable.
export function demoStreamEstateProperty(listing: DemoListing, now: Date, crawledAt: string) {
  const commune = demoCommuneByCode(listing.inseeCode);
  const url = demoListingUrl(listing);
  return {
    uuid: `demo-${listing.id}`,
    title: listing.title,
    propertyType: listing.propertyType === 'apartment' ? 0 : 1,
    price: listing.price,
    surface: listing.surfaceArea,
    landSurface: listing.landArea,
    room: listing.roomsCount,
    bedroom: listing.bedroomsCount,
    pricePerMeter: Math.round(listing.price / listing.surfaceArea),
    createdAt: daysAgo(now, listing.publishedDaysAgo),
    lastCrawledAt: crawledAt,
    pictures: listing.photos.map(demoPhotoUrl),
    // Mission 152 (partie B) — la démo donne, comme l'API, le texte et les photos d'origine.
    picturesRemote: listing.photos.map(demoPhotoUrl),
    description: listing.description,
    city: { name: commune?.nom ?? null, insee: listing.inseeCode },
    location: { lat: listing.location.lat, lon: listing.location.lon },
    floor: listing.floor,
    elevator: listing.hasElevator,
    adverts: [
      {
        url,
        title: listing.title,
        expired: false,
        lastCrawledAt: crawledAt,
        floor: listing.floor,
        elevator: listing.hasElevator,
        constructionYear: listing.constructionYear,
        features: demoFeatureLabels(listing),
        energy: listing.energyRating ? { category: listing.energyRating } : null,
        events: listing.priceChanges.map((change) => ({
          createdAt: daysAgo(now, change.daysAgo),
          fieldName: 'price',
          percentVariation: Math.round(((change.to - change.from) / change.from) * 1000) / 10,
          fieldOldValue: change.from,
          fieldNewValue: change.to,
        })),
      },
    ],
  };
}

import {
  elevatorFromLabels,
  poolFromLabels,
} from '@/features/competitor-search/services/stream-estate-features';
import { idealLabel } from '@/features/ideal-properties/services/ideal-label';
import { httpsPhotos, type SheetFacts } from '@/features/property-sheet/services/property-sheet';

// Mission 152 (partie B) — d'où vient chaque fiche complète : une ligne de concurrent (`comparables`),
// un mandat de l'agence (`subject_properties`), un bien d'une sélection (`buyer_selection_items` :
// ce que l'import en a lu, sinon ce que la recherche en a dit). Le titre, l'adresse, « Vendu par »
// et l'exclusivité ne sont jamais lus : le libellé neutre (M107) les remplace. Pur.

export type CompetitorSheetRow = {
  property_type: string | null;
  rooms_count: number | null;
  surface_area: number | null;
  city: string | null;
  land_area: number | null;
  bedrooms_count: number | null;
  bathrooms_count: number | null;
  energy_rating: string | null;
  ges_rating: string | null;
  outdoor_spaces: string[] | null;
  parking_types: string[] | null;
  heating_type: string | null;
  construction_year: number | null;
  general_condition: string | null;
  exposure: string | null;
  listing_features: unknown;
  listing_description: string | null;
  listing_published_at: string | null;
  listing_url: string | null;
  photo_urls: unknown;
  price: number | null;
  price_drop_amount: number | null;
  first_seen_on: string | null;
  created_at: string;
};

export type ObservedPrice = { observed_on: string; price: number };

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
const num = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};
const bool = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);
const record = (value: unknown): Record<string, unknown> | null =>
  value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const day = (value: unknown): string | null =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

// Les baisses connues : chaque relevé daté plus bas que le précédent (M47) ; à défaut, la baisse
// écrite sur la fiche (M101).
export function knownDrops(observations: ObservedPrice[], fallbackDrop: number | null): number {
  const sorted = [...observations].sort((a, b) => a.observed_on.localeCompare(b.observed_on));
  let drops = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    if (Number(sorted[index].price) < Number(sorted[index - 1].price)) drops += 1;
  }
  return drops > 0 ? drops : fallbackDrop != null && fallbackDrop > 0 ? 1 : 0;
}

export function sheetFactsFromCompetitor(
  row: CompetitorSheetRow,
  observations: ObservedPrice[],
): SheetFacts {
  const labels = strings(row.listing_features);
  const sorted = [...observations].sort((a, b) => a.observed_on.localeCompare(b.observed_on));
  const last = sorted.at(-1) ?? null;
  return {
    label: idealLabel({
      propertyType: row.property_type,
      roomsCount: row.rooms_count,
      surfaceArea: num(row.surface_area),
      city: row.city,
    }),
    origin: 'competitor',
    photos: httpsPhotos(strings(row.photo_urls)),
    price: num(row.price),
    // Le dernier relevé daté (M47), sinon le jour de l'import.
    priceSeenOn: last?.observed_on ?? day(row.created_at),
    listedSince: day(row.listing_published_at),
    seenOnMarketSince: day(row.first_seen_on),
    knownDrops: knownDrops(sorted, num(row.price_drop_amount)),
    propertyType: row.property_type,
    surfaceArea: num(row.surface_area),
    landArea: num(row.land_area),
    roomsCount: row.rooms_count,
    bedroomsCount: row.bedrooms_count,
    bathroomsCount: row.bathrooms_count,
    energyRating: row.energy_rating,
    gesRating: row.ges_rating,
    outdoorSpaces: row.outdoor_spaces ?? [],
    parkingTypes: row.parking_types ?? [],
    hasPool: poolFromLabels(labels),
    hasElevator: elevatorFromLabels(labels),
    floor: null,
    heatingType: row.heating_type,
    constructionYear: row.construction_year,
    generalCondition: row.general_condition,
    exposure: row.exposure,
    strengths: [],
    description: row.listing_description,
    listingUrl: row.listing_url,
  };
}

export type MandateSheetRow = {
  property_type: string | null;
  rooms_count: number | null;
  surface_area: number | null;
  city: string | null;
  land_area: number | null;
  bedrooms_count: number | null;
  bathrooms_count: number | null;
  energy_rating: string | null;
  ges_rating: string | null;
  outdoor_spaces: string[] | null;
  parking_types: string[] | null;
  has_pool: boolean | null;
  has_elevator: boolean | null;
  floor: number | null;
  heating_type: string | null;
  construction_year: number | null;
  general_condition: string | null;
  exposure: string | null;
  strengths: string[] | null;
  description: string | null;
};

// Un mandat de l'agence : ses photos (liens signés), sa description, ses points forts ; son prix de
// commercialisation. Pas d'annonce publiée : ni date d'affichage, ni lien.
export function sheetFactsFromMandate(
  row: MandateSheetRow,
  photos: string[],
  price: number | null,
): SheetFacts {
  return {
    label: idealLabel({
      propertyType: row.property_type,
      roomsCount: row.rooms_count,
      surfaceArea: num(row.surface_area),
      city: row.city,
    }),
    origin: 'agency',
    photos,
    price,
    priceSeenOn: null,
    listedSince: null,
    seenOnMarketSince: null,
    knownDrops: 0,
    propertyType: row.property_type,
    surfaceArea: num(row.surface_area),
    landArea: num(row.land_area),
    roomsCount: row.rooms_count,
    bedroomsCount: row.bedrooms_count,
    bathroomsCount: row.bathrooms_count,
    energyRating: row.energy_rating,
    gesRating: row.ges_rating,
    outdoorSpaces: row.outdoor_spaces ?? [],
    parkingTypes: row.parking_types ?? [],
    hasPool: row.has_pool,
    hasElevator: row.has_elevator,
    floor: row.floor,
    heatingType: row.heating_type,
    constructionYear: row.construction_year,
    generalCondition: row.general_condition,
    exposure: row.exposure,
    strengths: row.strengths ?? [],
    description: row.description,
    listingUrl: null,
  };
}

// Une annonce du marché retenue dans une sélection : ce que l'import par l'extension en a lu
// (texte et photos compris), sinon ce que la recherche en a dit (M118).
export function sheetFactsFromSelectionListing(item: {
  label: string;
  reference: string;
  listedPrice: number | null;
  priceSeenOn: string | null;
  imported: unknown;
  snapshot: unknown;
}): SheetFacts {
  const imported = record(item.imported);
  const snapshot = record(item.snapshot);
  const features = record(snapshot?.features);
  const outdoor = record(features?.outdoor);
  const streamEstate = record(snapshot?.streamEstate);
  const importedLabels = imported ? strings(imported.listingFeatures) : [];
  const originalPhotos = strings(streamEstate?.originalPhotos);
  const photos = imported
    ? strings(imported.photoUrls)
    : originalPhotos.length > 0
      ? originalPhotos
      : strings(snapshot?.photoUrls);
  const snapshotParking = features?.parking == null ? [] : strings(features.parking);
  return {
    label: item.label,
    origin: 'market',
    photos: httpsPhotos(photos),
    price: item.listedPrice,
    priceSeenOn: item.priceSeenOn,
    listedSince: day(imported?.listingPublishedAt),
    seenOnMarketSince: day(streamEstate?.firstKnownAt ?? streamEstate?.onlineSince),
    knownDrops: Array.isArray(streamEstate?.priceDrops)
      ? streamEstate.priceDrops.filter((value) => typeof value === 'number').length
      : 0,
    propertyType: str(imported?.propertyType) ?? str(snapshot?.propertyType),
    surfaceArea: num(imported?.surfaceArea) ?? num(snapshot?.surfaceArea),
    landArea: num(imported?.landArea) ?? num(snapshot?.landArea),
    roomsCount: num(imported?.roomsCount) ?? num(snapshot?.roomsCount),
    bedroomsCount: num(imported?.bedroomsCount) ?? num(streamEstate?.bedrooms),
    bathroomsCount: num(imported?.bathroomsCount),
    energyRating: str(imported?.energyRating) ?? str(snapshot?.energyClass),
    gesRating: str(imported?.gesRating),
    outdoorSpaces: imported
      ? strings(imported.outdoorSpaces)
      : [
          ...strings(outdoor?.present),
          ...(strings(outdoor?.present).length === 0 && strings(outdoor?.absent).length > 0
            ? ['none']
            : []),
        ],
    parkingTypes: imported
      ? strings(imported.parkingTypes)
      : snapshotParking.map((family) => (family === 'box' ? 'closed_box' : family)),
    hasPool: poolFromLabels(importedLabels) ?? bool(features?.hasPool),
    hasElevator: elevatorFromLabels(importedLabels) ?? bool(features?.hasElevator),
    floor: num(imported?.floor) ?? num(features?.floor),
    heatingType: str(imported?.heatingType),
    constructionYear: num(imported?.constructionYear) ?? num(features?.constructionYear),
    generalCondition: str(imported?.generalCondition) ?? str(features?.condition),
    exposure: str(imported?.exposure) ?? str(features?.exposure),
    strengths: [],
    description: str(imported?.listingDescription) ?? str(streamEstate?.description),
    listingUrl: item.reference,
  };
}

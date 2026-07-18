import type { ExtractedParts } from '@/features/comparable-import/services/extract-listing-data';
import type {
  ImportedComparableData,
  PartialListingData,
} from '@/features/comparable-import/types';
import { deduplicatePhotoUrls } from '@/features/comparable-import/utils/deduplicate-photo-urls';
import { isGenericImageUrl, isGenericTitle } from '@/features/comparable-import/utils/is-generic';

type ScalarField = Exclude<
  keyof ImportedComparableData,
  'listingUrl' | 'photoUrls' | 'listingFeatures' | 'source' | 'title'
>;

const SCALAR_FIELDS: ScalarField[] = [
  'address',
  'postalCode',
  'city',
  'district',
  'surfaceArea',
  'landArea',
  'roomsCount',
  'bedroomsCount',
  'bathroomsCount',
  'energyRating',
  'gesRating',
  'constructionYear',
  'heatingType',
  'energySource',
  'price',
  'portalPricePerSquareMeter',
  'listingDescription',
];

// Fields advertised in the found/missing summary.
const SUMMARY_FIELDS: Array<ScalarField | 'title'> = [
  'title',
  'price',
  'portalPricePerSquareMeter',
  'surfaceArea',
  'roomsCount',
  'bedroomsCount',
  'bathroomsCount',
  'city',
  'district',
  'energyRating',
  'gesRating',
  'listingDescription',
];

function pickScalar(field: ScalarField, sources: PartialListingData[]): string | number | null {
  for (const source of sources) {
    const value = source[field];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return null;
}

function pickTitle(sources: PartialListingData[], source: string): string | null {
  for (const candidate of sources) {
    const value = candidate.title;
    if (typeof value === 'string' && value.trim() !== '' && !isGenericTitle(value, source)) {
      return value.trim();
    }
  }
  return null;
}

function num(value: string | number | null): number | null {
  return typeof value === 'number' ? value : null;
}
function str(value: string | number | null): string | null {
  return typeof value === 'string' ? value : null;
}

// Builds the editable feature lines from the genuine portal characteristics
// only. Structured values (price/m², GES, year, heating, energy, district) live
// in their own dedicated columns and must NOT be duplicated here.
function buildFeatures(sources: PartialListingData[]): string[] {
  const features: string[] = [];
  for (const source of sources) {
    for (const feature of source.listingFeatures ?? []) {
      if (feature.trim() !== '') {
        features.push(feature.trim());
      }
    }
  }
  return [...new Set(features)];
}

export function normalizeListingData(
  parts: ExtractedParts,
  listingUrl: string,
  source: string,
): { data: ImportedComparableData; foundFields: string[]; missingFields: string[] } {
  // Priority: portal extractor > JSON-LD > Open Graph > HTML.
  const ordered: PartialListingData[] = [parts.portal, parts.jsonLd, parts.openGraph, parts.html];

  const merged = {} as Record<ScalarField, string | number | null>;
  for (const field of SCALAR_FIELDS) {
    merged[field] = pickScalar(field, ordered);
  }

  const combinedPhotos = [
    ...(parts.portal.photoUrls ?? []),
    ...(parts.jsonLd.photoUrls ?? []),
    ...(parts.openGraph.photoUrls ?? []),
    ...(parts.html.photoUrls ?? []),
  ].filter((url) => !isGenericImageUrl(url));
  const photoUrls = deduplicatePhotoUrls(combinedPhotos, listingUrl);

  const data: ImportedComparableData = {
    title: pickTitle(ordered, source),
    listingUrl,
    source,
    address: str(merged.address),
    postalCode: str(merged.postalCode),
    city: str(merged.city),
    district: str(merged.district),
    surfaceArea: num(merged.surfaceArea),
    landArea: num(merged.landArea),
    roomsCount: num(merged.roomsCount),
    bedroomsCount: num(merged.bedroomsCount),
    bathroomsCount: num(merged.bathroomsCount),
    energyRating: str(merged.energyRating),
    gesRating: str(merged.gesRating),
    constructionYear: num(merged.constructionYear),
    heatingType: str(merged.heatingType),
    energySource: str(merged.energySource),
    price: num(merged.price),
    portalPricePerSquareMeter: num(merged.portalPricePerSquareMeter),
    listingDescription: str(merged.listingDescription),
    listingFeatures: [],
    photoUrls,
  };
  // A description that is just the portal's generic slogan is not usable.
  if (data.listingDescription && isGenericTitle(data.listingDescription, source)) {
    data.listingDescription = null;
  }

  data.listingFeatures = buildFeatures(ordered);

  const foundFields: string[] = [];
  const missingFields: string[] = [];
  for (const field of SUMMARY_FIELDS) {
    if (data[field] !== null) {
      foundFields.push(field);
    } else {
      missingFields.push(field);
    }
  }
  if (photoUrls.length > 0) {
    foundFields.push('photoUrls');
  } else {
    missingFields.push('photoUrls');
  }

  return { data, foundFields, missingFields };
}

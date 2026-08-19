// Final normalised data offered to the advisor for prefill (never persisted directly).
export type ImportedComparableData = {
  title: string | null;
  listingUrl: string;
  source: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  district: string | null;
  surfaceArea: number | null;
  landArea: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  bathroomsCount: number | null;
  energyRating: string | null;
  gesRating: string | null;
  constructionYear: number | null;
  heatingType: string | null;
  energySource: string | null;
  price: number | null;
  // Price per m² as displayed by the portal (not recomputed by ACM).
  portalPricePerSquareMeter: number | null;
  listingDescription: string | null;
  listingFeatures: string[];
  photoUrls: string[];
  // Mission 24 — structured characteristics mapped deterministically from text.
  generalCondition: string | null;
  exposure: string | null;
  outdoorSpaces: string[];
  parkingTypes: string[];
  // Mission 33 — délai de commercialisation. La date vient de l'annonce
  // elle-même (le portail la publie) ; les jours en sont déduits à l'import.
  // Aucun tiers, aucun compte : voir utils/extract-listing-published-at.
  listingPublishedAt: string | null;
  daysOnMarket: number | null;
};

// Partial data produced by a single extractor before the priority merge.
// Every field is optional; extractors only set what they can prove.
export type PartialListingData = {
  title?: string | null;
  source?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  district?: string | null;
  surfaceArea?: number | null;
  landArea?: number | null;
  roomsCount?: number | null;
  bedroomsCount?: number | null;
  bathroomsCount?: number | null;
  energyRating?: string | null;
  gesRating?: string | null;
  constructionYear?: number | null;
  heatingType?: string | null;
  energySource?: string | null;
  price?: number | null;
  portalPricePerSquareMeter?: number | null;
  listingDescription?: string | null;
  listingFeatures?: string[];
  photoUrls?: string[];
  listingPublishedAt?: string | null;
};

export type ComparableImportResult =
  | {
      ok: true;
      data: ImportedComparableData;
      foundFields: string[];
      missingFields: string[];
    }
  | {
      ok: false;
      error: string;
    };

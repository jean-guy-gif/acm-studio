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
  // Mission 47 — formes d'ancienneté propres à chaque portail, mesurées :
  // borne basse textuelle (Bien'ici « plus de 2 mois »), date de modification
  // exacte (Bien'ici « Modifiée le … »), nombre de vues et date de départ du
  // comptage (Green Acres « Vu 269 fois depuis le … »).
  publicationLowerBoundLabel: string | null;
  modifiedAt: string | null;
  viewCount: number | null;
  viewCountSince: string | null;
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
  publicationLowerBoundLabel?: string | null;
  modifiedAt?: string | null;
  viewCount?: number | null;
  viewCountSince?: string | null;
};

// Mission 47 — ancienneté de l'annonce, dans l'ordre de fiabilité décroissant.
// La source est TOUJOURS nommée ; une borne basse ne devient jamais un nombre de
// jours (§5 du brief).
export type ListingAge =
  | { kind: 'exact'; publishedAt: string; days: number; source: string }
  | { kind: 'lowerBound'; label: string; source: string }
  | { kind: 'firstSeen'; firstSeenAt: string; days: number }
  | null;

// Baisse (ou hausse) CONSTATÉE entre deux observations ACM de la même annonce.
// Un constat, jamais une estimation ; `amount` > 0 = baisse.
export type ObservedPriceChange = {
  fromPrice: number;
  fromDate: string;
  toPrice: number;
  toDate: string;
  amount: number;
  percentage: number;
} | null;

export type ListingHistory = { age: ListingAge; priceChange: ObservedPriceChange };

export type ComparableImportResult =
  | {
      ok: true;
      data: ImportedComparableData;
      foundFields: string[];
      missingFields: string[];
      // Derived from the ACM observation store (Mission 47). Absent when the
      // listing has no identity (unmeasured portal) or no price was read.
      history?: ListingHistory | null;
    }
  | {
      ok: false;
      error: string;
    };

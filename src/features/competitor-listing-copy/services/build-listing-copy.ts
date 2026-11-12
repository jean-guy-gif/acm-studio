import {
  listingCopyFactsSchema,
  readListingCopyFacts,
  readListingCopyPhotos,
  type ListingCopyFacts,
} from '@/features/competitor-listing-copy/listing-copy';

// Ce que la copie garde d'un concurrent qui vient d'être créé, depuis la ligne écrite en base (la
// même pour l'import d'une page, la création depuis la recherche et la démo). Jamais le texte de
// l'annonce, le titre, l'adresse, le code postal, le lien, la note du conseiller ni « Vendu par »
// (M83, M107 ; Jean-Guy, 11/11) : le type d'entrée ne les connaît pas.
export type ListingCopySource = {
  price: number;
  photo_urls: string[];
  listing_features: string[];
  property_type?: string | null;
  surface_area: number | null;
  land_area: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  energy_rating: string | null;
  ges_rating: string | null;
  construction_year: number | null;
  heating_type: string | null;
  city: string | null;
  district: string | null;
  general_condition: string | null;
  exposure: string | null;
  outdoor_spaces: string[];
  parking_types: string[];
  listing_published_at: string | null;
  floor?: number | null;
  floors_count?: number | null;
  publication_lower_bound_label?: string | null;
  modified_at?: string | null;
};

export type ListingCopyRow = {
  price: number;
  photo_urls: string[];
  facts: ListingCopyFacts;
};

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildListingCopy(source: ListingCopySource): ListingCopyRow | null {
  if (!Number.isFinite(source.price) || source.price <= 0) return null;
  const candidate = {
    propertyType: text(source.property_type),
    surfaceArea: source.surface_area ?? undefined,
    landArea: source.land_area ?? undefined,
    roomsCount: source.rooms_count ?? undefined,
    bedroomsCount: source.bedrooms_count ?? undefined,
    floor: source.floor ?? undefined,
    floorsCount: source.floors_count ?? undefined,
    energyRating: text(source.energy_rating)?.toUpperCase(),
    gesRating: text(source.ges_rating)?.toUpperCase(),
    constructionYear: source.construction_year ?? undefined,
    generalCondition: text(source.general_condition),
    exposure: text(source.exposure),
    heatingType: text(source.heating_type),
    city: text(source.city),
    district: text(source.district),
    outdoorSpaces: source.outdoor_spaces.length > 0 ? source.outdoor_spaces : undefined,
    parkingTypes: source.parking_types.length > 0 ? source.parking_types : undefined,
    features:
      source.listing_features.length > 0
        ? source.listing_features.filter((feature) => feature.trim().length <= 80).slice(0, 40)
        : undefined,
    publishedAt: text(source.listing_published_at),
    publicationLowerBoundLabel: text(source.publication_lower_bound_label),
    modifiedAt: text(source.modified_at),
  };
  // Champ par champ : une valeur hors de sa forme est laissée de côté, les autres restent.
  const facts = readListingCopyFacts(
    Object.fromEntries(Object.entries(candidate).filter(([, value]) => value !== undefined)),
  );
  return {
    price: source.price,
    photo_urls: readListingCopyPhotos(source.photo_urls),
    facts: listingCopyFactsSchema.parse(facts),
  };
}

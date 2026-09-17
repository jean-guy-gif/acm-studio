import type { ComparableInput } from '@/features/comparables/utils/comparable-input';
import type { ImportedComparableData } from '@/features/comparable-import/types';

// MISSION 50 §8 — import en lot : on crée le concurrent DIRECTEMENT depuis les données
// importées, sans passer par le formulaire d'ajout (qui fait cette conversion en JSX).
// Le mapping est 1:1 (camelCase → snake_case) ; c'est le même contenu que le formulaire
// pré-rempli aurait produit. Le prix est REQUIS pour un concurrent : sans lui, on ne
// crée pas (l'appelant nomme la fiche en échec), on n'invente pas un zéro.
export function importedToComparableInput(data: ImportedComparableData): ComparableInput | null {
  if (data.price == null || data.price <= 0) {
    return null;
  }
  return {
    title: data.title,
    address: data.address,
    postal_code: data.postalCode,
    city: data.city,
    surface_area: data.surfaceArea,
    land_area: data.landArea,
    rooms_count: data.roomsCount,
    bedrooms_count: data.bedroomsCount,
    bathrooms_count: data.bathroomsCount,
    energy_rating: data.energyRating,
    ges_rating: data.gesRating,
    construction_year: data.constructionYear,
    heating_type: data.heatingType,
    energy_source: data.energySource,
    district: data.district,
    portal_price_per_square_meter: data.portalPricePerSquareMeter,
    listing_url: data.listingUrl,
    source: data.source,
    price: data.price,
    days_on_market: data.daysOnMarket,
    listing_published_at: data.listingPublishedAt,
    // La baisse de prix vient de l'historique d'observation, pas d'un import unique.
    price_drop_amount: null,
    price_drop_percentage: null,
    advisor_notes: null,
    photo_urls: data.photoUrls,
    listing_description: data.listingDescription,
    listing_features: data.listingFeatures,
    general_condition: data.generalCondition,
    exposure: data.exposure,
    outdoor_spaces: data.outdoorSpaces,
    parking_types: data.parkingTypes,
  };
}

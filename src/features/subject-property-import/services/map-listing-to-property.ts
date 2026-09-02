import type { ImportedComparableData } from '@/features/comparable-import/types';
import type { SubjectPropertyImport } from '@/features/subject-property-import/types';

// Pure mapping from the shared aspiration result to the seller-property prefill.
// The extraction itself is done by comparable-import (called, never duplicated);
// here we only route each field to the right place.
//
// GUARDRAIL (CLAUDE.md): a price read on the listing is INFORMATION for the
// advisor — it never lands in a form field, and it never pre-fills the advisor's
// range. The `prefill` therefore carries no price and no advisor range; the read
// price travels in `info` only. `title` is a headline, not a property type, so it
// is not mapped either. Photos are remote portal URLs, incompatible with the
// private storage bucket (Mission 37), so they are reported as a count only.
export function mapListingToProperty(data: ImportedComparableData): SubjectPropertyImport {
  return {
    prefill: {
      surface_area: data.surfaceArea,
      land_area: data.landArea,
      rooms_count: data.roomsCount,
      bedrooms_count: data.bedroomsCount,
      bathrooms_count: data.bathroomsCount,
      address: data.address,
      postal_code: data.postalCode,
      city: data.city,
      district: data.district,
      description: data.listingDescription,
      energy_rating: data.energyRating,
      ges_rating: data.gesRating,
      heating_type: data.heatingType,
      exposure: data.exposure,
      construction_year: data.constructionYear,
      general_condition: data.generalCondition,
      outdoor_spaces: data.outdoorSpaces,
      parking_types: data.parkingTypes,
    },
    info: {
      readPrice: data.price,
      readPortalPricePerSquareMeter: data.portalPricePerSquareMeter,
      detectedPhotoCount: data.photoUrls.length,
    },
  };
}

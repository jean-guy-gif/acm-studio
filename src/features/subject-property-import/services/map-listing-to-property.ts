import type { ImportedComparableData } from '@/features/comparable-import/types';
import { detectListingPropertyType } from '@/features/subject-property-import/services/detect-listing-property-type';
import { keepListValues } from '@/features/subject-property/services/list-values';
import { propertyTypeLabel } from '@/features/subject-property/services/property-type-choice';
import type { SubjectPropertyImport } from '@/features/subject-property-import/types';

// Pure mapping from the shared aspiration result to the seller-property prefill.
// The extraction itself is done by comparable-import (called, never duplicated);
// here we only route each field to the right place.
//
// GUARDRAIL (CLAUDE.md): a price read on the listing is INFORMATION for the
// advisor — it never lands in a form field, and it never pre-fills the advisor's
// range. The `prefill` therefore carries no price and no advisor range; the read
// price travels in `info` only. The `title` itself is a headline and is never
// written anywhere; only the property type it (or the listing address) names
// without ambiguity is kept, as a list label (Mission 77). Photos are remote
// portal URLs, incompatible with the private storage bucket (Mission 37), so they
// are reported as a count only.
//
// MISSION 78 — a list field (heating, exposure, condition, GES, outdoor, parking) only ever
// receives a value OF its list: the heating read on the listing (« gaz individuel ») is
// translated, and anything that is not recognised stays empty (`keepListValues`).
export function mapListingToProperty(data: ImportedComparableData): SubjectPropertyImport {
  return {
    prefill: keepListValues(
      {
        // A listing carries no factual costs or strengths — those fields exist for the
        // brochure import (Mission 44) and stay empty here.
        property_type: propertyTypeLabel(detectListingPropertyType(data.title, data.listingUrl)),
        surface_area: data.surfaceArea,
        land_area: data.landArea,
        rooms_count: data.roomsCount,
        bedrooms_count: data.bedroomsCount,
        bathrooms_count: data.bathroomsCount,
        floor: data.floor,
        building_floors: data.floorsCount,
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
        monthly_charges: null,
        property_tax: null,
        strengths: [],
      },
      data.energySource,
    ),
    info: {
      readPrice: data.price,
      readPortalPricePerSquareMeter: data.portalPricePerSquareMeter,
      detectedPhotoCount: data.photoUrls.length,
    },
  };
}

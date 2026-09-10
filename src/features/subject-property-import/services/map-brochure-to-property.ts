import type { BrochureFields } from '@/features/subject-property-import/services/parse-agency-brochure';
import type {
  BrochureImport,
  SubjectPropertyImportPrefill,
} from '@/features/subject-property-import/types';

// Pure mapping from the parsed brochure to the seller-property prefills. The parser
// already applied the correspondence table; here we only route each field to the
// right form (property / diagnostics / condominium) and build the found/missing
// summary the advisor reads before saving.
//
// GUARDRAIL (CLAUDE.md): the read price never lands in a field and never pre-fills
// the advisor's range — it travels in `info` only. This matters more than for a
// listing: it is the advisor's own agency price.

function isFilled(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value != null;
}

export function mapBrochureToProperty(fields: BrochureFields): BrochureImport {
  const property: SubjectPropertyImportPrefill = {
    property_type: fields.propertyType,
    surface_area: fields.surfaceArea,
    land_area: null,
    rooms_count: fields.roomsCount,
    bedrooms_count: fields.bedroomsCount,
    bathrooms_count: fields.bathroomsCount,
    floor: fields.floor,
    address: null,
    postal_code: fields.postalCode,
    city: fields.city,
    district: null,
    description: fields.description,
    energy_rating: fields.energyRating,
    ges_rating: fields.gesRating,
    heating_type: fields.heatingType,
    exposure: fields.exposure,
    construction_year: fields.constructionYear,
    general_condition: fields.generalCondition,
    outdoor_spaces: fields.outdoorSpaces,
    parking_types: fields.parkingTypes,
    monthly_charges: fields.monthlyCharges,
    property_tax: fields.propertyTax,
    strengths: fields.strengths,
  };

  const diagnostics = {
    energy_consumption: fields.energyConsumption,
    ges_emissions: fields.gesEmissions,
  };

  const condominium = {
    is_condominium: fields.isCondominium,
    total_lots: fields.totalLots,
    annual_charges: fields.annualCharges,
  };

  // The summary reports the REAL form fields the advisor must end up with — not just
  // the labels the parser knows how to read — so he can trust "à compléter" to tell
  // him exactly what is left to type (Mission 44 §5).
  const filled = (value: unknown, label: string): { label: string; ok: boolean } => ({
    label,
    ok: isFilled(value),
  });
  const checks = [
    filled(property.property_type, 'Type de bien'),
    filled(property.surface_area, 'Surface'),
    filled(property.rooms_count, 'Pièces'),
    filled(property.bedrooms_count, 'Chambres'),
    filled(property.bathrooms_count, 'Salles de bains'),
    filled(property.floor, 'Étage'),
    filled(property.address, 'Adresse'),
    filled(property.postal_code, 'Code postal'),
    filled(property.city, 'Ville'),
    filled(property.district, 'Quartier'),
    filled(property.description, 'Description'),
    filled(property.construction_year, 'Année de construction'),
    filled(property.general_condition, 'État général'),
    filled(property.exposure, 'Exposition'),
    filled(property.heating_type, 'Chauffage'),
    filled(property.energy_rating, 'DPE'),
    filled(property.ges_rating, 'GES'),
    filled(property.outdoor_spaces, 'Extérieur'),
    filled(property.parking_types, 'Stationnement'),
    filled(property.monthly_charges, 'Charges mensuelles'),
    filled(property.property_tax, 'Taxe foncière'),
    filled(property.strengths, 'Points forts'),
    filled(diagnostics.energy_consumption, 'Consommation énergie'),
    filled(diagnostics.ges_emissions, 'Émissions GES'),
    filled(condominium.is_condominium, 'Copropriété'),
  ];
  const found = checks.filter((c) => c.ok).map((c) => c.label);
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);

  return {
    property,
    diagnostics,
    condominium,
    info: {
      readPrice: fields.readPrice,
      agencyReference: fields.agencyReference,
      taxeFonciere: fields.propertyTax,
      monthlyCharges: fields.monthlyCharges,
      annualCharges: fields.annualCharges,
      chargesConsistent: fields.chargesConsistent,
    },
    found,
    missing,
  };
}

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

// The property-form fields we attempt to fill, with their advisor-facing labels —
// used to report what the fiche did and did not carry.
const PROPERTY_LABELS: { key: keyof SubjectPropertyImportPrefill; label: string }[] = [
  { key: 'surface_area', label: 'Surface' },
  { key: 'bedrooms_count', label: 'Chambres' },
  { key: 'postal_code', label: 'Code postal' },
  { key: 'city', label: 'Ville' },
  { key: 'construction_year', label: 'Année de construction' },
  { key: 'general_condition', label: 'État général' },
  { key: 'exposure', label: 'Exposition' },
  { key: 'energy_rating', label: 'DPE' },
  { key: 'ges_rating', label: 'GES' },
  { key: 'outdoor_spaces', label: 'Extérieur' },
  { key: 'parking_types', label: 'Stationnement' },
];

function isFilled(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value != null;
}

export function mapBrochureToProperty(fields: BrochureFields): BrochureImport {
  const property: SubjectPropertyImportPrefill = {
    surface_area: fields.surfaceArea,
    land_area: null,
    rooms_count: null,
    bedrooms_count: fields.bedroomsCount,
    bathrooms_count: null,
    address: null,
    postal_code: fields.postalCode,
    city: fields.city,
    district: null,
    description: null,
    energy_rating: fields.energyRating,
    ges_rating: fields.gesRating,
    heating_type: null,
    exposure: fields.exposure,
    construction_year: fields.constructionYear,
    general_condition: fields.generalCondition,
    outdoor_spaces: fields.outdoorSpaces,
    parking_types: fields.parkingTypes,
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

  const found: string[] = [];
  const missing: string[] = [];
  for (const { key, label } of PROPERTY_LABELS) {
    (isFilled(property[key]) ? found : missing).push(label);
  }
  if (isFilled(diagnostics.energy_consumption)) found.push('Consommation énergie');
  else missing.push('Consommation énergie');
  if (isFilled(diagnostics.ges_emissions)) found.push('Émissions GES');
  else missing.push('Émissions GES');
  if (isFilled(condominium.total_lots)) found.push('Lots de copropriété');

  return {
    property,
    diagnostics,
    condominium,
    info: {
      readPrice: fields.readPrice,
      agencyReference: fields.agencyReference,
      taxeFonciere: fields.taxeFonciere,
      monthlyCharges: fields.monthlyCharges,
      annualCharges: fields.annualCharges,
      chargesConsistent: fields.chargesConsistent,
    },
    found,
    missing,
  };
}

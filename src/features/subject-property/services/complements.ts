import type { SheetFieldErrors } from '@/features/subject-property/services/sheet-form';

// Mission 91 — la fiche montre d'abord l'essentiel ; le reste vit sous « Compléments
// (facultatif) ». Le bloc s'ouvre seul dès que l'un de ses champs est rempli : rien de saisi ne
// reste caché.
//
// Mission 110 — une fiche courte : au premier affichage, 8 champs au plus. Le prix affiché est
// remplacé par la fourchette du conseiller (CLAUDE.md : on ne demande jamais le prix du bien), et
// la commune et son code postal comptent pour un. Tout le reste passe dans les compléments ;
// aucun champ n'est supprimé en base.
export const ESSENTIAL_PROPERTY_FIELDS = [
  'property_type',
  'surface_area',
  'rooms_count',
  // Commune et code postal : un seul champ à l'écran.
  'city',
  'address',
  // La fourchette du conseiller (M38), à la place du prix affiché.
  'advisor_price',
  'energy_rating',
  'outdoor_spaces',
] as const;

// Les champs du bien vendeur rangés dans les compléments.
export const COMPLEMENT_PROPERTY_FIELDS = [
  // Mission 110 — déplacés de la première vue.
  'land_area',
  'bedrooms_count',
  'description',
  'district',
  'floor',
  'building_floors',
  'ges_rating',
  'heating_type',
  'exposure',
  'construction_year',
  'general_condition',
  'has_elevator',
  'has_pool',
  'parking_types',
  // Mission 97 — lu ni par la recherche, ni par le Live, ni par les courriers.
  'bathrooms_count',
  'monthly_charges',
  'property_tax',
  'strengths',
  'watch_points',
] as const;

type ComplementField = (typeof COMPLEMENT_PROPERTY_FIELDS)[number];
type ComplementValues = Partial<Record<ComplementField, unknown>>;

const isFilled = (value: unknown): boolean =>
  value != null &&
  !(typeof value === 'string' && value.trim() === '') &&
  !(Array.isArray(value) && value.length === 0);

function filled(values: ComplementValues | null | undefined): boolean {
  return values != null && COMPLEMENT_PROPERTY_FIELDS.some((field) => isFilled(values[field]));
}

// Diagnostics et copropriété ne s'écrivent que si le conseiller les a touchés ou qu'une fiche
// PDF les a remplis (M77) : une ligne qui existe vaut « rempli ».
export function hasComplements(input: {
  property: ComplementValues | null;
  hasDiagnostics: boolean;
  hasCondominium: boolean;
}): boolean {
  return filled(input.property) || input.hasDiagnostics || input.hasCondominium;
}

// Une saisie à corriger dans un complément ouvre le bloc : « un clic mène au champ » (M77)
// doit pouvoir y mener.
export function errorsInComplements(errors: SheetFieldErrors): boolean {
  return (
    Object.keys(errors.diagnostics).length > 0 ||
    Object.keys(errors.condominium).length > 0 ||
    COMPLEMENT_PROPERTY_FIELDS.some((field) => field in errors.property)
  );
}

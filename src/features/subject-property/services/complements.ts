import type { SheetFieldErrors } from '@/features/subject-property/services/sheet-form';

// Mission 91 — la fiche montre d'abord l'essentiel ; données financières, argumentaire,
// diagnostics et copropriété vivent sous « Compléments (facultatif) ». Le bloc s'ouvre seul
// dès que l'un de ses champs est rempli : rien de saisi ne reste caché.

// Les champs du bien vendeur rangés dans les compléments.
export const COMPLEMENT_PROPERTY_FIELDS = [
  // Mission 97 — lu ni par la recherche, ni par le Live, ni par les courriers.
  'bathrooms_count',
  'monthly_charges',
  'property_tax',
  'strengths',
  'watch_points',
] as const;

type ComplementValues = {
  bathrooms_count?: number | null;
  monthly_charges?: number | null;
  property_tax?: number | null;
  strengths?: readonly string[] | null;
  watch_points?: readonly string[] | null;
};

function filled(values: ComplementValues | null | undefined): boolean {
  return (
    values != null &&
    (values.bathrooms_count != null ||
      values.monthly_charges != null ||
      values.property_tax != null ||
      (values.strengths?.length ?? 0) > 0 ||
      (values.watch_points?.length ?? 0) > 0)
  );
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

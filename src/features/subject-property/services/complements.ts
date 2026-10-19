import type { SheetFieldErrors } from '@/features/subject-property/services/sheet-form';

// Mission 91 — la fiche montre d'abord l'essentiel ; le reste vit sous « Compléments
// (facultatif) ».
//
// Mission 110 — le bloc reste fermé par défaut, même rempli, même après un import (remplace M91,
// « il s'ouvre seul ») : une ligne le résume, « Compléments : 9 renseignés, dont 2 à vérifier ».
// Seule une saisie à corriger l'ouvre, pour que la barre mène au champ (M77).
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

// Les colonnes techniques d'une ligne de diagnostics ou de copropriété ne sont pas des champs.
const TECHNICAL_COLUMNS = new Set([
  'id',
  'agency_id',
  'subject_property_id',
  'created_at',
  'updated_at',
]);

// Les champs du bien rangés dans les compléments qui sont renseignés, et ceux d'entre eux qui
// portent encore « À vérifier » (M97).
export function countPropertyComplements(
  values: ComplementValues | null | undefined,
  toVerify: readonly string[],
): { filled: number; toVerify: number } {
  const filled = COMPLEMENT_PROPERTY_FIELDS.filter((field) => isFilled(values?.[field]));
  return {
    filled: filled.length,
    toVerify: filled.filter((field) => toVerify.includes(field)).length,
  };
}

// Diagnostics et copropriété : les champs renseignés de la ligne (aucune pastille, M97).
export function countFilledRecordFields(
  record: Readonly<Record<string, unknown>> | null | undefined,
): number {
  if (record == null) {
    return 0;
  }
  return Object.entries(record).filter(
    ([column, value]) => !TECHNICAL_COLUMNS.has(column) && isFilled(value),
  ).length;
}

export function complementsSummary(counts: { filled: number; toVerify: number }): string {
  if (counts.filled === 0) {
    return 'Compléments : aucun renseigné';
  }
  const filled = `${counts.filled} renseigné${counts.filled > 1 ? 's' : ''}`;
  return counts.toVerify > 0
    ? `Compléments : ${filled}, dont ${counts.toVerify} à vérifier`
    : `Compléments : ${filled}`;
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

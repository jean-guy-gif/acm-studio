// Mission 97 — ce qui vient d'un import se vérifie. Chaque champ rempli par un import porte une
// pastille « À vérifier » ; elle part quand le conseiller modifie le champ ou touche « Tout est
// juste ». Rien n'est bloquant : c'est un rappel, pas une barrière. Pur.
//
// La liste est tenue par champ, dans `fields_to_verify` (bien vendeur, concurrents). Ce que le
// navigateur envoie est revalidé ici : seuls les noms d'une liste d'autorisation sont gardés.
export const VERIFY_LABEL = 'À vérifier';
export const ALL_CORRECT_LABEL = 'Tout est juste';

// Les champs du bien vendeur qu'un import (annonce ou fiche PDF) peut remplir. Jamais la
// fourchette du conseiller ni les points de vigilance : aucun import ne les écrit (M38, M44).
export const SUBJECT_VERIFIABLE_FIELDS = [
  'property_type',
  'surface_area',
  'land_area',
  'rooms_count',
  'bedrooms_count',
  'bathrooms_count',
  'address',
  'postal_code',
  'city',
  'description',
  'district',
  'floor',
  'building_floors',
  'energy_rating',
  'ges_rating',
  'heating_type',
  'exposure',
  'construction_year',
  'general_condition',
  'outdoor_spaces',
  'parking_types',
  'monthly_charges',
  'property_tax',
  'strengths',
] as const;

// Les champs d'un concurrent qu'un import d'annonce peut remplir.
export const COMPETITOR_VERIFIABLE_FIELDS = [
  'title',
  'address',
  'postal_code',
  'city',
  'district',
  'surface_area',
  'land_area',
  'rooms_count',
  'bedrooms_count',
  'bathrooms_count',
  'energy_rating',
  'ges_rating',
  'general_condition',
  'exposure',
  'outdoor_spaces',
  'parking_types',
  'construction_year',
  'heating_type',
  'energy_source',
  'price',
  'portal_price_per_square_meter',
  'days_on_market',
  'price_drop_amount',
  'price_drop_percentage',
  'listing_description',
  // Mission 101 — un concurrent créé depuis la recherche ne sait pas qui vend ni si le mandat
  // est exclusif (seule la page de l'annonce le dit) : les deux restent à vérifier, et la pastille
  // part quand le conseiller l'indique sur la carte.
  'sold_by',
  'exclusivity',
] as const;

const isFilled = (value: unknown): boolean => {
  if (value == null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  return true;
};

// Les champs qu'un import vient de remplir : ceux de la liste qui portent une valeur.
export function importedFields(
  values: Record<string, unknown> | null | undefined,
  allowed: readonly string[],
): string[] {
  if (!values) {
    return [];
  }
  return allowed.filter((field) => isFilled(values[field]));
}

// Ce que le navigateur (ou la base) dit rester à vérifier, ramené à la liste d'autorisation,
// sans doublon, dans l'ordre de la fiche. Accepte un tableau ou une liste séparée par des virgules.
export function sanitizeFieldsToVerify(raw: unknown, allowed: readonly string[]): string[] {
  const names = Array.isArray(raw)
    ? raw.map((item) => String(item))
    : typeof raw === 'string'
      ? raw.split(',')
      : [];
  const wanted = new Set(names.map((name) => name.trim()).filter(Boolean));
  return allowed.filter((field) => wanted.has(field));
}

// Réunir ce qui restait à vérifier et ce qu'un nouvel import vient de remplir.
export function addImportedFields(
  current: readonly string[],
  imported: readonly string[],
  allowed: readonly string[],
): string[] {
  return sanitizeFieldsToVerify([...current, ...imported], allowed);
}

// Le conseiller a modifié ce champ : il l'a donc relu.
export function withoutField(current: readonly string[], field: string): string[] {
  return current.filter((name) => name !== field);
}

// « 3 informations importées à vérifier » — null quand il n'en reste aucune.
export function importedToVerifyLabel(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count === 1
    ? '1 information importée à vérifier'
    : `${count} informations importées à vérifier`;
}

// Ce qu'« Avant le rendez-vous » compte : le bien vendeur et les seuls concurrents retenus.
export function countFieldsToVerify(
  property: { fields_to_verify?: readonly string[] | null } | null | undefined,
  competitors: readonly { is_selected: boolean; fields_to_verify?: readonly string[] | null }[],
): number {
  return (
    sanitizeFieldsToVerify(property?.fields_to_verify ?? [], SUBJECT_VERIFIABLE_FIELDS).length +
    competitors
      .filter((competitor) => competitor.is_selected)
      .reduce(
        (total, competitor) =>
          total +
          sanitizeFieldsToVerify(competitor.fields_to_verify ?? [], COMPETITOR_VERIFIABLE_FIELDS)
            .length,
        0,
      )
  );
}

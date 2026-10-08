import { propertyTypeLabel } from '@/features/subject-property/services/property-type-choice';

// MISSION 77 — ce que la recherche de concurrents exige du bien vendeur : la ville (le secteur)
// et le type (filtre dur, M54). Une seule liste, lue par la fiche avant de partir et par
// l'écran de recherche à l'arrivée.
export const SEARCH_REQUIREMENTS = ['property_type', 'city'] as const;
export type SearchRequirement = (typeof SEARCH_REQUIREMENTS)[number];

export const SEARCH_REQUIREMENT_LABELS: Record<SearchRequirement, string> = {
  property_type: 'type de bien',
  city: 'ville',
};

// L'ancre du champ dans la fiche du bien vendeur : la barre et l'écran de recherche y mènent.
export const propertyFieldId = (name: string): string => `champ-${name}`;

export function missingForSearch(property: {
  property_type: string | null | undefined;
  city: string | null | undefined;
}): SearchRequirement[] {
  const missing: SearchRequirement[] = [];
  // Un type qui ne se reconnaît pas ne protège rien au filtrage : il compte comme manquant.
  if (propertyTypeLabel(property.property_type) == null) {
    missing.push('property_type');
  }
  if (property.city == null || property.city.trim() === '') {
    missing.push('city');
  }
  return missing;
}

export function missingForSearchMessage(missing: SearchRequirement[]): string {
  return `Il manque : ${missing.map((name) => SEARCH_REQUIREMENT_LABELS[name]).join(', ')}`;
}

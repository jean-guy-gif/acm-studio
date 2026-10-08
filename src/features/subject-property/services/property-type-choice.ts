import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
  type PropertyType,
} from '@/features/subject-property/constants/property-options';

const isPropertyType = (value: string): value is PropertyType =>
  (PROPERTY_TYPES as readonly string[]).includes(value);

// MISSION 77 — le libellé de liste d'un type saisi ou lu (« appartement T3 », « house »,
// « Maison ») ; null quand le texte ne se reconnaît pas. Une seule lecture du type, celle de la
// recherche de concurrents : ce que la liste affiche est ce que le filtre dur comparera (M54).
export function propertyTypeLabel(text: string | null | undefined): string | null {
  const canonical = normalizePropertyType(text ?? null);
  return canonical != null && isPropertyType(canonical) ? PROPERTY_TYPE_LABELS[canonical] : null;
}

export type PropertyTypeOption = { value: string; label: string };

// Les choix de la liste. Une valeur enregistrée qui ne se reconnaît pas reste proposée telle
// quelle : elle n'est ni effacée ni rangée de force dans un autre choix.
export function propertyTypeOptions(current: string): PropertyTypeOption[] {
  const options: PropertyTypeOption[] = PROPERTY_TYPES.map((type) => ({
    value: PROPERTY_TYPE_LABELS[type],
    label: PROPERTY_TYPE_LABELS[type],
  }));
  const text = current.trim();
  if (text !== '' && propertyTypeLabel(text) == null) {
    options.push({ value: current, label: text });
  }
  return options;
}

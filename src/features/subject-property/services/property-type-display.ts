import {
  PROPERTY_TYPE_LABELS,
  type PropertyType,
} from '@/features/subject-property/constants/property-options';

// Mission 97 — un type de bien ne s'affiche jamais dans le vocabulaire d'une source
// (« apartment », « house ») : la valeur canonique se lit en français. Un texte déjà français,
// ou inconnu, est rendu tel quel ; une valeur vide ne dit rien.
export function propertyTypeDisplay(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) {
    return null;
  }
  return PROPERTY_TYPE_LABELS[text.toLowerCase() as PropertyType] ?? text;
}

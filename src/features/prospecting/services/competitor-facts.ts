import type { ProspectingEntry } from '@/features/prospecting/types';
import { propertyTypeDisplay } from '@/features/subject-property/services/property-type-display';
import { formatEuro, formatSquareMeters } from '@/lib/format';

// « Appartement · 3 p · 62 m² · 339 000 € · SeLoger » — chaque morceau tient sur sa ligne :
// un prix ne se coupe jamais.
export function competitorFacts(row: ProspectingEntry['row']): string[] {
  return [
    // Mission 97 — « Appartement », jamais « apartment » : le type canonique se lit en français.
    propertyTypeDisplay(row.propertyType),
    row.roomsCount != null ? `${row.roomsCount} p` : null,
    row.surfaceArea != null ? formatSquareMeters(row.surfaceArea) : null,
    row.price != null ? formatEuro(row.price) : null,
    row.portal,
  ].filter((fact): fact is string => fact != null && fact !== '');
}

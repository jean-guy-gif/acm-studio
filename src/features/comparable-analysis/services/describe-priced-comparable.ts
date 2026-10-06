import type { AnalyzedComparable } from '@/features/comparable-analysis/types/comparable-analysis';
import { formatEuro, formatEuroPerSquareMeter, formatSquareMeters } from '@/lib/format';

// Mission 74 — « Analyse des prix » décrit un concurrent par les champs du bien (pièces, surface,
// quartier ou commune, prix, prix au m²), jamais par le titre brut de l'annonce : un titre de
// portail est long, parfois faux, et répète un prix qui a pu changer. Un champ absent est omis.
export function describePricedComparable(
  comparable: Pick<
    AnalyzedComparable,
    'roomsCount' | 'surfaceArea' | 'district' | 'city' | 'price' | 'pricePerSquareMeter'
  >,
): string {
  const parts: string[] = [];
  if (comparable.roomsCount != null && comparable.roomsCount > 0) {
    parts.push(`${comparable.roomsCount} pièce${comparable.roomsCount > 1 ? 's' : ''}`);
  }
  parts.push(formatSquareMeters(comparable.surfaceArea));
  const location = comparable.district?.trim() || comparable.city?.trim();
  if (location) {
    parts.push(location);
  }
  return `${parts.join(' · ')} — ${formatEuro(comparable.price)} (${formatEuroPerSquareMeter(comparable.pricePerSquareMeter)})`;
}

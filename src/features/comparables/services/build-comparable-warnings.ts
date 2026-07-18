import type { Comparable } from '@/features/comparables/types';
import type { ComparableSelectionWarning } from '@/features/comparables/types/comparable-selection-summary';
import { getComparablePhotoUrls } from '@/features/comparables/utils/comparable-photos';

const MIN_COMPARABLES = 3;
const MAX_COMPARABLES = 8;
const DISPERSION_THRESHOLD = 0.3;

// Deterministic alerts computed from the RETAINED comparables. Takes the already
// computed price/m² list and their median (from the summary service) so the
// price/m² formula is never duplicated. Pure — no React, no database.
export function buildComparableWarnings(
  selected: Comparable[],
  pricesPerSquareMeter: number[],
  medianPricePerSquareMeter: number | null,
): ComparableSelectionWarning[] {
  const warnings: ComparableSelectionWarning[] = [];
  const count = selected.length;

  if (count > 0 && count < MIN_COMPARABLES) {
    warnings.push({
      type: 'too_few_comparables',
      message: 'Moins de 3 comparables retenus : la sélection est trop faible.',
    });
  } else if (count > MAX_COMPARABLES) {
    warnings.push({
      type: 'too_many_comparables',
      message: 'Plus de 8 comparables retenus : la sélection est trop large.',
    });
  }

  if (
    pricesPerSquareMeter.length >= 2 &&
    medianPricePerSquareMeter != null &&
    medianPricePerSquareMeter > 0
  ) {
    const minimum = Math.min(...pricesPerSquareMeter);
    const maximum = Math.max(...pricesPerSquareMeter);
    const dispersion = (maximum - minimum) / medianPricePerSquareMeter;
    if (dispersion > DISPERSION_THRESHOLD) {
      warnings.push({
        type: 'high_price_dispersion',
        message: 'Les comparables présentent une forte dispersion de prix.',
      });
    }
  }

  for (const comparable of selected) {
    const missing: string[] = [];
    if (!(typeof comparable.price === 'number' && comparable.price > 0)) {
      missing.push('prix');
    }
    if (!(typeof comparable.surface_area === 'number' && comparable.surface_area > 0)) {
      missing.push('surface');
    }
    if (getComparablePhotoUrls(comparable).length === 0) {
      missing.push('photo');
    }
    if (missing.length > 0) {
      const label = comparable.title?.trim() || 'Bien concurrent';
      warnings.push({
        type: 'incomplete_comparable',
        comparableId: comparable.id,
        message: `${label} : donnée(s) manquante(s) — ${missing.join(', ')}.`,
      });
    }
  }

  return warnings;
}

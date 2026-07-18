import type { LocationAnalysis } from '@/features/comparable-analysis/types/comparable-analysis';
import { countCanonical } from '@/features/comparable-analysis/utils/normalize-label';
import type { Comparable } from '@/features/comparables/types';

// Geographic and source breakdown of the analyzed comparables. Cities and
// districts are grouped by canonical key (case/accents/spacing insensitive) with
// a clean display label. Origin is derived deterministically from listing_url
// (present -> imported by URL, else manual), matching the comparable card.
// Pure counting. Called only by calculateComparableAnalysis().
export function analyzeLocation(analyzed: Comparable[]): LocationAnalysis {
  let manual = 0;
  let url = 0;
  for (const comparable of analyzed) {
    if (comparable.listing_url && comparable.listing_url.trim() !== '') {
      url += 1;
    } else {
      manual += 1;
    }
  }

  return {
    byCity: countCanonical(analyzed.map((comparable) => comparable.city)),
    byDistrict: countCanonical(analyzed.map((comparable) => comparable.district)),
    sources: { manual, url },
  };
}

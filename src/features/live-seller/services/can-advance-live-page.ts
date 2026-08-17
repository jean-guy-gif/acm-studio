import type { LivePageType } from '@/features/live-seller/services/build-live-pages';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

// Reveal gates use persisted answers only. Local form values must never let the
// global navigation skip ahead before the server has accepted the answer.
export function canAdvanceLivePage(
  pageType: LivePageType,
  entry: LiveComparableEntry | null,
): boolean {
  if (pageType === 'comparable_competition') {
    return entry?.response?.seller_serious_competitor != null;
  }
  if (pageType === 'comparable_price') {
    return entry?.response?.seller_estimated_listing_price != null;
  }
  if (pageType === 'comparable_duration') {
    return entry?.response?.seller_estimated_days_on_market != null;
  }
  return true;
}

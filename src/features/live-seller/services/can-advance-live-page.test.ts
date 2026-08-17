import { describe, expect, it } from 'vitest';

import { canAdvanceLivePage } from '@/features/live-seller/services/can-advance-live-page';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

function entry(response: Record<string, unknown> | null): LiveComparableEntry {
  return { response } as never;
}

describe('canAdvanceLivePage', () => {
  it('requires a persisted competitor answer before leaving competition', () => {
    expect(canAdvanceLivePage('comparable_competition', entry(null))).toBe(false);
    expect(
      canAdvanceLivePage('comparable_competition', entry({ seller_serious_competitor: 'yes' })),
    ).toBe(true);
  });

  it('requires the persisted seller estimate before leaving price', () => {
    expect(canAdvanceLivePage('comparable_price', entry({}))).toBe(false);
    expect(
      canAdvanceLivePage('comparable_price', entry({ seller_estimated_listing_price: 430000 })),
    ).toBe(true);
  });

  it('requires persisted estimated days before leaving duration', () => {
    expect(canAdvanceLivePage('comparable_duration', entry({}))).toBe(false);
    expect(
      canAdvanceLivePage('comparable_duration', entry({ seller_estimated_days_on_market: 0 })),
    ).toBe(true);
  });

  it('does not gate non-comparable pages', () => {
    expect(canAdvanceLivePage('intro', null)).toBe(true);
    expect(canAdvanceLivePage('conclusion', null)).toBe(true);
  });
});

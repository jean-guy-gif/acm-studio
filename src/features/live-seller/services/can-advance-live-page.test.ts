import { describe, expect, it } from 'vitest';

import { canAdvanceLivePage } from '@/features/live-seller/services/can-advance-live-page';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

function entry(response: Record<string, unknown> | null): LiveComparableEntry {
  return { response } as never;
}

function summary(fields: Record<string, unknown>): LiveSellerSummary {
  return fields as never;
}

describe('canAdvanceLivePage', () => {
  it('requires a persisted competitor answer before leaving competition', () => {
    expect(canAdvanceLivePage('comparable_competition', entry(null), null)).toBe(false);
    expect(
      canAdvanceLivePage(
        'comparable_competition',
        entry({ seller_serious_competitor: 'yes' }),
        null,
      ),
    ).toBe(true);
  });

  it('requires the persisted seller estimate before leaving price', () => {
    expect(canAdvanceLivePage('comparable_price', entry({}), null)).toBe(false);
    expect(
      canAdvanceLivePage(
        'comparable_price',
        entry({ seller_estimated_listing_price: 430000 }),
        null,
      ),
    ).toBe(true);
  });

  // Mission 41 — REVEAL-LOCK NON-REGRESSION. The single price screen is split in
  // two: "À quel prix ?" (guess, price masked) then "Ce prix vous paraît-il
  // cohérent ?" (reveal). The protocol's core rule — never reveal a price before
  // the seller has guessed it — becomes: the reveal screen is a SEPARATE page,
  // reachable only by advancing past the guess, and that advance stays gated on
  // the persisted estimate. Removing this gate would silently break the method.
  it('keeps the price reveal locked behind the persisted guess (4-screen split)', () => {
    // Screen 2 "À quel prix ?" : no persisted guess → navigation cannot reach the
    // reveal screen that follows.
    expect(canAdvanceLivePage('comparable_price', entry({}), null)).toBe(false);
    expect(
      canAdvanceLivePage('comparable_price', entry({ seller_estimated_listing_price: null }), null),
    ).toBe(false);
    // Guess persisted → the reveal screen becomes reachable.
    expect(
      canAdvanceLivePage(
        'comparable_price',
        entry({ seller_estimated_listing_price: 500000 }),
        null,
      ),
    ).toBe(true);
    // The reveal screen itself is not re-gated on the coherence reaction (optional,
    // like the duration reason): reaching it already required the guess.
    expect(canAdvanceLivePage('comparable_price_reveal', entry({}), null)).toBe(true);
    expect(
      canAdvanceLivePage(
        'comparable_price_reveal',
        entry({ seller_price_coherence: 'too_high' }),
        null,
      ),
    ).toBe(true);
  });

  it('requires persisted estimated days before leaving duration', () => {
    expect(canAdvanceLivePage('comparable_duration', entry({}), null)).toBe(false);
    expect(
      canAdvanceLivePage(
        'comparable_duration',
        entry({ seller_estimated_days_on_market: 0 }),
        null,
      ),
    ).toBe(true);
  });

  it('requires the persisted property confirmation before leaving "Votre bien"', () => {
    expect(canAdvanceLivePage('subject_property', null, null)).toBe(false);
    expect(canAdvanceLivePage('subject_property', null, summary({}))).toBe(false);
    expect(
      canAdvanceLivePage('subject_property', null, summary({ seller_property_confirmed: 'yes' })),
    ).toBe(true);
    expect(
      canAdvanceLivePage('subject_property', null, summary({ seller_property_confirmed: 'no' })),
    ).toBe(true);
  });

  it('does not gate non-comparable pages', () => {
    expect(canAdvanceLivePage('intro', null, null)).toBe(true);
    expect(canAdvanceLivePage('conclusion', null, null)).toBe(true);
  });
});

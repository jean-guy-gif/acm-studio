import { describe, expect, it } from 'vitest';

import { deriveListingAge } from '@/features/comparable-import/services/derive-listing-age';

const NOW = new Date('2026-09-10T12:00:00.000Z');

describe('deriveListingAge — priority order (most reliable first)', () => {
  it('1. exact date wins, days computed, source named', () => {
    const age = deriveListingAge(
      {
        publishedAtExact: '2026-07-10T00:00:00.000Z',
        lowerBoundLabel: 'plus de 2 mois',
        source: 'SeLoger',
        firstObservedAt: '2026-08-01',
      },
      NOW,
    );
    expect(age).toEqual({
      kind: 'exact',
      publishedAt: '2026-07-10T00:00:00.000Z',
      days: 62,
      source: 'SeLoger',
    });
  });

  it('2. no exact date → lower bound, verbatim, NEVER a number of days', () => {
    const age = deriveListingAge(
      {
        publishedAtExact: null,
        lowerBoundLabel: 'plus de 2 mois',
        source: 'Bien’ici',
        firstObservedAt: '2026-08-01',
      },
      NOW,
    );
    expect(age).toEqual({ kind: 'lowerBound', label: 'plus de 2 mois', source: 'Bien’ici' });
    // guard: the shape carries no "days"
    expect(age && 'days' in age).toBe(false);
  });

  it('3. no portal date at all → first ACM observation, "vue par ACM"', () => {
    const age = deriveListingAge(
      {
        publishedAtExact: null,
        lowerBoundLabel: null,
        source: null,
        firstObservedAt: '2026-08-07',
      },
      NOW,
    );
    expect(age).toEqual({ kind: 'firstSeen', firstSeenAt: '2026-08-07', days: 34 });
  });

  it('4. nothing → null', () => {
    expect(
      deriveListingAge(
        { publishedAtExact: null, lowerBoundLabel: null, source: null, firstObservedAt: null },
        NOW,
      ),
    ).toBeNull();
  });
});

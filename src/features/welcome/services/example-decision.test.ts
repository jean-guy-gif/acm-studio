import { describe, expect, it } from 'vitest';

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import {
  EXAMPLE_JUSTIFICATION,
  exampleDecisionRow,
} from '@/features/welcome/services/example-decision';
import { EXAMPLE_COMPETITORS, EXAMPLE_PROPERTY } from '@/features/welcome/services/example-dossier';

// Mission 110 — le dossier d'exemple est livré avec une décision de prix d'exemple.
describe('la décision de prix du dossier d’exemple', () => {
  const comparables = EXAMPLE_COMPETITORS.map((competitor, index) =>
    makeComparable({
      id: `ex-${index}`,
      price: competitor.price,
      surface_area: competitor.surface_area,
      rooms_count: competitor.rooms_count,
      property_type: 'apartment',
      city: EXAMPLE_PROPERTY.city,
      is_selected: true,
      display_order: index + 1,
    }),
  );
  const row = exampleDecisionRow({
    projectId: 'p1',
    agencyId: 'a1',
    validatedBy: 'u1',
    sellerSurface: EXAMPLE_PROPERTY.surface_area,
    comparables,
    now: new Date('2026-10-19T10:00:00.000Z'),
  });

  it('calculée par le moteur de l’outil, prix au millier, justification d’exemple', () => {
    expect(row).not.toBeNull();
    expect(row!.advisor_price! % 1000).toBe(0);
    expect(row!.advisor_price).toBeGreaterThanOrEqual(row!.range_low!);
    expect(row!.advisor_price).toBeLessThanOrEqual(row!.range_high!);
    expect(row!.justification).toBe(EXAMPLE_JUSTIFICATION);
    expect(EXAMPLE_JUSTIFICATION.startsWith('Exemple')).toBe(true);
    expect(EXAMPLE_JUSTIFICATION).not.toMatch(/[Ee]stimation/);
  });

  it('sans concurrents, pas de décision', () => {
    expect(
      exampleDecisionRow({
        projectId: 'p1',
        agencyId: 'a1',
        validatedBy: 'u1',
        sellerSurface: 68,
        comparables: [],
        now: new Date(),
      }),
    ).toBeNull();
  });
});

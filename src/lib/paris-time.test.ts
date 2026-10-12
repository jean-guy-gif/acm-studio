import { describe, expect, it } from 'vitest';

import { startOfParisMonth, startOfParisYesterday } from '@/lib/paris-time';

describe('bornes à l’heure de Paris (mission 100)', () => {
  it('le mois commence à minuit, heure de Paris — été (UTC+2) et hiver (UTC+1)', () => {
    expect(startOfParisMonth(new Date('2026-10-12T09:00:00Z')).toISOString()).toBe(
      '2026-09-30T22:00:00.000Z',
    );
    expect(startOfParisMonth(new Date('2026-12-15T09:00:00Z')).toISOString()).toBe(
      '2026-11-30T23:00:00.000Z',
    );
  });

  it('le 31 à 23 h 30 UTC, on est déjà le mois suivant à Paris', () => {
    expect(startOfParisMonth(new Date('2026-10-31T23:30:00Z')).toISOString()).toBe(
      '2026-10-31T23:00:00.000Z',
    );
  });

  it('« depuis hier » part d’hier minuit, y compris à cheval sur un mois et sur le changement d’heure', () => {
    expect(startOfParisYesterday(new Date('2026-10-12T09:00:00Z')).toISOString()).toBe(
      '2026-10-10T22:00:00.000Z',
    );
    expect(startOfParisYesterday(new Date('2026-11-01T09:00:00Z')).toISOString()).toBe(
      '2026-10-30T23:00:00.000Z',
    );
    // Changement d'heure le dimanche 25/10/2026 : hier (le 25) commence encore en heure d'été.
    expect(startOfParisYesterday(new Date('2026-10-26T09:00:00Z')).toISOString()).toBe(
      '2026-10-24T22:00:00.000Z',
    );
  });
});

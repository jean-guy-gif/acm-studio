import { describe, expect, it } from 'vitest';

import type { BuyerInput } from '@/features/buyers/types';
import { planTiers } from '@/features/competitor-search/services/stream-estate-tiers';
import {
  acceptedDpeClasses,
  budgetCeiling,
  idealSearchCriteria,
} from '@/features/ideal-properties/services/ideal-criteria';

const base: BuyerInput = {
  name: 'Famille Keller',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  notes: null,
  propertyTypes: ['house'],
  cities: ['Mougins', 'Mouans-Sartoux', 'Valbonne'],
  budgetIdeal: 1_500_000,
  budgetMax: 1_650_000,
  roomsMin: 6,
  bedroomsMin: 4,
  surfaceMin: 180,
  outdoor: true,
  parking: true,
  pool: true,
  floorMin: null,
  elevator: null,
  energyRatingMax: 'D',
  worksAccepted: false,
  mustHave: ['pool', 'cities'],
  dealBreakers: null,
};

// Mission 118 — les réglages de la recherche du marché, déduits de la fiche : fixes (M99).
describe('les réglages déduits de la fiche acquéreur', () => {
  it('le budget plafond + 5 %, une seule fois ; pièces et surface en minimum ; DPE A à D ; extérieur ; piscine', () => {
    const result = idealSearchCriteria(base);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(budgetCeiling(1_650_000)).toBe(1_732_500);
    expect(result.settings.price).toEqual({ min: 1, max: 1_732_500 });
    expect(result.criteria.advisorPriceMax).toBe(1_732_500);
    expect(result.settings.rooms).toEqual({ min: 6, max: 50 });
    expect(result.settings.surface).toEqual({ min: 180, max: 10_000 });
    expect(result.settings.sector).toEqual({ kind: 'commune' });
    expect(result.settings.filters).toMatchObject({
      dpe: ['A', 'B', 'C', 'D'],
      outdoor: ['balcony', 'terrace', 'garden'],
      pool: true,
      minFloor: null,
    });
    expect(result.criteria.propertyType).toBe('house');
    expect(result.cities).toEqual(['Mougins', 'Mouans-Sartoux', 'Valbonne']);
  });

  it('sans budget, sans pièces, sans surface : pas de filtre ; sans DPE, toutes les classes', () => {
    const result = idealSearchCriteria({
      ...base,
      budgetMax: null,
      roomsMin: null,
      surfaceMin: null,
      energyRatingMax: null,
      outdoor: null,
      pool: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settings.price).toBeNull();
    expect(result.settings.rooms).toBeNull();
    expect(result.settings.surface).toBeNull();
    expect(result.settings.filters).toMatchObject({ dpe: null, outdoor: null, pool: false });
    expect(acceptedDpeClasses(null)).toBeNull();
    expect(acceptedDpeClasses('A')).toEqual(['A']);
  });

  it('un seul type pour le marché : sans type ou avec deux types, la recherche le dit', () => {
    expect(idealSearchCriteria({ ...base, propertyTypes: [] })).toEqual({
      ok: false,
      reason: 'no_type',
    });
    expect(idealSearchCriteria({ ...base, propertyTypes: ['apartment', 'house'] })).toEqual({
      ok: false,
      reason: 'two_types',
    });
    expect(idealSearchCriteria({ ...base, cities: [] })).toEqual({ ok: false, reason: 'no_city' });
  });

  it('les réglages sont fixes : un seul plan, toute la commune, sans élargissement (M99)', () => {
    const result = idealSearchCriteria(base);
    if (!result.ok) throw new Error('attendu ok');
    const plans = planTiers(result.criteria, { located: false, hasCentre: false }, result.settings);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      tier: 1,
      area: { kind: 'commune' },
      rooms: { min: 6, max: 50 },
      surface: { min: 180, max: 10_000 },
      prices: [{ min: 1, max: 1_732_500 }],
    });
  });
});

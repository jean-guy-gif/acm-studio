import { describe, expect, it, vi } from 'vitest';

import {
  runPaidSearch,
  searchFingerprint,
  STREAM_ESTATE_MAX_COST_LABEL,
} from '@/features/competitor-search/services/paid-search-guard';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';

const criteria = (overrides: Partial<CompetitorSearchCriteria> = {}): CompetitorSearchCriteria =>
  ({
    city: 'Antibes',
    postalCode: '06600',
    propertyType: 'Appartement',
    district: null,
    surfaceArea: 65,
    roomsCount: 3,
    advisorPriceMin: 300_000,
    advisorPriceMax: 350_000,
    ...overrides,
  }) as CompetitorSearchCriteria;

describe('aucun appel payant sans extension (mission 93)', () => {
  it('ne lance pas la recherche quand l’extension ne répond pas', async () => {
    const search = vi.fn(async () => 'facturé');
    const outcome = await runPaidSearch(async () => ({ available: false }), search);
    expect(outcome).toEqual({ ran: false, reason: 'extension' });
    expect(search).not.toHaveBeenCalled();
  });

  it('lance la recherche quand l’extension répond', async () => {
    const search = vi.fn(async () => 'résultat');
    const outcome = await runPaidSearch(async () => ({ available: true }), search);
    expect(outcome).toEqual({ ran: true, result: 'résultat' });
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('dit le coût maximal avant de payer', () => {
    expect(STREAM_ESTATE_MAX_COST_LABEL.replace(/[  ]/g, ' ')).toBe(
      'Coût maximal : 0,60 € par recherche',
    );
  });
});

describe('le dernier résultat est gardé, puis invalidé', () => {
  // Mission 105 — gardé sur le dossier, côté serveur : l'empreinte décide (kept-result.ts).
  it('l’empreinte change dès que la fourchette change', () => {
    expect(searchFingerprint(criteria({ advisorPriceMax: 360_000 }), null)).not.toBe(
      searchFingerprint(criteria(), null),
    );
  });

  it('est jeté dès que le bien vendeur change : surface, pièces, type, ville ou adresse', () => {
    const base = searchFingerprint(criteria(), '8 avenue Docteur Hochet');
    for (const other of [
      searchFingerprint(criteria({ surfaceArea: 70 }), '8 avenue Docteur Hochet'),
      searchFingerprint(criteria({ roomsCount: 4 }), '8 avenue Docteur Hochet'),
      searchFingerprint(criteria({ propertyType: 'Maison' }), '8 avenue Docteur Hochet'),
      searchFingerprint(criteria({ city: 'Cannes' }), '8 avenue Docteur Hochet'),
      searchFingerprint(criteria(), '12 rue de la République'),
    ]) {
      expect(other).not.toBe(base);
    }
    // Le même bien donne la même empreinte, quel que soit l'ordre des champs.
    const reordered = Object.fromEntries(Object.entries(criteria()).reverse());
    expect(
      searchFingerprint(reordered as CompetitorSearchCriteria, '8 avenue Docteur Hochet'),
    ).toBe(base);
  });
});

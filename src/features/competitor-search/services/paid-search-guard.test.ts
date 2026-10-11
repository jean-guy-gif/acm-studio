import { describe, expect, it, vi } from 'vitest';

import {
  forgetSearch,
  hasKeptSearch,
  keepSearch,
  recallSearch,
  runPaidSearch,
  searchFingerprint,
  STREAM_ESTATE_MAX_COST_LABEL,
} from '@/features/competitor-search/services/paid-search-guard';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';

function tabStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

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
  const kept = { portal: { candidates: ['a', 'b'] }, note: { billed: 20 } };

  it('se réaffiche sans nouvel appel tant que rien n’a changé', () => {
    const storage = tabStorage();
    const fingerprint = searchFingerprint(criteria(), '8 avenue Docteur Hochet');
    expect(hasKeptSearch(storage, 'dossier')).toBe(false);
    keepSearch(storage, 'dossier', { fingerprint, ...kept });
    expect(hasKeptSearch(storage, 'dossier')).toBe(true);
    expect(recallSearch(storage, 'dossier', fingerprint)).toEqual({ fingerprint, ...kept });
    // Un autre dossier ne le voit pas.
    expect(recallSearch(storage, 'autre', fingerprint)).toBeNull();
  });

  it('est jeté dès que la fourchette change', () => {
    const storage = tabStorage();
    keepSearch(storage, 'dossier', {
      fingerprint: searchFingerprint(criteria(), null),
      ...kept,
    });
    const changed = searchFingerprint(criteria({ advisorPriceMax: 360_000 }), null);
    expect(recallSearch(storage, 'dossier', changed)).toBeNull();
    expect(hasKeptSearch(storage, 'dossier')).toBe(false);
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

  it('jette un contenu illisible, et s’oublie sur demande', () => {
    const storage = tabStorage();
    storage.setItem('acm-stream-estate:dossier', '{pas du json');
    expect(recallSearch(storage, 'dossier', 'x')).toBeNull();
    expect(hasKeptSearch(storage, 'dossier')).toBe(false);
    keepSearch(storage, 'dossier', { fingerprint: 'x', ...kept });
    forgetSearch(storage, 'dossier');
    expect(hasKeptSearch(storage, 'dossier')).toBe(false);
  });

  it('ne casse rien quand le stockage est refusé', () => {
    const refused = {
      getItem: () => {
        throw new Error('refusé');
      },
      setItem: () => {
        throw new Error('refusé');
      },
      removeItem: () => {
        throw new Error('refusé');
      },
    };
    expect(() => keepSearch(refused, 'dossier', { fingerprint: 'x', ...kept })).not.toThrow();
    expect(hasKeptSearch(refused, 'dossier')).toBe(false);
    expect(recallSearch(refused, 'dossier', 'x')).toBeNull();
  });
});

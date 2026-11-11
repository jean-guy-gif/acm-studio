import { describe, expect, it } from 'vitest';

import {
  listingsCheckStale,
  sincePreparation,
  type SincePreparationCompetitor,
} from '@/features/competitor-refresh/services/since-preparation';

const NOW = new Date('2026-11-11T15:00:00Z');
const base: SincePreparationCompetitor = {
  id: 'c1',
  label: 'Maison · 5 pièces · 128 m² · Vence',
  price: 715_000,
  hasListing: true,
  goneAt: null,
  recordedPrice: 745_000,
  observations: [
    { observed_on: '2026-10-21', price: 745_000 },
    { observed_on: '2026-11-11', price: 715_000 },
  ],
  readOnCheck: true,
};

describe('« Depuis la préparation » (mission 152)', () => {
  it('un prix baissé : ancien → nouveau, l’écart, le jour du constat', () => {
    const since = sincePreparation([base], '2026-11-11T14:05:00Z', NOW);
    expect(since.changes).toEqual([
      {
        kind: 'price',
        id: 'c1',
        label: base.label,
        from: 745_000,
        to: 715_000,
        percent: -4,
        on: '2026-11-11',
      },
    ]);
    expect(since).toMatchObject({ stale: false, unchanged: 0, read: 1, unread: 0, withListing: 1 });
  });

  it('une annonce retirée, sur preuve ; une inchangée ; une illisible ; un concurrent sans annonce', () => {
    const since = sincePreparation(
      [
        { ...base, id: 'gone', goneAt: '2026-11-09T08:00:00Z' },
        { ...base, id: 'same', price: 745_000, observations: [], readOnCheck: true },
        { ...base, id: 'unread', price: 745_000, observations: [], readOnCheck: false },
        { ...base, id: 'manual', hasListing: false, readOnCheck: null },
      ],
      '2026-11-11T14:05:00Z',
      NOW,
    );
    expect(since.changes).toEqual([
      { kind: 'gone', id: 'gone', label: base.label, on: '2026-11-09' },
    ]);
    expect(since).toMatchObject({ unchanged: 2, read: 2, unread: 1, withListing: 3 });
  });

  it('sans copie d’import, le premier relevé daté sert de référence', () => {
    const since = sincePreparation([{ ...base, recordedPrice: null }], null, NOW);
    expect(since.changes[0]).toMatchObject({ from: 745_000, to: 715_000 });
  });

  it('jamais vérifié, ou il y a plus de 24 h : le rappel', () => {
    expect(sincePreparation([base], null, NOW).stale).toBe(true);
    expect(sincePreparation([base], '2026-11-10T14:59:00Z', NOW).stale).toBe(true);
    expect(sincePreparation([base], '2026-11-10T15:01:00Z', NOW).stale).toBe(false);
  });

  it('au lancement du Live : un vrai dossier pas commencé, avec des annonces, non vérifié depuis 24 h', () => {
    const input = {
      isExample: false,
      started: false,
      withListing: true,
      checkedAt: null,
      now: NOW,
    };
    expect(listingsCheckStale(input)).toBe(true);
    expect(listingsCheckStale({ ...input, checkedAt: '2026-11-11T10:00:00Z' })).toBe(false);
    expect(listingsCheckStale({ ...input, isExample: true })).toBe(false);
    expect(listingsCheckStale({ ...input, started: true })).toBe(false);
    expect(listingsCheckStale({ ...input, withListing: false })).toBe(false);
  });
});

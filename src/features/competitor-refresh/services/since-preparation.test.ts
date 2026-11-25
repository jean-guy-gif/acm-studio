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
  shownAtLive: true,
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
        shownAtLive: true,
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

  // Lancement, mission 11 — vu sur un vrai dossier : trois annonces importées dix minutes plus tôt,
  // et « Lancer le Live » disait « non vérifiées depuis plus de 24 h ».
  describe('une annonce entrée dans le dossier depuis moins de 24 h vient d’être lue', () => {
    const launch = { isExample: false, started: false, withListing: true, now: NOW };
    const justNow = '2026-11-11T14:50:00Z';
    const threeDaysAgo = '2026-11-08T09:00:00Z';

    it('jamais vérifiées, toutes importées à l’instant : aucun rappel', () => {
      expect(
        listingsCheckStale({ ...launch, checkedAt: null, importedAt: [justNow, justNow] }),
      ).toBe(false);
      expect(sincePreparation([{ ...base, importedAt: justNow }], null, NOW).stale).toBe(false);
    });

    it('jamais vérifiées, une annonce importée il y a trois jours : le rappel', () => {
      expect(
        listingsCheckStale({ ...launch, checkedAt: null, importedAt: [justNow, threeDaysAgo] }),
      ).toBe(true);
      expect(
        sincePreparation(
          [
            { ...base, id: 'a', importedAt: justNow },
            { ...base, id: 'b', importedAt: threeDaysAgo },
          ],
          null,
          NOW,
        ).stale,
      ).toBe(true);
    });

    it('vérifiées il y a plus de 24 h : le rappel, sauf si toutes sont entrées depuis', () => {
      const old = '2026-11-10T08:00:00Z';
      expect(listingsCheckStale({ ...launch, checkedAt: old, importedAt: [threeDaysAgo] })).toBe(
        true,
      );
      expect(listingsCheckStale({ ...launch, checkedAt: old, importedAt: [justNow] })).toBe(false);
    });

    it('vérifiées il y a moins de 24 h : aucun rappel, même pour une annonce ancienne', () => {
      expect(
        listingsCheckStale({
          ...launch,
          checkedAt: '2026-11-11T10:00:00Z',
          importedAt: [threeDaysAgo],
        }),
      ).toBe(false);
    });

    it('une date d’entrée inconnue ne rassure pas : le rappel reste', () => {
      expect(listingsCheckStale({ ...launch, checkedAt: null, importedAt: [justNow, null] })).toBe(
        true,
      );
      expect(listingsCheckStale({ ...launch, checkedAt: null, importedAt: [] })).toBe(true);
    });
  });
});

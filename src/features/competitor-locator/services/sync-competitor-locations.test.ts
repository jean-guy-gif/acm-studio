import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLocationWatch } from '@/features/competitor-locator/services/location-watch';
import {
  syncCompetitorLocations,
  type SyncDeps,
  type SyncOutcome,
} from '@/features/competitor-locator/services/sync-competitor-locations';
import type { RawLocatorEntry } from '@/features/competitor-locator/types';

const A = 'https://www.bienici.com/annonce/a';
const B = 'https://www.seloger.com/annonces/b.htm';
const entry = (etat: string) => ({ etat, etiquette: null, etiquetteCle: null, adresse: '' });

function deps(overrides: Partial<SyncDeps> = {}): SyncDeps & { saved: RawLocatorEntry[][] } {
  const saved: RawLocatorEntry[][] = [];
  return {
    saved,
    ping: async () => 'ready',
    loadToLocate: async () => [
      { id: '1', listingUrl: A },
      { id: '2', listingUrl: B },
    ],
    fetchProperties: async () => ({
      ok: true,
      properties: { [A]: entry('pret'), [B]: entry('en-cours') },
    }),
    save: async (entries) => {
      saved.push(entries);
      return { ok: true, changed: entries.length };
    },
    maxUrls: 50,
    ...overrides,
  };
}

describe('syncCompetitorLocations', () => {
  it('Localisateur absent : rien n’est demandé ni écrit', async () => {
    const loadToLocate = vi.fn(async () => []);
    const d = deps({ ping: async () => 'unavailable', loadToLocate });
    expect(await syncCompetitorLocations(d)).toEqual({
      availability: 'unavailable',
      pending: false,
      changed: 0,
    });
    expect(loadToLocate).not.toHaveBeenCalled();
    expect(d.saved).toEqual([]);
  });

  it('enregistre ce qui est rendu et signale une analyse en cours', async () => {
    const d = deps();
    expect(await syncCompetitorLocations(d)).toEqual({
      availability: 'ready',
      pending: true,
      changed: 2,
    });
    expect(d.saved[0].map((saved) => saved.listingUrl)).toEqual([A, B]);
  });

  it('partage éteint en cours de route : rien n’est écrit', async () => {
    const d = deps({ fetchProperties: async () => ({ ok: false, reason: 'sharing_off' }) });
    expect(await syncCompetitorLocations(d)).toEqual({
      availability: 'sharing_off',
      pending: false,
      changed: 0,
    });
    expect(d.saved).toEqual([]);
  });

  it('ignore une annonce non demandée et une entrée illisible', async () => {
    const d = deps({
      fetchProperties: async () => ({
        ok: true,
        properties: { [A]: { etat: 'certain' }, 'https://ailleurs.example/x': entry('pret') },
      }),
    });
    expect(await syncCompetitorLocations(d)).toMatchObject({ pending: false, changed: 0 });
    expect(d.saved).toEqual([]);
  });

  it('demande par paquets de 50 au plus', async () => {
    const urls = Array.from(
      { length: 120 },
      (_, index) => `https://www.bienici.com/annonce/${index}`,
    );
    const sizes: number[] = [];
    const d = deps({
      loadToLocate: async () =>
        urls.map((listingUrl, index) => ({ id: String(index), listingUrl })),
      fetchProperties: async (batch) => {
        sizes.push(batch.length);
        return { ok: true, properties: {} };
      },
    });
    await syncCompetitorLocations(d);
    expect(sizes).toEqual([50, 50, 20]);
  });
});

describe('createLocationWatch — 10 s pendant 2 min', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const outcome = (pending: boolean): SyncOutcome => ({
    availability: 'ready',
    pending,
    changed: 0,
  });

  it('en cours sans fin : une passe tout de suite, puis 12 reprises, puis plus rien', async () => {
    const sync = vi.fn(async () => outcome(true));
    const watch = createLocationWatch({ sync, onOutcome: () => {} });
    watch.start();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(sync).toHaveBeenCalledTimes(13);
  });

  it('s’arrête dès que plus rien n’est en cours', async () => {
    const sync = vi
      .fn<() => Promise<SyncOutcome>>()
      .mockResolvedValueOnce(outcome(true))
      .mockResolvedValue(outcome(false));
    const watch = createLocationWatch({ sync, onOutcome: () => {} });
    watch.start();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('stop() arrête les reprises', async () => {
    const sync = vi.fn(async () => outcome(true));
    const watch = createLocationWatch({ sync, onOutcome: () => {} });
    watch.start();
    await vi.advanceTimersByTimeAsync(15_000);
    watch.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sync).toHaveBeenCalledTimes(2);
  });
});

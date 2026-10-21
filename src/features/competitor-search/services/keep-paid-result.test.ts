import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async () => undefined,
}));

import { keepPaidSearchResult } from '@/features/competitor-search/services/keep-paid-result';
import {
  legacySearchFingerprint,
  searchFingerprint,
} from '@/features/competitor-search/services/paid-search-guard';
import type { StreamEstateSearchNote } from '@/features/competitor-search/services/stream-estate-summary';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
  PortalSearchResult,
} from '@/features/competitor-search/types';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 112 — le résultat payé est gardé par l'action qui a payé, avant de répondre ; le quartier
// sort de l'empreinte sans perdre ce qui était gardé.

const candidate = (key: string) => ({ key, url: `https://x/${key}` }) as CompetitorCandidate;
const portal = (keys: string[]): PortalSearchResult =>
  ({
    portal: 'stream_estate',
    label: 'Stream Estate',
    searchUrl: '',
    status: 'ok',
    message: null,
    candidates: keys.map(candidate),
  }) as PortalSearchResult;
const note = (billed: number): StreamEstateSearchNote => ({
  billed,
  stop: 'cap',
  cursor: null,
  tiers: [],
  counts: {
    unreadable: 0,
    outsideWhitelist: 0,
    expiredOrigin: 0,
    otherCommune: 0,
    unverifiedPosition: 0,
    duplicates: 0,
  },
  newBuild: 0,
  located: true,
  communeName: 'Nice',
  inseeCode: '06088',
});

describe('le résultat payé, gardé par la recherche', () => {
  it('une première recherche est gardée telle quelle, avec l’empreinte du serveur', async () => {
    const db = fakeSupabase(() => ({}));
    const ok = await keepPaidSearchResult({
      supabase: db.client as never,
      agencyId: 'a1',
      profileId: 'u1',
      projectId: 'p1',
      fingerprint: 'fp',
      portal: portal(['a', 'b']),
      note: note(20),
      resuming: false,
    });
    expect(ok).toBe(true);
    expect(db.writes()).toEqual(['upsert stream_estate_results']);
    const row = db.calls.find((call) => call.method === 'upsert')?.args[0] as {
      fingerprint: string;
      result: { portal: PortalSearchResult; note: StreamEstateSearchNote };
    };
    expect(row.fingerprint).toBe('fp');
    expect(row.result.portal.candidates.map((c) => c.key)).toEqual(['a', 'b']);
  });

  it('« Chercher encore » s’ajoute au résultat gardé : biens à la suite, coût cumulé', async () => {
    const db = fakeSupabase((calls) =>
      calls.some((call) => call.method === 'select')
        ? { data: { result: { portal: portal(['a', 'b']), note: note(60) } } }
        : {},
    );
    await keepPaidSearchResult({
      supabase: db.client as never,
      agencyId: 'a1',
      profileId: 'u1',
      projectId: 'p1',
      fingerprint: 'fp',
      portal: portal(['c']),
      note: note(20),
      resuming: true,
    });
    const row = db.calls.find((call) => call.method === 'upsert')?.args[0] as {
      result: { portal: PortalSearchResult; note: StreamEstateSearchNote };
    };
    expect(row.result.portal.candidates.map((c) => c.key)).toEqual(['a', 'b', 'c']);
    expect(row.result.note.billed).toBe(80);
  });
});

describe('le quartier sort de l’empreinte', () => {
  const criteria = {
    propertyType: 'apartment',
    city: 'Nice',
    postalCode: '06000',
    district: 'Le Port',
    surfaceArea: 70,
    roomsCount: 3,
    advisorPriceMin: 300_000,
    advisorPriceMax: 380_000,
  } as unknown as CompetitorSearchCriteria;

  it('corriger le quartier ne change plus l’empreinte', () => {
    expect(searchFingerprint({ ...criteria, district: 'Cimiez' }, '1 rue X')).toBe(
      searchFingerprint(criteria, '1 rue X'),
    );
  });

  it('l’empreinte d’avant la mission, quartier compris, reste reconnue', () => {
    const before = legacySearchFingerprint(criteria, '1 rue X');
    expect(before).toContain('Le Port');
    expect(searchFingerprint(criteria, '1 rue X')).not.toContain('Le Port');
    expect(before).not.toBe(searchFingerprint(criteria, '1 rue X'));
  });
});

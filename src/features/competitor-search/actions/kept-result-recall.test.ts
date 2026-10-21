import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 112 — un résultat gardé avant la mission (empreinte avec le quartier) se rouvre après ;
// un résultat dont le bien a changé est toujours jeté.
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

const state = vi.hoisted(() => ({ stored: '' }));
const db = fakeSupabase((calls) =>
  calls.some((call) => call.method === 'delete')
    ? {}
    : {
        data: {
          fingerprint: state.stored,
          result: { portal: { candidates: [] }, note: { billed: 20 } },
        },
      },
);

vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'u1', agency_id: 'a1', removed_at: null }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => db.client }));
vi.mock('@/features/competitor-search/queries/load-search-criteria', () => ({
  loadSearchCriteria: async () => ({ ok: true, criteria, address: '1 rue X', settings: null }),
}));

import { recallStreamEstateResult } from '@/features/competitor-search/actions/kept-result';
import {
  legacySearchFingerprint,
  searchFingerprint,
} from '@/features/competitor-search/services/paid-search-guard';

beforeEach(() => db.reset());

describe('rouvrir un résultat gardé (mission 112)', () => {
  it('gardé avant la mission, quartier dans l’empreinte : il se rouvre', async () => {
    state.stored = legacySearchFingerprint(criteria, '1 rue X');
    expect(await recallStreamEstateResult('p1')).not.toBeNull();
    expect(db.writes()).toEqual([]);
  });

  it('gardé depuis la mission : il se rouvre', async () => {
    state.stored = searchFingerprint(criteria, '1 rue X');
    expect(await recallStreamEstateResult('p1')).not.toBeNull();
  });

  it('le bien a changé depuis : il est jeté', async () => {
    state.stored = searchFingerprint({ ...criteria, surfaceArea: 90 }, '1 rue X');
    expect(await recallStreamEstateResult('p1')).toBeNull();
    expect(db.writes()).toEqual(['delete stream_estate_results']);
  });
});

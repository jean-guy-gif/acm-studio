import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialUpdateComparableState } from '@/features/comparables/actions/update-comparable-state';
import { fakeSupabase, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 112 — « Modifier » une fiche suit les mêmes règles que l'import : l'adresse de l'annonce
// est nettoyée (M108), et un doublon laisse la saisie dans le formulaire.
const state = vi.hoisted(() => ({ respond: (() => ({})) as (method: string) => FakeResponse }));
const db = fakeSupabase((calls) => {
  const from = calls.map((call) => call.method).lastIndexOf('from');
  const chain = calls.slice(from).map((call) => call.method);
  return state.respond(chain.includes('update') ? 'update' : 'select');
});

vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'u1', agency_id: 'a1', removed_at: null }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => db.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`);
  },
}));

import { updateComparable } from '@/features/comparables/actions/update-comparable';

const form = () => {
  const data = new FormData();
  data.set('title', 'Mon titre');
  data.set('city', 'Nice');
  data.set('surface_area', '70');
  data.set('rooms_count', '3');
  data.set('price', '400000');
  data.set(
    'listing_url',
    'https://www.seloger.com/annonces/achat/appartement/nice/123.htm?utm_source=x',
  );
  return data;
};

beforeEach(() => {
  db.reset();
  state.respond = () => ({});
});

describe('« Modifier le bien » (mission 112)', () => {
  it('l’adresse de l’annonce est enregistrée nettoyée, comme à l’import', async () => {
    await expect(
      updateComparable('p1', 'c1', initialUpdateComparableState, form()),
    ).rejects.toThrow('REDIRECT /builder/p1/comparables');
    const patch = db.calls.find((call) => call.method === 'update')?.args[0] as {
      listing_url: string;
    };
    expect(patch.listing_url).not.toContain('utm_source');
  });

  it('un doublon écarté : la saisie reste, et « la retenir ? » est proposé', async () => {
    state.respond = (method) =>
      method === 'update'
        ? {
            error: {
              code: '23505',
              message:
                'duplicate key value violates unique constraint "comparables_one_listing_per_project"',
            },
          }
        : { data: { id: 'c9', is_selected: false } };
    const result = await updateComparable('p1', 'c1', initialUpdateComparableState, form());
    expect(result.duplicate).toEqual({ id: 'c9', selected: false });
    expect(result.values?.title).toBe('Mon titre');
    expect(result.error).toBeNull();
  });

  it('un doublon retenu : le message de la M108, et la saisie reste', async () => {
    state.respond = (method) =>
      method === 'update'
        ? { error: { code: '23505', message: 'comparables_one_listing_per_project' } }
        : { data: { id: 'c9', is_selected: true } };
    const result = await updateComparable('p1', 'c1', initialUpdateComparableState, form());
    expect(result.error).toMatch(/^Déjà dans le dossier\s: cette annonce a déjà sa fiche, retenue/);
    expect(result.values?.price).toBe('400000');
  });
});

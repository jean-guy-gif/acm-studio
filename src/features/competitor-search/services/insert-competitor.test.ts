import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
// Mission 120 — la fusion d'un bien démarché passe par la clé service ; un échec entre au journal.
const absorb = vi.hoisted(() => ({ calls: [] as unknown[], error: null as unknown }));
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    rpc: async (name: string, args: unknown) => {
      absorb.calls.push([name, args]);
      return { data: absorb.error ? null : 0, error: absorb.error };
    },
  }),
}));
const reported = vi.hoisted(() => [] as string[]);
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async (scope: string) => {
    reported.push(scope);
  },
}));

import {
  insertCompetitor,
  isDuplicateListing,
} from '@/features/competitor-search/services/insert-competitor';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

const DUPLICATE = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "comparables_one_listing_per_project"',
};
const ORDER_TAKEN = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "comparables_project_display_order"',
};

// Mission 105 — une annonce, une fiche, par dossier : garanti en base. Un import répété (une
// réponse arrivée après le délai, un second clic) rend la fiche existante, sans erreur.
describe('importer deux fois la même annonce', () => {
  it('reconnaît le refus d’unicité de l’annonce, et lui seul', () => {
    expect(isDuplicateListing(DUPLICATE)).toBe(true);
    expect(isDuplicateListing(ORDER_TAKEN)).toBe(false);
    expect(isDuplicateListing({ code: '42501', message: DUPLICATE.message })).toBe(false);
    expect(isDuplicateListing(null)).toBe(false);
  });

  it('le second import n’écrit pas une seconde fiche, et dit la fiche existante (M108)', async () => {
    const supabase = fakeSupabase((calls) => {
      const last = calls[calls.length - 1];
      if (last?.method === 'insert') return { error: DUPLICATE };
      if (calls.some((c) => c.method === 'insert')) {
        return { data: { id: 'existing-1', is_selected: false } };
      }
      return { data: { display_order: 3 } };
    });
    const result = await insertCompetitor(supabase.client as never, 'p1', 'a1', {
      title: 'x',
      price: 300_000,
      listing_url: 'https://www.seloger.com/annonces/1.htm',
    });
    expect(result).toEqual({ status: 'existing', id: 'existing-1', selected: false });
    expect(supabase.writes()).toEqual(['insert comparables']);
  });

  it('l’adresse de l’annonce est nettoyée avant l’unicité, sur tous les chemins (M108)', async () => {
    const supabase = fakeSupabase(() => ({ data: { display_order: 1 } }));
    await insertCompetitor(supabase.client as never, 'p1', 'a1', {
      title: 'x',
      price: 300_000,
      listing_url: '  https://www.seloger.com/annonces/1.htm?cmp=INTERNAL#photos ',
    });
    const insert = supabase.calls.find((call) => call.method === 'insert');
    expect((insert?.args[0] as { listing_url: string }).listing_url).toBe(
      'https://www.seloger.com/annonces/1.htm',
    );
  });

  it('un ordre déjà pris se réessaie, une autre erreur échoue', async () => {
    let inserts = 0;
    const retried = fakeSupabase((calls) => {
      const n = calls.filter((c) => c.method === 'insert').length;
      if (n > inserts) {
        inserts = n;
        return n === 1 ? { error: ORDER_TAKEN } : {};
      }
      return { data: { display_order: 3 } };
    });
    expect(
      await insertCompetitor(retried.client as never, 'p1', 'a1', { title: 'x', price: 1 }),
    ).toEqual({ status: 'created' });
    expect(retried.writes()).toEqual(['insert comparables', 'insert comparables']);
  });
});

// Mission 120 (décision du 28/10) — une carte par bien dans les deux sens : après l'insertion, le
// serveur demande à la base de fondre le bien démarché de la même annonce dans le concurrent.
describe('un concurrent reprend la carte d’une recherche acquéreur', () => {
  it('demande la fusion avec l’agence, le concurrent créé et la clé de l’annonce', async () => {
    absorb.calls.length = 0;
    const supabase = fakeSupabase((calls) =>
      calls.some((c) => c.method === 'insert')
        ? { data: { id: 'created-1', is_selected: true } }
        : { data: { display_order: 1 } },
    );
    const result = await insertCompetitor(supabase.client as never, 'p1', 'a1', {
      title: 'x',
      price: 300_000,
      listing_url: 'https://www.seloger.com/annonces/achat/maison/mougins-06/26ZEJMLWB13Y.htm',
    });
    expect(result).toEqual({ status: 'created' });
    expect(absorb.calls).toEqual([
      [
        'absorb_buyer_prospect',
        {
          p_agency_id: 'a1',
          p_comparable_id: 'created-1',
          p_listing_key: 'seloger:26ZEJMLWB13Y.htm',
        },
      ],
    ]);
  });

  it('sans annonce reconnue, aucune fusion ; un échec de la fusion ne défait pas l’insertion', async () => {
    absorb.calls.length = 0;
    const plain = fakeSupabase(() => ({ data: { display_order: 1 } }));
    expect(
      await insertCompetitor(plain.client as never, 'p1', 'a1', {
        title: 'x',
        price: 1,
        listing_url: null,
      }),
    ).toEqual({ status: 'created' });
    expect(absorb.calls).toEqual([]);
    absorb.error = { message: 'refusé' };
    const supabase = fakeSupabase((calls) =>
      calls.some((c) => c.method === 'insert')
        ? { data: { id: 'created-2', is_selected: true } }
        : { data: { display_order: 1 } },
    );
    expect(
      await insertCompetitor(supabase.client as never, 'p1', 'a1', {
        title: 'x',
        price: 1,
        listing_url: 'https://www.seloger.com/annonces/achat/maison/mougins-06/26ZEJMLWB13Y.htm',
      }),
    ).toEqual({ status: 'created' });
    expect(reported).toEqual(['fusion d’un bien démarché dans un concurrent']);
    absorb.error = null;
  });
});

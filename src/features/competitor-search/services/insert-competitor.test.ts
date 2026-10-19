import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

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

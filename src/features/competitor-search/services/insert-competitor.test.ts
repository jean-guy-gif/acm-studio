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

  it('le second import n’est pas un échec, et n’écrit pas une seconde fiche', async () => {
    const supabase = fakeSupabase((calls) =>
      calls[calls.length - 1]?.method === 'insert' || calls.some((c) => c.method === 'insert')
        ? { error: DUPLICATE }
        : { data: { display_order: 3 } },
    );
    const ok = await insertCompetitor(supabase.client as never, 'p1', 'a1', {
      title: 'x',
      price: 300_000,
      listing_url: 'https://www.seloger.com/annonces/1.htm',
    });
    expect(ok).toBe(true);
    expect(supabase.writes()).toEqual(['insert comparables']);
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
    ).toBe(true);
    expect(retried.writes()).toEqual(['insert comparables', 'insert comparables']);
  });
});

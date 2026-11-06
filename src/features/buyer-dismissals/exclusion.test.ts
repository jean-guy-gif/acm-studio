import { describe, expect, it, vi } from 'vitest';

import { readBuyerKnownKeys } from '@/features/buyer-watch/queries/known-keys';
import { withoutDismissed } from '@/features/buyers/services/loop-properties';
import type { Database } from '@/lib/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mission 139 — un bien écarté pour un acquéreur ne revient plus : ni par la veille (ses clés
// connues), ni dans le bloc du dossier et le compteur du Live (`getPropertyBuyers`).
vi.mock('server-only', () => ({}));

// Un client par table : chaque lecture rend les lignes de SA table, même lues en parallèle.
function client(respond: (table: string) => { data?: unknown[]; error?: unknown }) {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'in', 'not', 'order', 'range']) {
        chain[method] = () => chain;
      }
      chain.then = (resolve: (value: unknown) => unknown) =>
        resolve({ data: null, error: null, ...respond(table) });
      return chain;
    },
  } as unknown as SupabaseClient<Database>;
}

const rows: Record<string, unknown[]> = {
  buyer_selections: [],
  buyer_proposals: [],
  buyer_dismissals: [
    { buyer_id: 'b1', property_key: 'listing:seloger:123' },
    { buyer_id: 'b2', property_key: 'project:p9' },
  ],
  comparables: [],
  buyer_prospects: [],
};

describe('la veille', () => {
  it('ne ramène plus un bien écarté pour lui, et seulement pour lui', async () => {
    const known = await readBuyerKnownKeys(
      client((table) => ({ data: rows[table] ?? [] })),
      'agency-a',
      ['b1', 'b2'],
    );
    expect(known.ok).toBe(true);
    if (!known.ok) return;
    expect(known.keys('b1').has('seloger:123')).toBe(true);
    expect(known.keys('b2').has('seloger:123')).toBe(false);
  });

  it('une lecture des biens écartés en échec arrête tout (M98)', async () => {
    const known = await readBuyerKnownKeys(
      client((table) =>
        table === 'buyer_dismissals' ? { error: { message: 'panne' } } : { data: [] },
      ),
      'agency-a',
      ['b1'],
    );
    expect(known.ok).toBe(false);
  });
});

describe('le bloc du dossier, le compteur du Live, la boucle', () => {
  it('une seule règle : un acquéreur pour qui ce bien est écarté ne compte plus', () => {
    const buyers = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }];
    const dismissals = new Map([['project:p9', new Set(['b2'])]]);
    // `getPropertyBuyers` (bloc du dossier, Live, « Montrer au vendeur ») lit la clé du dossier.
    expect(withoutDismissed(buyers, dismissals, 'project:p9').map((buyer) => buyer.id)).toEqual([
      'b1',
      'b3',
    ]);
    expect(withoutDismissed(buyers, dismissals, 'project:p1')).toEqual(buyers);
    expect(withoutDismissed(buyers, undefined, 'project:p9')).toEqual(buyers);
  });
});

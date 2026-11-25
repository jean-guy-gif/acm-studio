import { describe, expect, it, vi } from 'vitest';

import { readRuledOut, readSeenProperties } from '@/features/buyers/queries/read-seen-properties';
import type { Database } from '@/lib/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Lancement, mission 3 — la lecture de ce que les acquéreurs ont déjà vu : une vague, cadrée sur
// l'agence ; une lecture en échec n'est jamais « rien de vu » (M98).
vi.mock('server-only', () => ({}));

// Un client par table : chaque lecture rend les lignes de SA table, même lues en parallèle.
function client(respond: (table: string) => { data?: unknown[]; error?: unknown }) {
  const filters: Record<string, [string, unknown][]> = {};
  return {
    filters,
    supabase: {
      from(table: string) {
        const chain: Record<string, unknown> = {};
        for (const method of ['select', 'in', 'not', 'is', 'order', 'range']) {
          chain[method] = () => chain;
        }
        chain.eq = (column: string, value: unknown) => {
          (filters[table] ??= []).push([column, value]);
          return chain;
        };
        chain.then = (resolve: (value: unknown) => unknown) =>
          resolve({ data: null, error: null, ...respond(table) });
        return chain;
      },
    } as unknown as SupabaseClient<Database>,
  };
}

const rows: Record<string, unknown[]> = {
  buyer_dismissals: [{ buyer_id: 'rossi', property_key: 'project:p1' }],
  buyer_proposals: [],
  buyer_selections: [{ id: 's1', buyer_id: 'keller', presented_at: '2026-11-10T10:00:00Z' }],
  buyer_events: [],
  buyer_item_responses: [
    { selection_item_id: 'i1', answer: 'no', answered_at: '2026-11-10T10:30:00Z' },
  ],
  buyer_visit_requests: [],
  buyer_selection_items: [
    { id: 'i1', selection_id: 's1', source: 'project', reference: 'p1', removed_at: null },
    { id: 'i2', selection_id: 's1', source: 'competitor', reference: 'c1', removed_at: null },
  ],
  comparables: [
    {
      id: 'c1',
      listing_url: 'https://www.seloger.com/annonces/achat/maison/vence-06140/26ZEJMLWB13Y',
    },
  ],
};

const TABLES = Object.keys(rows);

describe('ce que les acquéreurs ont déjà vu, lu en base', () => {
  it('chaque bien par la clé de la boucle, un concurrent par son annonce', async () => {
    const { supabase } = client((table) => ({ data: rows[table] ?? [] }));
    const read = await readSeenProperties(supabase, 'agency-a');
    expect(read).not.toBeNull();
    const keller = read?.seen.get('keller');
    expect(keller?.get('project:p1')?.reason).toBe('refused');
    expect(keller?.get('listing:seloger:26ZEJMLWB13Y')?.reason).toBe('sent');
    expect(read?.keyOf({ source: 'competitor', reference: 'c1' })).toBe(
      'listing:seloger:26ZEJMLWB13Y',
    );
  });

  it('écarté ou refusé : le bien n’est plus pour lui', async () => {
    const { supabase } = client((table) => ({ data: rows[table] ?? [] }));
    const ruledOut = await readRuledOut(supabase, 'agency-a');
    expect([...(ruledOut?.get('project:p1') ?? [])].sort()).toEqual(['keller', 'rossi']);
    expect(ruledOut?.has('listing:seloger:26ZEJMLWB13Y')).toBe(false);
  });

  it('toute lecture est cadrée sur l’agence ; pour un acquéreur, sur lui', async () => {
    const { supabase, filters } = client((table) => ({ data: rows[table] ?? [] }));
    await readSeenProperties(supabase, 'agency-a', 'keller');
    for (const table of TABLES) {
      expect(filters[table], table).toContainEqual(['agency_id', 'agency-a']);
    }
    for (const table of TABLES.filter(
      (name) => name !== 'buyer_selection_items' && name !== 'comparables',
    )) {
      expect(filters[table], table).toContainEqual(['buyer_id', 'keller']);
    }
  });

  it.each(TABLES)('une lecture de %s en échec arrête tout (M98)', async (failing) => {
    const { supabase } = client((table) =>
      table === failing ? { error: { message: 'panne' } } : { data: rows[table] ?? [] },
    );
    expect(await readSeenProperties(supabase, 'agency-a')).toBeNull();
    expect(await readRuledOut(supabase, 'agency-a')).toBeNull();
  });
});

// Lancement, mission 3 (suite, 25/11) — ce qui fait reconnaître un bien sous une autre annonce, lu
// avec lui : l'identifiant chez le fournisseur et la ressemblance (les prix arrivent en texte de
// l'API, M134) ; et quand la sélection lui est parvenue.
describe('les marques d’un bien, et la sélection reçue', () => {
  const marked: Record<string, unknown[]> = {
    ...rows,
    buyer_item_responses: [],
    buyer_selections: [{ id: 's1', buyer_id: 'keller', presented_at: null }],
    buyer_selection_items: [
      {
        id: 'i3',
        selection_id: 's1',
        source: 'listing',
        reference: 'https://www.bienici.com/annonce/ag133861-559023029',
        removed_at: null,
        listed_price: '1698000',
        property_id: 'se-735',
        like_city: 'Mouans-Sartoux',
        like_rooms: '6',
        like_surface: '257',
      },
      { id: 'i2', selection_id: 's1', source: 'competitor', reference: 'c1', removed_at: null },
    ],
    comparables: [
      {
        id: 'c1',
        listing_url: null,
        city: 'Mougins',
        rooms_count: 6,
        surface_area: '283',
        price: '1696000',
      },
    ],
  };

  it('pas encore reçue : aucune marque ne vaut, et la date est vide', async () => {
    const { supabase } = client((table) => ({ data: marked[table] ?? [] }));
    const read = await readSeenProperties(supabase, 'agency-a', 'keller');
    expect(read?.receivedAt('s1')).toBeNull();
    expect(read?.marks('keller')).toEqual([
      {
        key: 'listing:bienici:ag133861-559023029',
        propertyId: 'se-735',
        like: { city: 'Mouans-Sartoux', rooms: 6, surface: 257, price: 1_698_000 },
      },
      {
        key: 'competitor:c1',
        propertyId: null,
        like: { city: 'Mougins', rooms: 6, surface: 283, price: 1_696_000 },
      },
    ]);
    expect(read?.marks('rossi')).toEqual([]);
  });

  it('une réponse de sa part : la sélection lui est parvenue', async () => {
    const answered: Record<string, unknown[]> = {
      ...marked,
      buyer_item_responses: [
        { selection_item_id: 'i3', answer: 'maybe', answered_at: '2026-11-13T16:00:00Z' },
      ],
    };
    const { supabase } = client((table) => ({ data: answered[table] ?? [] }));
    const read = await readSeenProperties(supabase, 'agency-a', 'keller');
    expect(read?.receivedAt('s1')).toBe('2026-11-13T16:00:00Z');
  });
});

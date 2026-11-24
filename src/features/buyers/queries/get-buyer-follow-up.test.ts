import { describe, expect, it, vi } from 'vitest';

import { getBuyerFollowUpRows } from '@/features/buyers/queries/get-buyer-follow-up';
import type { Database } from '@/lib/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Lancement, mission 6 — ce que lit « Son suivi » : cadré sur l'agence et sur l'acquéreur ; une
// lecture en échec n'est jamais « rien d'envoyé » (M98).
vi.mock('server-only', () => ({}));

function client(respond: (table: string) => { data?: unknown[]; error?: unknown }) {
  const filters: Record<string, [string, unknown][]> = {};
  return {
    filters,
    supabase: {
      from(table: string) {
        const chain: Record<string, unknown> = {};
        for (const method of ['select', 'order', 'range']) chain[method] = () => chain;
        for (const method of ['eq', 'in']) {
          chain[method] = (column: string, value: unknown) => {
            (filters[table] ??= []).push([column, value]);
            return chain;
          };
        }
        chain.then = (resolve: (value: unknown) => unknown) =>
          resolve({ data: null, error: null, ...respond(table) });
        return chain;
      },
    } as unknown as SupabaseClient<Database>,
  };
}

const rows: Record<string, unknown[]> = {
  buyer_selections: [{ id: 's1', presented_at: '2026-11-14T09:00:00Z' }],
  buyer_events: [],
  buyer_proposals: [],
  buyer_item_responses: [],
  buyer_dismissals: [],
  buyer_selection_items: [
    {
      id: 'i1',
      selection_id: 's1',
      source: 'competitor',
      reference: 'c1',
      label: 'Maison · 5 pièces · 140 m² · Vence',
      listed_price: '779000',
      removed_at: null,
    },
  ],
  comparables: [{ id: 'c1', listing_url: 'https://www.seloger.com/annonces/x/26ZEJMLWB13Y' }],
};

describe('ce que lit « Son suivi »', () => {
  it('ses biens, le prix en nombre, l’annonce de ses concurrents', async () => {
    const { supabase, filters } = client((table) => ({ data: rows[table] ?? [] }));
    const read = await getBuyerFollowUpRows(supabase, 'agency-a', 'keller');
    expect(read?.items[0]?.listed_price).toBe(779_000);
    expect(read?.competitorUrls.get('c1')).toContain('seloger');
    for (const table of Object.keys(rows)) {
      expect(filters[table], table).toContainEqual(['agency_id', 'agency-a']);
    }
    for (const table of ['buyer_selections', 'buyer_events', 'buyer_proposals']) {
      expect(filters[table], table).toContainEqual(['buyer_id', 'keller']);
    }
    for (const table of ['buyer_item_responses', 'buyer_dismissals']) {
      expect(filters[table], table).toContainEqual(['buyer_id', 'keller']);
    }
    expect(filters.buyer_selection_items).toContainEqual(['selection_id', ['s1']]);
  });

  it.each(Object.keys(rows))('une lecture de %s en échec rend null (M98)', async (failing) => {
    const { supabase } = client((table) =>
      table === failing ? { error: { message: 'panne' } } : { data: rows[table] ?? [] },
    );
    expect(await getBuyerFollowUpRows(supabase, 'agency-a', 'keller')).toBeNull();
  });
});

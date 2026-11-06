import { describe, expect, it } from 'vitest';

import { getRelaunchFacts } from '@/features/buyers/queries/get-relaunch-facts';

// Mission 135 — ce qui décide qu'une sélection est « envoyée » et qu'il y a eu réponse : une
// proposition notée (M134) ou un partage noté ; un lien seulement créé ne compte pas ; une réponse,
// une présentation ou des créneaux éteignent la relance.
function tableClient(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'in', 'order', 'range']) chain[method] = () => chain;
      chain.then = (resolve: (value: unknown) => unknown) =>
        resolve({ data: tables[table] ?? [], error: null });
      return chain;
    },
  } as never;
}

const base = (over: Record<string, unknown[]> = {}) => ({
  buyer_selections: [
    {
      id: 's2',
      buyer_id: 'b1',
      created_at: '2026-11-03T10:00:00Z',
      presented_at: null,
      dossier_availability: null,
    },
    {
      id: 's1',
      buyer_id: 'b1',
      created_at: '2026-10-01T10:00:00Z',
      presented_at: null,
      dossier_availability: null,
    },
  ],
  buyer_selection_items: [{ id: 'i1', selection_id: 's2' }],
  buyer_events: [],
  buyer_dossier_links: [{ selection_id: 's2', expires_at: '2099-01-01T00:00:00Z' }],
  buyer_item_responses: [],
  buyer_proposals: [],
  ...over,
});
const buyers = [{ id: 'b1', status: 'searching' as const }];

describe('les faits de relance', () => {
  it('un lien seulement créé ne fait pas une sélection envoyée', async () => {
    const { facts } = await getRelaunchFacts(tableClient(base()), 'a', buyers);
    expect(facts.get('b1')).toMatchObject({ selectionId: 's2', sentAt: null, linkActive: true });
  });

  it('un partage noté ou une proposition notée l’envoie, la plus ancienne date', async () => {
    const { facts } = await getRelaunchFacts(
      tableClient(
        base({
          buyer_events: [
            { selection_id: 's2', kind: 'link_shared', occurred_at: '2026-11-04T10:00:00Z' },
          ],
          buyer_proposals: [{ selection_item_id: 'i1', sent_at: '2026-11-03T12:00:00Z' }],
        }),
      ),
      'a',
      buyers,
    );
    expect(facts.get('b1')?.sentAt).toBe('2026-11-03T12:00:00Z');
  });

  it('une réponse, une présentation, des créneaux : il a répondu ; les relances comptées', async () => {
    const answered = await getRelaunchFacts(
      tableClient(base({ buyer_item_responses: [{ selection_item_id: 'i1' }] })),
      'a',
      buyers,
    );
    expect(answered.facts.get('b1')?.answered).toBe(true);
    const slots = await getRelaunchFacts(
      tableClient(
        base({
          buyer_selections: [
            {
              id: 's2',
              buyer_id: 'b1',
              created_at: '2026-11-03T10:00:00Z',
              presented_at: null,
              dossier_availability: ['saturday_morning'],
            },
          ],
          buyer_events: [
            { selection_id: 's2', kind: 'relaunch', occurred_at: '2026-11-05T10:00:00Z' },
          ],
        }),
      ),
      'a',
      buyers,
    );
    expect(slots.facts.get('b1')).toMatchObject({
      answered: true,
      relaunches: ['2026-11-05T10:00:00Z'],
    });
  });

  it('un lien expiré se dit ; une lecture en échec aussi', async () => {
    const expired = await getRelaunchFacts(
      tableClient(
        base({ buyer_dossier_links: [{ selection_id: 's2', expires_at: '2020-01-01T00:00:00Z' }] }),
      ),
      'a',
      buyers,
    );
    expect(expired.facts.get('b1')?.linkActive).toBe(false);
    const failing = {
      from() {
        const chain: Record<string, unknown> = {};
        for (const method of ['select', 'eq', 'in', 'order', 'range']) chain[method] = () => chain;
        chain.then = (resolve: (value: unknown) => unknown) =>
          resolve({ data: null, error: { message: 'panne' } });
        return chain;
      },
    } as never;
    expect((await getRelaunchFacts(failing, 'a', buyers)).failed).toBe(true);
  });
});

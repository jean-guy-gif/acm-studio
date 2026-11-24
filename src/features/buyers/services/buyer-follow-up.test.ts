import { describe, expect, it } from 'vitest';

import {
  buyerFollowUp,
  followUpFacts,
  followUpPill,
  followUpSummary,
  type FollowUpRows,
} from '@/features/buyers/services/buyer-follow-up';

// Lancement, mission 6 (Jean-Guy, 23/11) — « un seul endroit par acquéreur avec les biens envoyés,
// refusés et pourquoi, visités avec leur compte rendu, pour faire le point avec lui » : un bien =
// une ligne, lue dans ce qui existe déjà.
const NOW = new Date('2026-11-24T10:00:00Z');
const item = (
  id: string,
  reference: string,
  over: Partial<FollowUpRows['items'][number]> = {},
) => ({
  id,
  selection_id: 's1',
  source: 'project',
  reference,
  label: `Appartement · 3 pièces · 65 m² · ${reference}`,
  listed_price: 395_000,
  removed_at: null,
  ...over,
});

const base: FollowUpRows = {
  selections: [{ id: 's1', presented_at: '2026-11-14T09:00:00Z' }],
  shares: [],
  items: [item('i1', 'p1'), item('i2', 'p2'), item('i3', 'p3'), item('i4', 'p4')],
  proposals: [],
  responses: [
    {
      selection_item_id: 'i1',
      answer: 'visit',
      reasons: [],
      answered_at: '2026-11-14T09:10:00Z',
      answered_during: 'presentation',
    },
    {
      selection_item_id: 'i2',
      answer: 'maybe',
      reasons: [],
      answered_at: '2026-11-14T09:12:00Z',
      answered_during: 'presentation',
    },
    {
      selection_item_id: 'i3',
      answer: 'no',
      reasons: ['district', 'price'],
      answered_at: '2026-11-14T09:15:00Z',
      answered_during: 'dossier',
    },
  ],
  dismissals: [
    {
      property_key: 'listing:seloger:ABC',
      label: 'Maison · 5 pièces · 140 m² · Vence',
      reason: 'over_budget',
      dismissed_at: '2026-11-20T08:00:00Z',
    },
  ],
  visits: [
    {
      id: 'v1',
      itemId: 'i1',
      requestedAt: '2026-11-14T09:10:00Z',
      visitedAt: '2026-11-22T15:00:00Z',
      refused: false,
    },
    {
      id: 'v2',
      itemId: 'i1',
      requestedAt: '2026-11-22T16:00:00Z',
      visitedAt: null,
      refused: false,
    },
  ],
  competitorUrls: new Map(),
};

const byKey = (rows: FollowUpRows) =>
  Object.fromEntries(buyerFollowUp(rows).map((entry) => [entry.key, entry]));

describe('son suivi : un bien, une ligne', () => {
  it('range chaque bien par ce qu’il en a dit, dans l’ordre du point à faire avec lui', () => {
    const entries = buyerFollowUp(base);
    expect(entries.map((entry) => [entry.key, entry.group])).toEqual([
      ['project:p1', 'visited'],
      ['project:p2', 'waiting'],
      ['project:p4', 'waiting'],
      ['project:p3', 'refused'],
      ['listing:seloger:ABC', 'dismissed'],
    ]);
  });

  it('visité : ses visites restent sur sa ligne, la deuxième à organiser comprise', () => {
    const visited = byKey(base)['project:p1']!;
    expect(visited.visitIds).toEqual(['v1', 'v2']);
    expect(visited.itemId).toBe('i1');
    expect(followUpFacts(visited, NOW)).toEqual([
      'Envoyé le 14/11, en présentation',
      'Veut le visiter · le 14/11, pendant la présentation',
    ]);
    expect(followUpPill(visited)).toEqual({ text: 'Visité', tone: 'ok' });
  });

  it('une visite demandée, pas encore faite : à organiser', () => {
    const entries = byKey({ ...base, visits: [base.visits[1]!] });
    expect(entries['project:p1']?.group).toBe('to_visit');
    expect(followUpPill(entries['project:p1']!)).toEqual({ text: 'À organiser', tone: 'now' });
  });

  it('envoyé sans réponse, ou « Peut-être » : en attente', () => {
    const entries = byKey(base);
    expect(followUpPill(entries['project:p2']!)).toEqual({ text: 'Peut-être', tone: 'plain' });
    expect(followUpPill(entries['project:p4']!)).toEqual({ text: 'Sans réponse', tone: 'wait' });
    expect(followUpFacts(entries['project:p4']!, NOW)).toEqual([
      'Envoyé le 14/11, en présentation',
    ]);
  });

  it('refusé : la ligne dit pourquoi, et d’où vient la réponse', () => {
    const refused = byKey(base)['project:p3']!;
    expect(followUpFacts(refused, NOW)).toEqual([
      'Envoyé le 14/11, en présentation',
      'Pas pour lui : Le quartier, Le prix · le 14/11, depuis le lien',
    ]);
    expect(followUpPill(refused)).toEqual({ text: 'Refusé', tone: 'no' });
  });

  it('visité puis « Pas pour moi » : refusé, sa visite et son compte rendu sur la ligne', () => {
    const entries = byKey({
      ...base,
      visits: [{ ...base.visits[0]!, refused: true }],
    });
    expect(entries['project:p1']?.group).toBe('refused');
    expect(entries['project:p1']?.visitIds).toEqual(['v1']);
  });

  it('écarté pour lui par le conseiller : en dernier, avec sa raison', () => {
    const dismissed = byKey(base)['listing:seloger:ABC']!;
    expect(dismissed.label).toBe('Maison · 5 pièces · 140 m² · Vence');
    expect(dismissed.itemId).toBeNull();
    expect(followUpFacts(dismissed, NOW)).toEqual([
      'Écarté pour lui il y a 4 jours : Prix au-dessus du budget',
    ]);
    expect(followUpPill(dismissed)).toEqual({ text: 'Écarté pour lui', tone: 'off' });
  });

  it('une sélection seulement enregistrée ne dit rien : il ne l’a pas reçue', () => {
    expect(
      buyerFollowUp({
        ...base,
        selections: [{ id: 's1', presented_at: null }],
        responses: [],
        visits: [],
        dismissals: [],
      }),
    ).toEqual([]);
  });

  it('par le lien, ou un envoi noté : la ligne le dit', () => {
    const shared = byKey({
      ...base,
      selections: [{ id: 's1', presented_at: null }],
      shares: [{ selection_id: 's1', occurred_at: '2026-11-21T09:00:00Z' }],
      responses: [],
      visits: [],
    });
    expect(followUpFacts(shared['project:p4']!, NOW)).toEqual([
      'Envoyé il y a 3 jours, par le lien',
    ]);
    const proposed = byKey({
      ...base,
      selections: [{ id: 's1', presented_at: null }],
      responses: [],
      visits: [],
      proposals: [
        {
          property_key: 'project:p4',
          label: 'Appartement · 3 pièces · 65 m² · p4',
          sent_at: '2026-11-23T09:00:00Z',
          selection_item_id: 'i4',
        },
      ],
    });
    expect(followUpFacts(proposed['project:p4']!, NOW)).toEqual(['Proposé hier']);
  });

  it('le même bien dans deux sélections : une seule ligne, sa dernière réponse vaut', () => {
    const entries = buyerFollowUp({
      ...base,
      selections: [...base.selections, { id: 's2', presented_at: '2026-11-18T09:00:00Z' }],
      items: [...base.items, item('i9', 'p3', { selection_id: 's2' })],
      responses: [
        ...base.responses,
        {
          selection_item_id: 'i9',
          answer: 'visit',
          reasons: [],
          answered_at: '2026-11-18T09:05:00Z',
          answered_during: 'presentation',
        },
      ],
    });
    const p3 = entries.filter((entry) => entry.key === 'project:p3');
    expect(p3).toHaveLength(1);
    expect(p3[0]?.group).toBe('waiting');
    expect(p3[0]?.itemId).toBe('i9');
    expect(p3[0]?.answer?.answer).toBe('visit');
  });
});

describe('la ligne du haut', () => {
  it('dit les nombres, sans les zéros', () => {
    expect(followUpSummary(buyerFollowUp(base), 1)).toBe(
      '4 biens envoyés · 1 visité · 1 visite à organiser · 1 refusé · 1 écarté pour lui',
    );
    expect(followUpSummary([], 0)).toBeNull();
  });
});

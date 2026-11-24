import { describe, expect, it } from 'vitest';

import {
  buyerFollowUp,
  followUpFacts,
  followUpOrigin,
  followUpPill,
  followUpSummary,
  type FollowUpRows,
} from '@/features/buyers/services/buyer-follow-up';
import { seenKeysOf, seenProperties } from '@/features/buyers/services/seen-properties';

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
const answer = (
  itemId: string,
  value: string,
  at: string,
  over: Partial<FollowUpRows['responses'][number]> = {},
) => ({
  selection_item_id: itemId,
  answer: value,
  reasons: [],
  answered_at: at,
  answered_during: 'presentation',
  ...over,
});
const visit = (
  id: string,
  itemId: string,
  requestedAt: string,
  over: Partial<FollowUpRows['visits'][number]> = {},
) => ({ id, itemId, requestedAt, visitedAt: null, opinion: null, outcome: 'to_plan', ...over });

// L'ordre réel des dates : les réponses d'une présentation sont données AVANT sa fin, qui la date
// (`presented_at`, posé par « Terminer »).
const base: FollowUpRows = {
  selections: [{ id: 's1', presented_at: '2026-11-14T09:30:00Z' }],
  shares: [],
  items: [item('i1', 'p1'), item('i2', 'p2'), item('i3', 'p3'), item('i4', 'p4')],
  proposals: [],
  responses: [
    answer('i1', 'visit', '2026-11-14T09:10:00Z'),
    answer('i2', 'maybe', '2026-11-14T09:12:00Z'),
    answer('i3', 'no', '2026-11-14T09:15:00Z', {
      reasons: ['district', 'price'],
      answered_during: 'dossier',
    }),
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
    visit('v1', 'i1', '2026-11-14T09:10:00Z', {
      visitedAt: '2026-11-22T15:00:00Z',
      opinion: 'love',
      outcome: 'visited',
    }),
    visit('v2', 'i1', '2026-11-22T16:00:00Z'),
  ],
  competitorUrls: new Map(),
};

const lines = (rows: FollowUpRows) =>
  buyerFollowUp(rows).map((entry) => [entry.key, entry.group, entry.visitIds]);
const one = (rows: FollowUpRows, key: string) =>
  buyerFollowUp(rows).find((entry) => entry.key === key && !entry.again)!;

describe('son suivi : un bien, une ligne', () => {
  it('range chaque bien par ce qu’il en a dit, dans l’ordre du point à faire avec lui', () => {
    expect(lines(base)).toEqual([
      ['project:p1', 'visited', ['v1']],
      // Sa deuxième visite, à organiser : elle a sa ligne.
      ['project:p1', 'to_visit', ['v2']],
      ['project:p2', 'waiting', []],
      ['project:p4', 'waiting', []],
      ['project:p3', 'refused', []],
      ['listing:seloger:ABC', 'dismissed', []],
    ]);
  });

  it('une réponse donnée pendant la présentation n’efface pas « en présentation »', () => {
    const visited = one(base, 'project:p1');
    expect(visited.itemId).toBe('i1');
    expect(followUpFacts(visited, NOW)).toEqual([
      'Envoyé le 14/11, en présentation',
      'Veut le visiter · le 14/11, pendant la présentation',
    ]);
    expect(followUpPill(visited)).toEqual({ text: 'Visité', tone: 'ok' });
    // La seconde ligne du même bien (sa visite à organiser) ne redit pas ses faits.
    const again = buyerFollowUp(base).find((entry) => entry.again)!;
    expect(again.key).toBe('project:p1');
    expect(followUpFacts(again, NOW)).toEqual([]);
    expect(followUpPill(again)).toEqual({ text: 'À organiser', tone: 'now' });
  });

  it('une visite demandée, pas encore faite : à organiser, une seule ligne', () => {
    const rows = { ...base, visits: [base.visits[1]!] };
    expect(lines(rows).filter(([key]) => key === 'project:p1')).toEqual([
      ['project:p1', 'to_visit', ['v2']],
    ]);
    expect(one(rows, 'project:p1').visited).toBe(false);
  });

  it('envoyé sans réponse, ou « Peut-être » : en attente', () => {
    expect(followUpPill(one(base, 'project:p2'))).toEqual({ text: 'Peut-être', tone: 'plain' });
    expect(followUpPill(one(base, 'project:p4'))).toEqual({ text: 'Sans réponse', tone: 'wait' });
    expect(followUpFacts(one(base, 'project:p4'), NOW)).toEqual([
      'Envoyé le 14/11, en présentation',
    ]);
  });

  it('refusé : la ligne dit pourquoi, et d’où vient la réponse', () => {
    const refused = one(base, 'project:p3');
    expect(followUpFacts(refused, NOW)).toEqual([
      'Envoyé le 14/11, en présentation',
      'Pas pour lui : Le quartier, Le prix · le 14/11, depuis le lien',
    ]);
    expect(followUpPill(refused)).toEqual({ text: 'Refusé', tone: 'no' });
  });

  it('visité puis « Pas pour moi » : refusé, sa visite et son compte rendu sur la ligne', () => {
    const rows = {
      ...base,
      visits: [{ ...base.visits[0]!, opinion: 'not_for_me', outcome: 'declined' }],
    };
    const refused = one(rows, 'project:p1');
    expect(refused.group).toBe('refused');
    expect(refused.visitIds).toEqual(['v1']);
    expect(refused.visited).toBe(true);
  });

  it('écarté pour lui par le conseiller : en dernier, avec sa raison', () => {
    const dismissed = one(base, 'listing:seloger:ABC');
    expect(dismissed.label).toBe('Maison · 5 pièces · 140 m² · Vence');
    expect(dismissed.itemId).toBeNull();
    expect(followUpOrigin(dismissed)).toBeNull();
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
    const shared = {
      ...base,
      selections: [{ id: 's1', presented_at: null }],
      shares: [{ selection_id: 's1', occurred_at: '2026-11-21T09:00:00Z' }],
      responses: [],
      visits: [],
    };
    expect(followUpFacts(one(shared, 'project:p4'), NOW)).toEqual([
      'Envoyé il y a 3 jours, par le lien',
    ]);
    const proposed = {
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
    };
    expect(followUpFacts(one(proposed, 'project:p4'), NOW)).toEqual(['Proposé hier']);
  });

  it('un envoi noté dont la ligne de sélection n’existe plus : le bien garde sa ligne', () => {
    const rows: FollowUpRows = {
      ...base,
      selections: [],
      items: [],
      responses: [],
      visits: [],
      dismissals: [],
      proposals: [
        {
          property_key: 'project:p9',
          label: 'Maison · 5 pièces · 135 m² · Vence',
          sent_at: '2026-11-10T09:00:00Z',
          selection_item_id: null,
        },
      ],
    };
    const [entry] = buyerFollowUp(rows);
    expect(entry).toMatchObject({
      key: 'project:p9',
      label: 'Maison · 5 pièces · 135 m² · Vence',
      itemId: null,
      group: 'waiting',
    });
    expect(followUpFacts(entry!, NOW)).toEqual(['Proposé le 10/11']);
  });

  it('un bien retiré de la sélection avant l’envoi n’y figure pas ; s’il y a répondu, si', () => {
    const removed = base.items.map((row) =>
      row.id === 'i4' || row.id === 'i3' ? { ...row, removed_at: '2026-11-13T08:00:00Z' } : row,
    );
    const keys = buyerFollowUp({ ...base, items: removed }).map((entry) => entry.key);
    expect(keys).not.toContain('project:p4');
    expect(keys).toContain('project:p3');
  });

  it('le même bien dans deux sélections : une seule ligne, toutes ses réponses, la dernière vaut', () => {
    const rows = {
      ...base,
      selections: [...base.selections, { id: 's2', presented_at: '2026-11-18T09:30:00Z' }],
      items: [...base.items, item('i9', 'p3', { selection_id: 's2' })],
      responses: [...base.responses, answer('i9', 'visit', '2026-11-18T09:05:00Z')],
    };
    const p3 = buyerFollowUp(rows).filter((entry) => entry.key === 'project:p3');
    expect(p3).toHaveLength(1);
    expect(p3[0]?.group).toBe('waiting');
    expect(p3[0]?.itemId).toBe('i9');
    // M122 — chaque réponse reste lisible, avec ses raisons, son moment et sa date.
    expect(followUpFacts(p3[0]!, NOW)).toEqual([
      'Envoyé le 14/11, en présentation',
      'Pas pour lui : Le quartier, Le prix · le 14/11, depuis le lien',
      'Veut le visiter · il y a 6 jours, pendant la présentation',
    ]);
    expect(followUpPill(p3[0]!)).toEqual({ text: 'Veut le visiter', tone: 'ok' });
  });

  it('un concurrent à prospecter n’est pas « dans l’agence »', () => {
    const rows = {
      ...base,
      items: [item('i1', 'p1'), item('i5', 'c1', { source: 'competitor' })],
      responses: [],
      visits: [],
      dismissals: [],
    };
    const origins = buyerFollowUp(rows).map(followUpOrigin);
    expect(origins.sort()).toEqual(['Concurrent à prospecter', 'Dans l’agence']);
    expect(followUpOrigin({ source: 'listing' })).toBe('Annonce du marché');
  });
});

describe('la ligne du haut', () => {
  it('dit les nombres, sans les zéros ; un bien sur deux lignes compte une fois', () => {
    expect(followUpSummary(buyerFollowUp(base), 1)).toBe(
      '4 biens envoyés · 1 visité · 1 visite à organiser · 1 refusé · 1 écarté pour lui',
    );
    expect(followUpSummary([], 0)).toBeNull();
  });

  it('un bien refusé dont la visite n’est que demandée n’est pas « visité »', () => {
    const rows = {
      ...base,
      visits: [visit('v3', 'i3', '2026-11-14T09:00:00Z')],
      dismissals: [],
    };
    expect(followUpSummary(buyerFollowUp(rows), 1)).toBe(
      '4 biens envoyés · 1 visite à organiser · 1 refusé',
    );
  });
});

// La même règle que « jamais reproposé » (Lancement 3) : ce que le suivi range en « refusés » ou
// « écartés » est exactement ce que les listes ne reproposent plus pour ces raisons.
describe('le suivi et « jamais reproposé » disent la même chose', () => {
  it('refusé, écarté, visité, envoyé : bien par bien', () => {
    const seen = Object.fromEntries(
      seenKeysOf(
        seenProperties({
          dismissals: base.dismissals.map((row) => ({ ...row, buyer_id: 'b' })),
          proposals: [],
          selections: base.selections.map((row) => ({ ...row, buyer_id: 'b' })),
          shares: base.shares,
          items: base.items,
          responses: base.responses,
          visits: base.visits.map((row) => ({
            buyer_selection_item_id: row.itemId,
            requested_at: row.requestedAt,
            visited_at: row.visitedAt,
            opinion: row.opinion,
            outcome: row.outcome,
          })),
          competitorUrls: base.competitorUrls,
        }),
        'b',
      ).map((fact) => [fact.key, fact.reason]),
    );
    const expected = { refused: 'refused', dismissed: 'dismissed', visited: 'visited' } as const;
    for (const entry of buyerFollowUp(base).filter((line) => !line.again)) {
      const group = entry.group;
      expect(seen[entry.key], entry.key).toBe(
        group === 'refused' || group === 'dismissed' || group === 'visited'
          ? expected[group]
          : 'sent',
      );
    }
  });
});

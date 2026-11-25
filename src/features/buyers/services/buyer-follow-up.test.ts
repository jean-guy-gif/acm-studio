import { describe, expect, it } from 'vitest';

import {
  buyerFollowUp,
  followUpFacts,
  followUpOrigin,
  followUpPill,
  followUpSummary,
  seenWithHim,
  selectionFollowed,
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

// Lancement, mission 10 — « Sa sélection » ne garde son bloc que tant qu'elle est à présenter : la
// règle se lit par BIEN (la clé de la boucle), jamais par ligne de sélection.
describe('la sélection en cours est-elle déjà dans « Son suivi » ?', () => {
  it('présentée : chacun de ses biens y a sa ligne', () => {
    expect(selectionFollowed(['i1', 'i2', 'i3', 'i4'], base, buyerFollowUp(base))).toBe(true);
  });

  it('une sélection neuve qui recopie les mêmes biens : toujours dans le suivi, quelle que soit la ligne', () => {
    // « Proposer ce bien » recopie ses biens dans une sélection neuve (d'autres lignes, les mêmes
    // biens) ; une visite notée ensuite sur l'ancienne ligne ne fait pas revenir « Sa sélection ».
    const rows: FollowUpRows = {
      ...base,
      selections: [...base.selections, { id: 's2', presented_at: null }],
      items: [
        ...base.items,
        item('j1', 'p1', { selection_id: 's2' }),
        item('j2', 'p2', { selection_id: 's2' }),
      ],
    };
    expect(selectionFollowed(['j1', 'j2'], rows, buyerFollowUp(rows))).toBe(true);
  });

  it('une sélection neuve avec un bien qu’il n’a jamais reçu : elle reste à présenter', () => {
    const rows: FollowUpRows = {
      ...base,
      selections: [...base.selections, { id: 's2', presented_at: null }],
      items: [
        ...base.items,
        item('j1', 'p1', { selection_id: 's2' }),
        item('j9', 'p9', { selection_id: 's2' }),
      ],
    };
    expect(selectionFollowed(['j1', 'j9'], rows, buyerFollowUp(rows))).toBe(false);
  });

  it('pas encore envoyée, vide, ou un bien inconnu : non', () => {
    const fresh: FollowUpRows = {
      ...base,
      selections: [{ id: 's1', presented_at: null }],
      responses: [],
      visits: [],
    };
    expect(selectionFollowed(['i1', 'i2'], fresh, buyerFollowUp(fresh))).toBe(false);
    expect(selectionFollowed([], base, buyerFollowUp(base))).toBe(false);
    expect(selectionFollowed(['inconnu'], base, buyerFollowUp(base))).toBe(false);
  });

  it('un bien seulement écarté pour lui ne compte pas comme reçu', () => {
    const rows: FollowUpRows = {
      ...base,
      selections: [{ id: 's1', presented_at: null }],
      responses: [],
      visits: [],
      items: [
        item('i1', 'p1', {
          source: 'listing',
          reference: 'https://www.seloger.com/annonces/achat/maison/vence-06/ABC.htm',
        }),
      ],
    };
    const entries = buyerFollowUp(rows);
    expect(selectionFollowed(['i1'], rows, entries)).toBe(false);
  });
});

// Lancement, mission 3 (suite, Jean-Guy, 25/11) — sur les biens idéaux, « Déjà vus avec lui » : les
// biens qu'il a reçus, visités ou refusés, à part, chacun avec sa mention, sans case « Retenir ».
describe('« Déjà vus avec lui »', () => {
  const rows: FollowUpRows = {
    ...base,
    visits: [
      visit('v1', 'i1', '2026-11-14T09:10:00Z', {
        visitedAt: '2026-11-20T15:00:00Z',
        opinion: 'interested',
        outcome: 'follow_up',
      }),
    ],
  };
  const list = () => seenWithHim(buyerFollowUp(rows), rows.visits, NOW);
  const mention = (reference: string) =>
    list().find((line) => line.label.endsWith(reference))?.mention;

  it('chaque bien une fois, avec sa mention : visité, présenté, refusé et pourquoi', () => {
    // Dates du conseiller, relatives (M143) : « il y a 4 jours », puis « le 14/11 ».
    expect(mention('p1')).toBe('Visité il y a 4 jours');
    expect(mention('p2')).toBe('Présenté le 14/11');
    expect(mention('p3')).toBe('Refusé : Le quartier, Le prix');
    expect(mention('p4')).toBe('Présenté le 14/11');
    expect(list()).toHaveLength(4);
  });

  it('ce que le conseiller a écarté pour lui n’y est pas : il ne l’a pas vu', () => {
    expect(list().some((line) => line.label.includes('Vence'))).toBe(false);
  });

  // Vu chez un vrai acquéreur (25/11) : le lien partagé trois minutes avant la fin de la
  // présentation faisait dire « Envoyé le 13/11, par le lien » d'un bien présenté avec lui.
  it('présenté avec lui : la présentation l’emporte sur un lien partagé plus tôt', () => {
    const both = {
      ...base,
      shares: [{ selection_id: 's1', occurred_at: '2026-11-14T09:00:00Z' }],
      responses: [],
      dismissals: [],
      visits: [],
    };
    const list = seenWithHim(buyerFollowUp(both), [], NOW);
    expect(list.map((line) => line.mention)).toEqual([
      'Présenté le 14/11',
      'Présenté le 14/11',
      'Présenté le 14/11',
      'Présenté le 14/11',
    ]);
    // « Son suivi » garde sa règle : le plus ancien moyen connu.
    expect(followUpFacts(buyerFollowUp(both)[0], NOW)[0]).toBe('Envoyé le 14/11, par le lien');
  });

  it('envoyé par le lien, ou proposé : la mention dit comment', () => {
    const shared = {
      ...base,
      selections: [{ id: 's1', presented_at: null }],
      shares: [{ selection_id: 's1', occurred_at: '2026-11-23T08:00:00Z' }],
      responses: [],
      dismissals: [],
      visits: [],
    };
    expect(seenWithHim(buyerFollowUp(shared), [], NOW)[0].mention).toBe('Envoyé hier, par le lien');
  });

  it('refusé après la visite : la mention dit ce qui l’a gêné (M139)', () => {
    const refused = {
      ...rows,
      visits: [
        visit('v1', 'i1', '2026-11-14T09:10:00Z', {
          visitedAt: '2026-11-20T15:00:00Z',
          opinion: 'not_for_me',
          outcome: 'declined',
        }),
      ],
    };
    const mention = (disliked: string[]) =>
      seenWithHim(
        buyerFollowUp(refused),
        refused.visits.map((one) => ({ ...one, disliked })),
        NOW,
      ).find((line) => line.label.endsWith('p1'))?.mention;
    expect(mention(['price', 'district'])).toBe('Refusé après la visite : le quartier, le prix');
    expect(mention([])).toBe('Refusé après la visite');
  });

  it('une réponse sur le lien, sans partage noté : ses autres biens lui sont parvenus aussi', () => {
    const answered = {
      ...base,
      selections: [{ id: 's1', presented_at: null }],
      responses: [answer('i2', 'maybe', '2026-11-20T08:00:00Z', { answered_during: 'dossier' })],
      dismissals: [],
      visits: [],
    };
    const list = seenWithHim(buyerFollowUp(answered), [], NOW);
    expect(list.map((line) => line.label.slice(-2)).sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(list.find((line) => line.label.endsWith('p1'))?.mention).toBe(
      'Envoyé il y a 4 jours, par le lien',
    );
  });

  it('une visite à organiser : dite avec la présentation', () => {
    const asked = { ...rows, visits: [visit('v1', 'i1', '2026-11-14T09:10:00Z')] };
    expect(
      seenWithHim(buyerFollowUp(asked), asked.visits, NOW).find((line) => line.label.endsWith('p1'))
        ?.mention,
    ).toBe('Présenté le 14/11 · visite à organiser');
  });

  it('une sélection seulement enregistrée : rien de vu', () => {
    const saved = {
      ...base,
      selections: [{ id: 's1', presented_at: null }],
      responses: [],
      dismissals: [],
      visits: [],
    };
    expect(seenWithHim(buyerFollowUp(saved), [], NOW)).toEqual([]);
  });
});

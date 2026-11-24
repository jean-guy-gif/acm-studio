import { describe, expect, it } from 'vitest';

import {
  contactedOf,
  countSeen,
  keptForProposal,
  ruledOutOf,
  seenKeysOf,
  seenLine,
  seenProperties,
  type SeenRows,
} from '@/features/buyers/services/seen-properties';

// Lancement, mission 3 — « un bien déjà envoyé, visité ou refusé n'est jamais reproposé » : une
// seule règle, lue dans les faits datés qui existent.
const base: SeenRows = {
  dismissals: [],
  proposals: [],
  selections: [{ id: 's1', buyer_id: 'keller', presented_at: null }],
  shares: [],
  items: [
    { id: 'i1', selection_id: 's1', source: 'project', reference: 'p1', removed_at: null },
    {
      id: 'i2',
      selection_id: 's1',
      source: 'listing',
      reference: 'https://www.seloger.com/annonces/achat/maison/vence-06140/26ZEJMLWB13Y',
      removed_at: null,
    },
    { id: 'i3', selection_id: 's1', source: 'competitor', reference: 'c1', removed_at: null },
  ],
  responses: [],
  visits: [],
  competitorUrls: new Map([
    ['c1', 'https://www.bienici.com/annonce/vente/vence/maison/5pieces/apimo-85508663'],
  ]),
};

const factsOf = (rows: SeenRows, buyerId = 'keller') =>
  Object.fromEntries(
    seenKeysOf(seenProperties(rows), buyerId).map((fact) => [fact.key, fact.reason]),
  );

describe('ce que l’acquéreur a déjà vu', () => {
  it('une sélection seulement enregistrée ne compte pas : il ne l’a pas reçue', () => {
    expect(factsOf(base)).toEqual({});
  });

  it('une sélection présentée : ses biens sont envoyés, par la clé de la boucle', () => {
    const facts = factsOf({
      ...base,
      selections: [{ id: 's1', buyer_id: 'keller', presented_at: '2026-11-10T10:00:00Z' }],
    });
    expect(facts['project:p1']).toBe('sent');
    expect(Object.keys(facts)).toHaveLength(3);
    expect(Object.keys(facts).filter((key) => key.startsWith('listing:'))).toHaveLength(2);
  });

  it('un lien partagé, ou un envoi noté sur un de ses biens : toute la sélection est envoyée', () => {
    expect(
      factsOf({ ...base, shares: [{ selection_id: 's1', occurred_at: '2026-11-11T09:00:00Z' }] })[
        'project:p1'
      ],
    ).toBe('sent');
    const noted = seenProperties({
      ...base,
      proposals: [
        {
          buyer_id: 'keller',
          property_key: 'project:p1',
          sent_at: '2026-11-12T09:00:00Z',
          selection_item_id: 'i1',
        },
      ],
    });
    expect(seenKeysOf(noted, 'keller')).toHaveLength(3);
    expect(contactedOf(noted).get('project:p1')?.get('keller')).toEqual({
      at: '2026-11-12T09:00:00Z',
      visited: false,
    });
  });

  it('un bien retiré de la sélection avant l’envoi n’a pas été vu', () => {
    const facts = factsOf({
      ...base,
      selections: [{ id: 's1', buyer_id: 'keller', presented_at: '2026-11-10T10:00:00Z' }],
      items: base.items.map((item) =>
        item.id === 'i1' ? { ...item, removed_at: '2026-11-09T10:00:00Z' } : item,
      ),
    });
    expect(facts['project:p1']).toBeUndefined();
    expect(Object.keys(facts)).toHaveLength(2);
  });

  it('« Pas pour moi » : refusé ; sa dernière réponse vaut', () => {
    const refused = {
      ...base,
      responses: [{ selection_item_id: 'i1', answer: 'no', answered_at: '2026-11-10T10:00:00Z' }],
    };
    expect(factsOf(refused)['project:p1']).toBe('refused');
    // Il se ravise sur le lien : le bien n'est plus refusé, il lui a été envoyé.
    expect(
      factsOf({
        ...refused,
        responses: [
          ...refused.responses,
          { selection_item_id: 'i1', answer: 'visit', answered_at: '2026-11-12T10:00:00Z' },
        ],
      })['project:p1'],
    ).toBe('sent');
  });

  it('une visite demandée : envoyé ; faite : visité ; « Pas pour moi » après la visite : refusé', () => {
    const asked = {
      buyer_selection_item_id: 'i1',
      requested_at: '2026-11-10T10:00:00Z',
      visited_at: null,
      opinion: null,
      outcome: 'to_plan',
    };
    expect(factsOf({ ...base, visits: [asked] })['project:p1']).toBe('sent');
    const done = { ...asked, visited_at: '2026-11-14T10:00:00Z', outcome: 'visited' };
    const seen = seenProperties({ ...base, visits: [done] });
    expect(seenKeysOf(seen, 'keller')).toEqual([{ key: 'project:p1', reason: 'visited' }]);
    expect(contactedOf(seen).get('project:p1')?.get('keller')).toEqual({
      at: '2026-11-14T10:00:00Z',
      visited: true,
    });
    expect(
      factsOf({
        ...base,
        responses: [
          { selection_item_id: 'i1', answer: 'visit', answered_at: '2026-11-10T10:00:00Z' },
        ],
        visits: [{ ...done, opinion: 'not_for_me', outcome: 'declined' }],
      })['project:p1'],
    ).toBe('refused');
  });

  it('écarté par le conseiller : écarté, quoi qu’il arrive ensuite', () => {
    const seen = seenProperties({
      ...base,
      selections: [{ id: 's1', buyer_id: 'keller', presented_at: '2026-11-10T10:00:00Z' }],
      dismissals: [{ buyer_id: 'keller', property_key: 'project:p1' }],
    });
    expect(seenKeysOf(seen, 'keller').find((fact) => fact.key === 'project:p1')?.reason).toBe(
      'dismissed',
    );
  });

  it('chacun ses biens : ce qu’un acquéreur a vu ne dit rien d’un autre', () => {
    const seen = seenProperties({
      ...base,
      selections: [
        { id: 's1', buyer_id: 'keller', presented_at: '2026-11-10T10:00:00Z' },
        { id: 's2', buyer_id: 'rossi', presented_at: null },
      ],
      items: [
        ...base.items,
        { id: 'i9', selection_id: 's2', source: 'project', reference: 'p1', removed_at: null },
      ],
    });
    expect(seenKeysOf(seen, 'rossi')).toEqual([]);
    expect(seenKeysOf(seen, 'keller')).toHaveLength(3);
  });
});

describe('ce que la boucle en lit', () => {
  const seen = seenProperties({
    ...base,
    selections: [{ id: 's1', buyer_id: 'keller', presented_at: '2026-11-10T10:00:00Z' }],
    responses: [{ selection_item_id: 'i1', answer: 'no', answered_at: '2026-11-10T10:30:00Z' }],
    dismissals: [{ buyer_id: 'rossi', property_key: 'project:p1' }],
  });

  it('écarté ou refusé : le bien n’est plus pour lui', () => {
    expect([...(ruledOutOf(seen).get('project:p1') ?? [])].sort()).toEqual(['keller', 'rossi']);
  });

  it('envoyé ou visité : il l’a déjà ; refusé ou écarté n’y est pas', () => {
    const contacted = contactedOf(seen);
    expect(contacted.get('project:p1')).toBeUndefined();
    expect([...contacted.keys()]).toHaveLength(2);
  });
});

describe('la ligne dite au conseiller', () => {
  it('rien de caché : rien à dire', () => {
    expect(seenLine({ sent: 0, visited: 0, refused: 0 })).toBeNull();
  });

  it('dit le nombre et pourquoi, au singulier comme au pluriel', () => {
    expect(seenLine({ sent: 1, visited: 0, refused: 0 })).toBe(
      '1 bien ne lui est pas reproposé : 1 déjà envoyé.',
    );
    expect(seenLine({ sent: 2, visited: 1, refused: 1 })).toBe(
      '4 biens ne lui sont pas reproposés : 2 déjà envoyés, 1 visité, 1 refusé.',
    );
    expect(seenLine(countSeen(['sent', undefined, 'refused', 'dismissed', 'sent']))).toBe(
      '3 biens ne lui sont pas reproposés : 2 déjà envoyés, 1 refusé.',
    );
  });
});

describe('le lien de proposition', () => {
  it('ne recopie ni un bien refusé, ni visité, ni écarté ; un bien envoyé sans réponse reste', () => {
    const items = [
      { source: 'project', reference: 'p1' },
      { source: 'project', reference: 'p2' },
      { source: 'project', reference: 'p3' },
      { source: 'project', reference: 'p4' },
      { source: 'project', reference: 'p5' },
    ];
    const facts = new Map([
      ['project:p1', { reason: 'refused' as const, at: '2026-11-10T10:00:00Z' }],
      ['project:p2', { reason: 'sent' as const, at: '2026-11-10T10:00:00Z' }],
      ['project:p3', { reason: 'visited' as const, at: '2026-11-10T10:00:00Z' }],
      ['project:p4', { reason: 'dismissed' as const, at: null }],
    ]);
    const keyOf = (item: { source: string; reference: string }) =>
      `${item.source}:${item.reference}`;
    expect(keptForProposal(items, facts, keyOf).map((item) => item.reference)).toEqual([
      'p2',
      'p5',
    ]);
    expect(keptForProposal(items, undefined, keyOf)).toHaveLength(5);
  });
});

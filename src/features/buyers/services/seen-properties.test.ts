import { describe, expect, it } from 'vitest';

import {
  candidateTarget,
  contactedOf,
  countSeen,
  currentSeenLabel,
  currentSeenReason,
  isClosedForBuyer,
  keptForProposal,
  receivedSelections,
  ruledOutOf,
  seenKeysOf,
  seenLine,
  seenMarksOf,
  seenMatcher,
  seenProperties,
  toLike,
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
      '1 bien retiré parce que déjà vu avec lui\u00a0: 1 déjà envoyé.',
    );
    expect(seenLine({ sent: 2, visited: 1, refused: 1 })).toBe(
      '4 biens retirés parce que déjà vus avec lui\u00a0: 2 déjà envoyés, 1 visité, 1 refusé.',
    );
    expect(seenLine(countSeen(['sent', undefined, 'refused', 'dismissed', 'sent']))).toBe(
      '3 biens retirés parce que déjà vus avec lui\u00a0: 2 déjà envoyés, 1 refusé.',
    );
  });
});

describe('le lien de proposition', () => {
  it('ne recopie ni un bien refusé ni un bien écarté ; envoyé ou visité sans refus, il reste', () => {
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
      'p3',
      'p5',
    ]);
    expect(keptForProposal(items, undefined, keyOf)).toHaveLength(5);
  });
});

// Lancement, mission 3 (suite, Jean-Guy, 25/11) — vu chez un vrai acquéreur : une maison présentée le
// 13/11 ressortait 1re du marché le 25/11. Le fournisseur de la recherche la rendait sous une
// autre annonce : la clé de la boucle (l'annonce publiée) ne la reconnaissait plus.
describe('le même bien sous une autre annonce', () => {
  const house = { city: 'Mouans-Sartoux', rooms: 6, surface: 257, price: 1_698_000 };
  const presented: SeenRows = {
    ...base,
    selections: [{ id: 's1', buyer_id: 'keller', presented_at: '2026-11-13T16:04:00Z' }],
    items: [
      {
        id: 'i2',
        selection_id: 's1',
        source: 'listing',
        reference: 'https://www.bienici.com/annonce/ag133861-559023029',
        removed_at: null,
        property_id: 'se-735ba130',
        like: house,
      },
      { id: 'i3', selection_id: 's1', source: 'competitor', reference: 'c1', removed_at: null },
    ],
    competitorLikes: new Map([
      ['c1', { city: 'Mougins', rooms: 6, surface: 283, price: 1_696_000 }],
    ]),
  };
  const match = (rows: SeenRows) => {
    const facts = seenKeysOf(seenProperties(rows), 'keller');
    return seenMatcher(facts, seenMarksOf(rows).get('keller') ?? []);
  };
  const elsewhere = 'listing:seloger:26555NBRWCHG';

  it('par son annonce publiée, comme avant', () => {
    expect(match(presented)({ key: 'listing:bienici:ag133861-559023029' })).toBe('sent');
  });

  it('par son identifiant chez le fournisseur, quand son annonce a changé', () => {
    expect(match(presented)({ key: elsewhere, propertyId: 'se-735ba130' })).toBe('sent');
    expect(match(presented)({ key: elsewhere, propertyId: 'se-autre' })).toBeUndefined();
  });

  it('à défaut : même commune, même prix, mêmes pièces, surface à 2 m² près', () => {
    const seen = match(presented);
    expect(seen({ key: elsewhere, like: { ...house, city: 'MOUANS SARTOUX', surface: 255 } })).toBe(
      'sent',
    );
    expect(seen({ key: elsewhere, like: { ...house, surface: 260 } })).toBeUndefined();
    expect(seen({ key: elsewhere, like: { ...house, price: 1_732_000 } })).toBeUndefined();
    expect(seen({ key: elsewhere, like: { ...house, rooms: 5 } })).toBeUndefined();
    expect(seen({ key: elsewhere, like: { ...house, city: 'Mougins' } })).toBeUndefined();
  });

  it('une donnée qui manque ne fait pas une ressemblance', () => {
    const seen = match(presented);
    expect(seen({ key: elsewhere, like: toLike({ ...house, rooms: null }) })).toBeUndefined();
    expect(toLike({ city: '  ', rooms: 6, surface: 257, price: 1 })).toBeNull();
    expect(toLike({ city: 'Vence', rooms: '5', surface: '135.0', price: '713000' })).toEqual({
      city: 'Vence',
      rooms: 5,
      surface: 135,
      price: 713_000,
    });
  });

  it('un concurrent de l’agence qu’il a vu est reconnu sous une annonce du marché', () => {
    expect(
      match(presented)({
        key: elsewhere,
        like: { city: 'Mougins', rooms: 6, surface: 284, price: 1_696_000 },
      }),
    ).toBe('sent');
  });

  it('son dernier mot vaut aussi sous l’autre annonce : refusé', () => {
    const refused = match({
      ...presented,
      responses: [{ selection_item_id: 'i2', answer: 'no', answered_at: '2026-11-13T16:10:00Z' }],
    });
    expect(refused({ key: elsewhere, propertyId: 'se-735ba130' })).toBe('refused');
  });

  it('une sélection seulement enregistrée, ou un bien retiré avant l’envoi, ne retire rien', () => {
    const saved = {
      ...presented,
      selections: [{ id: 's1', buyer_id: 'keller', presented_at: null }],
    };
    expect(match(saved)({ key: elsewhere, propertyId: 'se-735ba130' })).toBeUndefined();
    const removed = {
      ...presented,
      items: presented.items.map((item) => ({ ...item, removed_at: '2026-11-13T16:00:00Z' })),
    };
    expect(match(removed)({ key: elsewhere, propertyId: 'se-735ba130' })).toBeUndefined();
  });

  it('chacun ses biens : la marque d’un acquéreur ne dit rien d’un autre', () => {
    expect(seenMarksOf(presented).get('rossi')).toBeUndefined();
  });
});

describe('sa sélection retenue, pas encore reçue, sur les biens idéaux', () => {
  it('refusé ou écarté : plus coché, dit à l’écran ; visité sans refus : reste, dit aussi', () => {
    expect(currentSeenReason('refused')).toBe('refused');
    expect(currentSeenReason('dismissed')).toBe('dismissed');
    expect(currentSeenReason('visited')).toBe('visited');
    expect(currentSeenReason('sent')).toBeNull();
    expect(currentSeenReason(undefined)).toBeNull();
    expect(isClosedForBuyer('refused')).toBe(true);
    expect(isClosedForBuyer('dismissed')).toBe(true);
    expect(isClosedForBuyer('visited')).toBe(false);
    expect(isClosedForBuyer(undefined)).toBe(false);
    expect(currentSeenLabel('refused')).toBe(
      'Refusé par lui\u00a0: il ne sera pas repris dans sa prochaine sélection.',
    );
    expect(currentSeenLabel('visited')).toBe('Déjà visité.');
    expect(currentSeenLabel(undefined)).toBeNull();
  });
});

// Suite du 25/11 — une sélection qu'il a reçue n'est plus « actuelle » : rien n'est coché en
// arrivant sur les biens idéaux, ses biens passent sous « Déjà vus avec lui ».
describe('la sélection lui est-elle parvenue ?', () => {
  it('seulement enregistrée : non', () => {
    expect(receivedSelections(base).has('s1')).toBe(false);
  });

  it('présentée, son lien partagé, ou un envoi noté sur l’un de ses biens : oui, à la plus ancienne date', () => {
    const presented = receivedSelections({
      ...base,
      selections: [{ id: 's1', buyer_id: 'keller', presented_at: '2026-11-13T16:04:00Z' }],
      shares: [{ selection_id: 's1', occurred_at: '2026-11-12T09:00:00Z' }],
    });
    expect(presented.get('s1')).toBe('2026-11-12T09:00:00Z');
    const proposed = receivedSelections({
      ...base,
      proposals: [
        {
          buyer_id: 'keller',
          property_key: 'project:p1',
          sent_at: '2026-11-20T10:00:00Z',
          selection_item_id: 'i1',
        },
      ],
    });
    expect(proposed.get('s1')).toBe('2026-11-20T10:00:00Z');
  });
});

// Relecture du 25/11 — une réponse de l'acquéreur dit qu'il a reçu la sélection ; une visite demandée
// par le conseiller seul, non.
describe('reçue par une réponse', () => {
  it('une réponse sur l’un de ses biens : la sélection lui est parvenue, à cette date', () => {
    const received = receivedSelections({
      ...base,
      responses: [
        { selection_item_id: 'i2', answer: 'maybe', answered_at: '2026-11-12T09:00:00Z' },
      ],
    });
    expect(received.get('s1')).toBe('2026-11-12T09:00:00Z');
  });

  it('ses autres biens sont envoyés, eux aussi', () => {
    const facts = factsOf({
      ...base,
      responses: [{ selection_item_id: 'i1', answer: 'no', answered_at: '2026-11-12T09:00:00Z' }],
    });
    expect(facts['project:p1']).toBe('refused');
    expect(Object.values(facts).filter((reason) => reason === 'sent')).toHaveLength(2);
  });
});

describe('la raison la plus forte, et la cible d’une annonce', () => {
  it('un bien qui en rappelle deux : écarté l’emporte sur envoyé, refusé sur visité', () => {
    const like = { city: 'Vence', rooms: 5, surface: 135, price: 713_000 };
    const seen = seenMatcher(
      [
        { key: 'listing:a', reason: 'sent' },
        { key: 'listing:b', reason: 'dismissed' },
      ],
      [
        { key: 'listing:a', propertyId: 'se-1', like },
        { key: 'listing:b', propertyId: null, like },
      ],
    );
    expect(seen({ key: 'listing:autre', propertyId: 'se-1', like })).toBe('dismissed');
  });

  it('une annonce de la recherche : son identifiant chez le fournisseur et sa ressemblance', () => {
    expect(
      candidateTarget('listing:seloger:X', {
        key: 'se-735',
        city: 'Mouans-Sartoux',
        roomsCount: 6,
        surfaceArea: 257,
        price: 1_698_000,
      }),
    ).toEqual({
      key: 'listing:seloger:X',
      propertyId: 'se-735',
      like: { city: 'Mouans-Sartoux', rooms: 6, surface: 257, price: 1_698_000 },
    });
    expect(
      candidateTarget('listing:x', {
        key: null,
        city: null,
        roomsCount: 6,
        surfaceArea: 257,
        price: 1,
      }),
    ).toEqual({ key: 'listing:x', propertyId: null, like: null });
  });
});

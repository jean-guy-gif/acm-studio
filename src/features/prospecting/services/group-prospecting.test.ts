import { describe, expect, it } from 'vitest';

import {
  cardCopy,
  cardDates,
  groupProspecting,
  sellersLabel,
} from '@/features/prospecting/services/group-prospecting';
import {
  applyProspectingMove,
  prospectingCounters,
  prospectingStatus,
} from '@/features/prospecting/services/prospecting-status';
import { addressed, entry, row } from '@/features/prospecting/services/test-cards';

const T1 = '2026-10-01T08:00:00.000Z';
const T2 = '2026-10-05T08:00:00.000Z';
const ADDRESS = '8 avenue du Docteur Hochet, 06160 Antibes';

describe('groupProspecting — une carte par bien', () => {
  it('regroupe par clé d’annonce : deux mandats, une carte, « Pour : … ; … »', () => {
    const cards = groupProspecting([
      entry('martin', row('a', { listingKey: 'seloger:123' })),
      entry('martin', row('b', { listingKey: 'seloger:456' })),
      entry('dupont', row('c', { listingKey: 'seloger:123' })),
    ]);
    expect(cards.map((card) => card.copies.map((copy) => copy.row.id))).toEqual([
      ['a', 'c'],
      ['b'],
    ]);
    expect(sellersLabel(cards[0].sellers)).toBe(
      'Vendeur martin · Appartement · Vence\u202f; Vendeur dupont · Appartement · Vence',
    );
    expect(cards[1].sellers.map((item) => item.projectId)).toEqual(['martin']);
  });

  it('le même numéro sur deux portails n’est pas la même annonce', () => {
    const cards = groupProspecting([
      entry('martin', row('a', { listingKey: 'seloger:123' })),
      entry('dupont', row('b', { listingKey: 'bienici:123' })),
    ]);
    expect(cards).toHaveLength(2);
  });

  it('regroupe par adresse confirmée, une fois normalisée', () => {
    const cards = groupProspecting([
      entry('martin', addressed('a', ADDRESS, { listingKey: 'seloger:1' })),
      entry(
        'dupont',
        addressed('b', '8, av. du Dr Hochet — 06160 ANTIBES', { listingKey: 'bienici:9' }),
      ),
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0].sellers).toHaveLength(2);
  });

  it('une adresse seulement proposée ne regroupe rien', () => {
    const cards = groupProspecting([
      entry('martin', addressed('a', ADDRESS)),
      entry('dupont', row('b', { address: ADDRESS, confirmed: false })),
    ]);
    expect(cards).toHaveLength(2);
  });

  it('deux appartements d’un même immeuble restent deux cartes', () => {
    expect(
      groupProspecting([
        entry('martin', addressed('a', ADDRESS, { surfaceArea: 62 })),
        entry('dupont', addressed('b', ADDRESS, { surfaceArea: 85 })),
      ]),
    ).toHaveLength(2);
    expect(
      groupProspecting([
        entry('martin', addressed('a', ADDRESS, { roomsCount: 3 })),
        entry('dupont', addressed('b', ADDRESS, { roomsCount: 4 })),
      ]),
    ).toHaveLength(2);
    // À 2 m² près, ou sans surface connue d'un côté : le même bien.
    expect(
      groupProspecting([
        entry('martin', addressed('a', ADDRESS, { surfaceArea: 62 })),
        entry('dupont', addressed('b', ADDRESS, { surfaceArea: 63.5 })),
        entry('durand', addressed('c', ADDRESS, { surfaceArea: null, roomsCount: null })),
      ]),
    ).toHaveLength(1);
  });

  it('enchaîne les liens : A et B par l’annonce, B et C par l’adresse', () => {
    const cards = groupProspecting([
      entry('martin', row('a', { listingKey: 'seloger:1' })),
      entry('dupont', addressed('b', ADDRESS, { listingKey: 'seloger:1' })),
      entry('durand', addressed('c', ADDRESS, { listingKey: 'bienici:7' })),
    ]);
    expect(cards).toHaveLength(1);
    // La copie de référence est celle dont l'adresse est confirmée.
    expect(cards[0].row.id).toBe('b');
    expect(cards[0].row.address).toBe(ADDRESS);
  });

  it('sans annonce ni adresse confirmée, chaque concurrent garde sa carte', () => {
    expect(groupProspecting([entry('martin', row('a')), entry('dupont', row('b'))])).toHaveLength(
      2,
    );
  });
});

describe('le statut d’une carte vaut pour ses copies', () => {
  const copies = [
    entry('martin', row('a', { listingKey: 'seloger:1', handedAt: T2 })),
    entry('dupont', addressed('b', ADDRESS, { listingKey: 'seloger:1' })),
  ];

  it('un fait posé sur une copie se lit sur la carte', () => {
    const [card] = groupProspecting(copies);
    expect(card.row.status).toBe('handed');
    expect(card.row.handedAt).toBe(T2);
  });

  it('« prêt » dès qu’une copie a son adresse confirmée', () => {
    const [card] = groupProspecting([
      entry('martin', row('a', { listingKey: 'seloger:1' })),
      entry('dupont', addressed('b', ADDRESS, { listingKey: 'seloger:1' })),
    ]);
    expect(card.row.status).toBe('ready');
  });

  it('le geste suivant s’écrit sur toutes les copies, avec les mêmes dates', () => {
    const [card] = groupProspecting(copies);
    const move = applyProspectingMove(card.row.status, 'meeting', T2, card.row.step);
    if (!move.ok) throw new Error('refusé');
    const written = { ...cardDates(card.copies.map((copy) => copy.row)), ...move.patch };
    expect(written).toEqual({
      prospecting_handed_at: T2,
      prospecting_meeting_at: T2,
      prospecting_mandate_at: null,
      prospecting_declined_at: null,
      prospecting_collaboration_at: null,
      prospecting_collaboration_declined_at: null,
    });
    // Chaque copie, relue seule, dit alors la même chose que la carte.
    expect(prospectingStatus(written, false)).toBe('meeting');
    expect(prospectingStatus(written, true)).toBe('meeting');
  });

  it('garde la date la plus ancienne ; un mandat rentré l’emporte sur « pas intéressé »', () => {
    expect(
      cardDates([
        row('a', { handedAt: T2, meetingAt: T2, mandateAt: T2 }),
        row('b', { handedAt: T1, declinedAt: T1 }),
      ]),
    ).toEqual({
      prospecting_handed_at: T1,
      prospecting_meeting_at: T2,
      prospecting_mandate_at: T2,
      prospecting_declined_at: null,
      prospecting_collaboration_at: null,
      prospecting_collaboration_declined_at: null,
    });
  });

  it('« pas intéressé » sur une copie vaut pour la carte', () => {
    const [card] = groupProspecting([
      entry('martin', row('a', { listingKey: 'seloger:1', declinedAt: T1 })),
      entry('dupont', row('b', { listingKey: 'seloger:1' })),
    ]);
    expect(card.row.status).toBe('declined');
  });

  it('ce qu’une copie sait de « à qui s’adresser » vaut pour la carte', () => {
    const [card] = groupProspecting([
      entry('martin', row('a', { listingKey: 'seloger:1', step: 'check' })),
      entry('dupont', row('b', { listingKey: 'seloger:1', step: 'colleague' })),
    ]);
    expect(card.row.step).toBe('colleague');
  });

  it('les compteurs comptent le bien une seule fois', () => {
    const cards = groupProspecting([
      entry('martin', row('a', { listingKey: 'seloger:1', handedAt: T1 })),
      entry('dupont', row('b', { listingKey: 'seloger:1', handedAt: T1 })),
      entry('durand', row('c', { listingKey: 'seloger:1', handedAt: T1 })),
      entry('martin', row('d')),
    ]);
    expect(prospectingCounters(cards.map((card) => card.row.status))).toMatchObject({
      toCanvass: 2,
      handed: 1,
    });
  });

  it('une adresse opposée sur une copie marque la carte', () => {
    const [card] = groupProspecting([
      entry('martin', row('a', { listingKey: 'seloger:1' })),
      entry('dupont', addressed('b', ADDRESS, { listingKey: 'seloger:1', opposedOn: T1 })),
    ]);
    expect(card.row.opposedOn).toBe(T1);
  });
});

describe('cardCopy — le courrier compare NOTRE bien au sien', () => {
  const [card] = groupProspecting([
    entry('martin', addressed('a', ADDRESS, { listingKey: 'seloger:1' })),
    entry('dupont', row('b', { listingKey: 'seloger:1' })),
  ]);

  it('rend la copie du bien vendeur filtré', () => {
    expect(cardCopy(card, 'dupont').row.id).toBe('b');
    expect(cardCopy(card, 'dupont').seller.projectId).toBe('dupont');
  });

  it('sans filtre, ou pour un bien vendeur étranger à la carte, la copie de référence', () => {
    expect(cardCopy(card, null).row.id).toBe('a');
    expect(cardCopy(card, 'martin').row.id).toBe('a');
    expect(cardCopy(card, 'inconnu').row.id).toBe('a');
  });
});

// Mission 115 — la collaboration avec le confrère se lit sur la carte entière.
describe('collaboration sur une carte (mission 115)', () => {
  it('une collaboration obtenue sur une copie clôt la carte ; un refus la remet en propriétaire', () => {
    expect(
      cardDates([row('a', { handedAt: T1, collaborationAt: T2 }), row('b', { handedAt: T1 })]),
    ).toMatchObject({
      prospecting_collaboration_at: T2,
      prospecting_collaboration_declined_at: null,
    });
    const refused = groupProspecting([
      entry('m', row('a', { step: 'colleague', handedAt: T1, collaborationDeclinedAt: T2 })),
    ]);
    expect(refused[0].row.step).toBe('owner');
    expect(refused[0].row.collaborationDeclinedAt).toBe(T2);
    expect(refused[0].row.status).toBe('to_confirm');
  });
});

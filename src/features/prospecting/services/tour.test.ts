import { describe, expect, it } from 'vitest';

import { groupProspecting } from '@/features/prospecting/services/group-prospecting';
import { addressed, entry, row } from '@/features/prospecting/services/test-cards';
import {
  buildTour,
  filterByScope,
  parseTourAddress,
  parseTourScope,
} from '@/features/prospecting/services/tour';

const T = '2026-10-05T08:00:00.000Z';

describe('parseTourAddress', () => {
  it('lit la commune, la rue et le numéro', () => {
    expect(parseTourAddress('8 bis avenue Docteur Hochet, 06160 Antibes · 2e étage', null)).toEqual(
      { commune: 'Antibes', street: 'avenue Docteur Hochet', number: 8 },
    );
    expect(parseTourAddress('12 rue des Pins 06140 Saint-Paul-de-Vence', null)).toEqual({
      commune: 'Saint-Paul-de-Vence',
      street: 'rue des Pins',
      number: 12,
    });
  });

  it('sans numéro ni code postal : la rue telle quelle, la commune de l’annonce', () => {
    expect(parseTourAddress('Chemin des Oliviers', 'Vence')).toEqual({
      commune: 'Vence',
      street: 'Chemin des Oliviers',
      number: null,
    });
    expect(parseTourAddress('3 rue Haute, Vence', null).commune).toBe('Vence');
  });
});

describe('buildTour — les portes où sonner', () => {
  it('trie par commune, puis par rue, puis par numéro', () => {
    const cards = groupProspecting([
      entry('m', addressed('v-pins-12', '12 rue des Pins, 06140 Vence', { surfaceArea: 40 })),
      entry('m', addressed('a-hochet-8', '8 avenue Hochet, 06160 Antibes', { surfaceArea: 50 })),
      entry('m', addressed('v-pins-2', '2 rue des Pins, 06140 Vence', { surfaceArea: 60 })),
      entry(
        'm',
        addressed('v-eglise-30', '30 place de l’Église, 06140 Vence', { surfaceArea: 70 }),
      ),
      entry(
        'm',
        addressed('a-albert-110', '110 bd Albert 1er, 06160 Antibes', { surfaceArea: 80 }),
      ),
      entry(
        'm',
        addressed('a-albert-9', '9 boulevard Albert 1er, 06160 Antibes', { surfaceArea: 90 }),
      ),
    ]);
    const tour = buildTour(cards);
    expect(tour.owners.map((stop) => stop.card.row.id)).toEqual([
      'a-hochet-8',
      'a-albert-9',
      'a-albert-110',
      'v-eglise-30',
      'v-pins-2',
      'v-pins-12',
    ]);
    expect(tour.owners.map((stop) => stop.commune)).toEqual([
      'Antibes',
      'Antibes',
      'Antibes',
      'Vence',
      'Vence',
      'Vence',
    ]);
  });

  it('ne garde que les propriétaires à adresse confirmée, encore à voir', () => {
    const address = (n: number) => `${n} rue des Pins, 06140 Vence`;
    const cards = groupProspecting([
      entry('m', addressed('pret', address(1), { surfaceArea: 10 })),
      entry(
        'm',
        addressed('remis', address(2), { surfaceArea: 20, status: 'handed', handedAt: T }),
      ),
      entry('m', addressed('a-verifier', address(3), { surfaceArea: 30, step: 'check' })),
      entry('m', row('sans-adresse', { surfaceArea: 40 })),
      entry('m', row('adresse-proposee', { address: address(5), surfaceArea: 50 })),
      entry('m', addressed('rdv', address(6), { surfaceArea: 60, handedAt: T, meetingAt: T })),
      entry(
        'm',
        addressed('mandat', address(7), {
          surfaceArea: 70,
          handedAt: T,
          meetingAt: T,
          mandateAt: T,
        }),
      ),
      entry('m', addressed('pas-interesse', address(8), { surfaceArea: 80, declinedAt: T })),
      entry('m', addressed('oppose', address(9), { surfaceArea: 90, opposedOn: T })),
    ]);
    expect(buildTour(cards).owners.map((stop) => stop.card.row.id)).toEqual([
      'pret',
      'remis',
      'a-verifier',
    ]);
  });

  it('liste les confrères à part, avec ou sans adresse, tant qu’ils restent à appeler', () => {
    const cards = groupProspecting([
      entry('m', addressed('proprio', '1 rue des Pins, 06140 Vence')),
      entry('m', row('confrere', { step: 'colleague', listingNumber: '123', surfaceArea: 20 })),
      entry(
        'm',
        addressed('confrere-adresse', '4 rue Haute, 06140 Vence', {
          step: 'colleague',
          surfaceArea: 30,
        }),
      ),
      entry(
        'm',
        row('confrere-rdv', { step: 'colleague', surfaceArea: 40, handedAt: T, meetingAt: T }),
      ),
    ]);
    const tour = buildTour(cards);
    expect(tour.owners.map((stop) => stop.card.row.id)).toEqual(['proprio']);
    expect(tour.colleagues.map((card) => card.row.id)).toEqual(['confrere', 'confrere-adresse']);
  });
});

describe('« Mes dossiers / Toute l’agence »', () => {
  const cards = groupProspecting([
    entry('mien', row('a', { listingKey: 'seloger:1' }), 'moi'),
    entry('autre', row('b', { listingKey: 'seloger:2' }), 'collegue'),
    // Le même bien retenu par un collègue et par moi : il est aussi dans mes dossiers.
    entry('autre', row('c', { listingKey: 'seloger:3' }), 'collegue'),
    entry('mien', row('d', { listingKey: 'seloger:3' }), 'moi'),
  ]);

  it('par défaut, les dossiers du conseiller connecté', () => {
    expect(parseTourScope(undefined)).toBe('mine');
    expect(parseTourScope('n’importe quoi')).toBe('mine');
    expect(parseTourScope('agency')).toBe('agency');
    expect(filterByScope(cards, 'mine', 'moi').map((card) => card.row.id)).toEqual(['a', 'c']);
  });

  it('« Toute l’agence » ne masque rien', () => {
    expect(filterByScope(cards, 'agency', 'moi')).toHaveLength(3);
  });
});

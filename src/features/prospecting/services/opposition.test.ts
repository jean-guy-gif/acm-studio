import { describe, expect, it } from 'vitest';

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import { buildProspectingRows } from '@/features/competitor-locator/services/build-prospecting-rows';
import { fileBlocker } from '@/features/prospecting-file/services/file-access';
import { addressKey } from '@/features/prospecting/services/address-key';
import { groupProspecting } from '@/features/prospecting/services/group-prospecting';
import {
  NO_OPPOSITIONS,
  buildOppositions,
  opposedOn,
  oppositionBadge,
  type Oppositions,
} from '@/features/prospecting/services/opposition';
import { addressed, entry } from '@/features/prospecting/services/test-cards';
import { buildTour } from '@/features/prospecting/services/tour';

const REQUESTED = '2026-10-11T09:00:00.000Z';
const ADDRESS = '8 avenue du Docteur Hochet, 06160 Antibes';
const LISTING = 'seloger:26ZEJMLWB13Y';
const LIST: Oppositions = buildOppositions([
  { address_key: addressKey(ADDRESS), listing_key: null, requested_at: REQUESTED },
  { address_key: null, listing_key: LISTING, requested_at: REQUESTED },
]);
const at = (address: string | null) => opposedOn({ address }, LIST);

describe('« Ne plus solliciter » — la liste d’opposition de l’agence', () => {
  it('reconnaît l’adresse quelle que soit son écriture', () => {
    expect(at('8, av. du Dr Hochet 06160 ANTIBES')).toBe(REQUESTED);
    expect(at('10 avenue du Docteur Hochet, 06160 Antibes')).toBeNull();
    expect(at(null)).toBeNull();
    expect(opposedOn({ address: ADDRESS }, NO_OPPOSITIONS)).toBeNull();
  });

  // Mission 102 — ce qui suffisait à échapper à la liste n'y échappe plus.
  it('« Juan-les-Pins », un étage ou « bis » en plus ne font pas une autre adresse', () => {
    for (const address of [
      '8 avenue du Docteur Hochet, 06160 Juan-les-Pins',
      '8 avenue du Docteur Hochet, Antibes',
      '8 av. du Dr Hochet · 2e étage, 06160 Antibes',
      '8 bis avenue du Docteur Hochet, bât. B, appt 12, 06600 Antibes',
    ]) {
      expect(at(address), address).toBe(REQUESTED);
    }
  });

  it('l’opposition suit le BIEN : la même annonce, dans un futur dossier, sans adresse ou avec une autre', () => {
    expect(opposedOn({ address: null, listingKey: LISTING }, LIST)).toBe(REQUESTED);
    expect(opposedOn({ address: '99 rue Ailleurs, 06000 Nice', listingKey: LISTING }, LIST)).toBe(
      REQUESTED,
    );
    expect(opposedOn({ address: null, listingKey: 'seloger:AUTRE' }, LIST)).toBeNull();
    const [future] = buildProspectingRows(
      [
        makeComparable({
          id: 'futur',
          listing_url: 'https://www.seloger.com/annonces/achat/maison/antibes-06/26ZEJMLWB13Y.htm',
          locator_address: null,
        }),
      ],
      [],
      new Date(REQUESTED),
      LIST,
    );
    expect(future.listingKey).not.toBeNull();
    expect(
      opposedOn(
        { address: null, listingKey: future.listingKey },
        buildOppositions([
          { address_key: null, listing_key: future.listingKey, requested_at: REQUESTED },
        ]),
      ),
    ).toBe(REQUESTED);
  });

  it('une ligne d’avant la mission 102 est relue avec la nouvelle clé', () => {
    const old = buildOppositions([
      {
        address_key: '8 avenue du docteur hochet 2e etage 06160 juan les pins',
        listing_key: null,
        requested_at: REQUESTED,
      },
      // La même adresse inscrite deux fois : la demande la plus ancienne fait foi.
      {
        address_key: '8 avenue du docteur hochet antibes',
        listing_key: null,
        requested_at: '2026-10-12T09:00:00.000Z',
      },
    ]);
    expect(opposedOn({ address: ADDRESS }, old)).toBe(REQUESTED);
    expect(old.addresses.size).toBe(1);
  });

  it('le badge dit la date de la demande', () => {
    expect(oppositionBadge(REQUESTED)).toBe('Ne plus solliciter (demandé le 11/10)');
  });

  it('marque l’adresse partout où elle apparaît, y compris dans un futur dossier', () => {
    const competitor = (id: string, projectId: string, confirmed: boolean) =>
      makeComparable({
        id,
        project_id: projectId,
        locator_address: '8 av du docteur Hochet 06160 Antibes',
        locator_confirmed: confirmed,
      });
    const rows = buildProspectingRows(
      [competitor('ancien', 'p1', true), competitor('futur', 'p2', false)],
      [],
      new Date(REQUESTED),
      LIST,
    );
    // Confirmée ou seulement proposée : dans le doute, on ne sollicite pas.
    expect(rows.map((item) => item.opposedOn)).toEqual([REQUESTED, REQUESTED]);
    expect(
      buildProspectingRows([competitor('x', 'p1', true)], [], new Date(REQUESTED))[0].opposedOn,
    ).toBeNull();
  });

  it('bloque le courrier au propriétaire', () => {
    expect(
      fileBlocker({
        version: 'owner',
        opposed: true,
        addressConfirmed: true,
        advisorPhone: '06 12 34 56 78',
        agencyAddress: '1 place de la Mairie, 06160 Antibes',
        professionalCard: 'CPI 0605 2018 000 123 456',
        professionalCardIssuer: 'la CCI Nice Côte d’Azur',
      }),
    ).toBe('opposed');
  });

  it('sort l’adresse de la tournée', () => {
    const cards = groupProspecting([
      entry('martin', addressed('libre', '3 rue des Pins, 06160 Antibes')),
      entry('martin', addressed('oppose', ADDRESS, { opposedOn: REQUESTED })),
      entry(
        'martin',
        addressed('confrere', '5 rue des Pins, 06160 Antibes', {
          step: 'colleague',
          opposedOn: REQUESTED,
          surfaceArea: 90,
        }),
      ),
    ]);
    const tour = buildTour(cards);
    expect(tour.owners.map((stop) => stop.card.row.id)).toEqual(['libre']);
    expect(tour.colleagues).toEqual([]);
  });

  // « Pas intéressé » : pas maintenant, pour ce bien — rien n'entre dans la liste, et un futur
  // dossier à la même adresse repart de zéro.
  it('« pas intéressé » ne bloque pas un contact futur', () => {
    const declined = addressed('a', ADDRESS, { status: 'declined', declinedAt: REQUESTED });
    expect(declined.opposedOn).toBeNull();
    const [future] = buildProspectingRows(
      [makeComparable({ id: 'b', locator_address: ADDRESS, locator_confirmed: true })],
      [],
      new Date(REQUESTED),
      NO_OPPOSITIONS,
    );
    expect(future.opposedOn).toBeNull();
    expect(future.status).toBe('ready');
  });
});

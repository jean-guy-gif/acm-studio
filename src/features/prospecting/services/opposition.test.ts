import { describe, expect, it } from 'vitest';

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import { buildProspectingRows } from '@/features/competitor-locator/services/build-prospecting-rows';
import { fileBlocker } from '@/features/prospecting-file/services/file-access';
import { addressKey } from '@/features/prospecting/services/address-key';
import { groupProspecting } from '@/features/prospecting/services/group-prospecting';
import {
  NO_OPPOSITIONS,
  opposedOn,
  oppositionBadge,
  type Oppositions,
} from '@/features/prospecting/services/opposition';
import { addressed, entry } from '@/features/prospecting/services/test-cards';
import { buildTour } from '@/features/prospecting/services/tour';

const REQUESTED = '2026-10-11T09:00:00.000Z';
const ADDRESS = '8 avenue du Docteur Hochet, 06160 Antibes';
const LIST: Oppositions = new Map([[addressKey(ADDRESS) ?? '', REQUESTED]]);

describe('« Ne plus solliciter » — la liste d’opposition de l’agence', () => {
  it('reconnaît l’adresse quelle que soit son écriture', () => {
    expect(opposedOn('8, av. du Dr Hochet 06160 ANTIBES', LIST)).toBe(REQUESTED);
    expect(opposedOn('10 avenue du Docteur Hochet, 06160 Antibes', LIST)).toBeNull();
    expect(opposedOn(null, LIST)).toBeNull();
    expect(opposedOn(ADDRESS, NO_OPPOSITIONS)).toBeNull();
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

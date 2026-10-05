import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  describeReadCounts,
  readSearchPages,
} from '@/features/competitor-search/services/read-search-pages';
import type { RankedCandidate } from '@/features/competitor-search/types';

const FIXTURES = path.resolve(__dirname, '../__fixtures__/filtre');
const fixture = (name: string) => readFileSync(path.join(FIXTURES, name), 'utf8');

const SELOGER = 'https://www.seloger.com/classified-search?locations=AD08FR2038';
const BIENICI = 'https://www.bienici.com/recherche/achat/nice-06000/appartement/4-pieces';
const MA = 'https://www.maisonsetappartements.fr/views/Search.php?villes=2123';
const GA = 'https://www.green-acres.fr/maison-a-vendre?searchQuery=cn-fr-lg-fr-city_id-gr_3668';

describe('readSearchPages — tous les onglets d’un coup (mission 69)', () => {
  it('quatre onglets → quatre portails, avec les annonces lues par portail', () => {
    const read = readSearchPages([
      { html: fixture('seloger.html'), url: SELOGER },
      { html: fixture('bienici.html'), url: BIENICI },
      { html: fixture('maisons-appartements.html'), url: MA },
      { html: fixture('green-acres.html'), url: GA },
    ]);
    expect(read.portals.map((p) => p.portal).sort()).toEqual([
      'bienici',
      'green_acres',
      'maisons_appartements',
      'seloger',
    ]);
    expect(Object.fromEntries(read.counts.map((c) => [c.portal, c.cardsRead]))).toEqual({
      seloger: 30,
      bienici: 26,
      maisons_appartements: 15,
      green_acres: 24,
    });
    expect(read.emptyUrls).toEqual([]);
    expect(read.learnInput.map((entry) => entry.url)).toEqual([SELOGER, BIENICI, MA, GA]);
  });

  it('deux onglets du même portail sont fusionnés, sans doublon', () => {
    const one = readSearchPages([{ html: fixture('seloger.html'), url: SELOGER }]);
    const twice = readSearchPages([
      { html: fixture('seloger.html'), url: SELOGER },
      { html: fixture('seloger.html'), url: SELOGER },
    ]);
    expect(twice.portals).toHaveLength(1);
    expect(twice.portals[0].candidates).toHaveLength(one.portals[0].candidates.length);
  });

  it('un onglet sans carte n’est pas un portail vide : il est compté à part', () => {
    const read = readSearchPages([
      { html: '<html><body>Un instant…</body></html>', url: BIENICI },
      { html: fixture('seloger.html'), url: SELOGER },
    ]);
    expect(read.portals.map((p) => p.portal)).toEqual(['seloger']);
    expect(read.emptyUrls).toEqual([BIENICI]);
  });
});

describe('describeReadCounts — le récapitulatif par portail', () => {
  it('annonces lues et retenues (après les filtres du classement)', () => {
    const ranked = [{ portal: 'seloger' }, { portal: 'seloger' }] as RankedCandidate[];
    expect(
      describeReadCounts(
        [
          { portal: 'seloger', label: 'SeLoger', cardsRead: 30 },
          { portal: 'bienici', label: 'Bien’ici', cardsRead: 1 },
        ],
        ranked,
      ),
    ).toEqual(['SeLoger : 30 annonces lues, 2 retenues', 'Bien’ici : 1 annonce lue, 0 retenue']);
  });
});

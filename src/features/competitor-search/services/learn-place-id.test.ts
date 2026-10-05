import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  cardsConfirmCity,
  learnablePlaceId,
  placeIdFromSearchUrl,
} from '@/features/competitor-search/services/learn-place-id';
import { readSearchPage } from '@/features/competitor-search/services/read-search-page';

const FIXTURES = path.resolve(__dirname, '../__fixtures__/filtre');
const fixture = (name: string) => readFileSync(path.join(FIXTURES, name), 'utf8');

describe('placeIdFromSearchUrl — l’identifiant relevé dans l’adresse de l’onglet', () => {
  it('relève les identifiants des trois portails (adresses réelles du 01/10)', () => {
    expect(
      placeIdFromSearchUrl(
        'https://www.seloger.com/classified-search?distributionTypes=Buy&estateTypes=Apartment&locations=AD08FR2038&numberOfRoomsMin=4',
      ),
    ).toEqual({ portal: 'seloger', placeId: 'AD08FR2038' });
    expect(
      placeIdFromSearchUrl(
        'https://www.maisonsetappartements.fr/views/Search.php?lang=fr&TypeAnnonce=VEN&TypeBien=APP&villes=2123&departement=&quartier=&nb_piece=4',
      ),
    ).toEqual({ portal: 'maisons_appartements', placeId: '2123' });
    expect(
      placeIdFromSearchUrl(
        'https://www.green-acres.fr/maison-a-vendre?searchQuery=cn-fr-lg-fr-city_id-gr_3668-type-properties-project_type-properties-hab_appartement-on-mn_p-400000',
      ),
    ).toEqual({ portal: 'green_acres', placeId: 'gr_3668' });
    expect(
      placeIdFromSearchUrl(
        'https://www.green-acres.fr/maison-a-vendre?searchQuery=cn-fr-lg-fr-city_id-city_7123-type-properties',
      ),
    ).toEqual({ portal: 'green_acres', placeId: 'city_7123' });
  });

  it('n’apprend rien d’une recherche sur plusieurs communes, ni sans commune, ni de Bien’ici', () => {
    expect(
      placeIdFromSearchUrl(
        'https://www.seloger.com/classified-search?locations=AD08FR2038,AD08FR1',
      ),
    ).toBeNull();
    expect(
      placeIdFromSearchUrl(
        'https://www.green-acres.fr/x?searchQuery=cn-fr-lg-fr-city_id-gr_1-city_id-gr_2',
      ),
    ).toBeNull();
    expect(
      placeIdFromSearchUrl('https://www.green-acres.fr/x?searchQuery=cn-fr-lg-fr-hab_house-on'),
    ).toBeNull();
    expect(
      placeIdFromSearchUrl('https://www.maisonsetappartements.fr/views/Search.php?villes='),
    ).toBeNull();
    expect(
      placeIdFromSearchUrl('https://www.bienici.com/recherche/achat/nice-06000/appartement'),
    ).toBeNull();
    expect(placeIdFromSearchUrl('pas une adresse')).toBeNull();
  });
});

describe('cardsConfirmCity — la commune du bien est la plus fréquente sur les cartes', () => {
  it('confirmée en tête, même avec des suggestions d’autres communes', () => {
    expect(cardsConfirmCity(['Nice', 'Nice', 'Antibes', null], 'Nice')).toBe(true);
  });

  it('« St Laurent Du Var » = « Saint-Laurent-du-Var »', () => {
    expect(cardsConfirmCity(['St Laurent Du Var', 'Nice'], 'Saint-Laurent-du-Var')).toBe(false);
    expect(
      cardsConfirmCity(['St Laurent Du Var', 'St Laurent Du Var'], 'Saint-Laurent-du-Var'),
    ).toBe(true);
  });

  it('non confirmée : absente, à égalité, ou aucune carte ne dit sa commune', () => {
    expect(cardsConfirmCity(['Antibes', 'Antibes'], 'Nice')).toBe(false);
    expect(cardsConfirmCity(['Nice', 'Antibes'], 'Nice')).toBe(false);
    expect(cardsConfirmCity([null, null], 'Nice')).toBe(false);
  });
});

describe('learnablePlaceId — sur les pages réelles du conseiller', () => {
  const learn = (file: string, url: string, city: string) => {
    const read = readSearchPage(fixture(file), url);
    if (!read.ok) throw new Error(`${file} illisible`);
    return learnablePlaceId(
      url,
      read.portal.candidates.map((candidate) => candidate.city),
      city,
    );
  };

  it('Green Acres Nice : 13 cartes Nice sur 24 (le reste en suggestions) → appris', () => {
    const url =
      'https://www.green-acres.fr/maison-a-vendre?searchQuery=cn-fr-lg-fr-city_id-gr_3668-type-properties-project_type-properties-hab_appartement-on';
    expect(learn('green-acres.html', url, 'Nice')).toEqual({
      portal: 'green_acres',
      placeId: 'gr_3668',
    });
  });

  it('M&A et SeLoger Nice → appris ; la même page pour un bien à Antibes → rien', () => {
    const ma =
      'https://www.maisonsetappartements.fr/views/Search.php?lang=fr&TypeAnnonce=VEN&TypeBien=APP&villes=2123&nb_piece=4';
    expect(learn('maisons-appartements.html', ma, 'Nice')).toEqual({
      portal: 'maisons_appartements',
      placeId: '2123',
    });
    expect(learn('maisons-appartements.html', ma, 'Antibes')).toBeNull();
    const sl =
      'https://www.seloger.com/classified-search?locations=AD08FR2038&estateTypes=Apartment';
    expect(learn('seloger.html', sl, 'Nice')).toEqual({ portal: 'seloger', placeId: 'AD08FR2038' });
  });

  it('Green Acres « city_7123 » sans aucune carte à Antibes → rien n’est appris', () => {
    const url =
      'https://www.green-acres.fr/maison-a-vendre?searchQuery=cn-fr-lg-fr-city_id-city_7123-type-properties';
    expect(learn('green-acres-maison.html', url, 'Antibes')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildFilteredSearchUrls,
  placeCityKey,
  searchSurfaceBounds,
  type KnownPlaceIds,
} from '@/features/competitor-search/services/build-filtered-search-urls';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';

// Mission 69 — les adresses filtrées des trois cas du critère 5, vérifiées à la main par Laurent
// le 05/10 sur les quatre portails. Identifiants de Nice relevés sur ses pages du 01/10.
const NICE: KnownPlaceIds = {
  seloger: 'AD08FR2038',
  maisons_appartements: '2123',
  green_acres: 'gr_3668',
};

const base: CompetitorSearchCriteria = {
  city: 'Nice',
  postalCode: '06000',
  propertyType: 'apartment',
  district: null,
  surfaceArea: 80,
  roomsCount: 4,
  advisorPriceMin: 400000,
  advisorPriceMax: 480000,
};

const urlsOf = (criteria: CompetitorSearchCriteria, places: KnownPlaceIds = NICE) =>
  Object.fromEntries(buildFilteredSearchUrls(criteria, places).map((l) => [l.portal, l.url]));

describe('searchSurfaceBounds — ±10 %, plancher ±3 m², arrondi vers l’extérieur', () => {
  it('80 m² → 72–88 ; 20 m² → 17–23 (plancher) ; 150 m² → 135–165 (pas 166 : flottant)', () => {
    expect(searchSurfaceBounds(80)).toEqual({ min: 72, max: 88 });
    expect(searchSurfaceBounds(20)).toEqual({ min: 17, max: 23 });
    expect(searchSurfaceBounds(150)).toEqual({ min: 135, max: 165 });
  });

  it('une surface non ronde s’élargit vers l’extérieur (rien n’est coupé que la lecture garderait)', () => {
    expect(searchSurfaceBounds(83.5)).toEqual({ min: 75, max: 92 });
  });
});

describe('buildFilteredSearchUrls — les trois cas vérifiés à la main', () => {
  it('appartement 4P de 80 m² à Nice', () => {
    expect(urlsOf(base)).toEqual({
      seloger:
        'https://www.seloger.com/classified-search?distributionTypes=Buy&estateTypes=Apartment&locations=AD08FR2038&numberOfRoomsMin=4&numberOfRoomsMax=4&priceMin=400000&priceMax=480000&spaceMin=72&spaceMax=88&projectTypes=Resale',
      bienici:
        'https://www.bienici.com/recherche/achat/nice-06000/appartement/4-pieces?prix-min=400000&prix-max=480000&surface-min=72&surface-max=88',
      maisons_appartements:
        'https://www.maisonsetappartements.fr/views/Search.php?lang=fr&TypeAnnonce=VEN&TypeBien=APP&villes=2123&bdgMin=400000&bdgMax=480000&surfMin=72&surfMax=88&nb_piece=4',
      green_acres:
        'https://www.green-acres.fr/maison-a-vendre?searchQuery=cn-fr-lg-fr-city_id-gr_3668-type-properties-project_type-properties-hab_appartement-on-mn_p-400000-mx_p-480000-mn_h_s-72-mx_h_s-88-mn_rooms-4-mx_rooms-4',
    });
  });

  it('studio de 20 m² : 1 pièce (« 1-piece », nb_piece=1), plancher ±3 m²', () => {
    const studio = {
      ...base,
      surfaceArea: 20,
      roomsCount: 1,
      advisorPriceMin: 150000,
      advisorPriceMax: 200000,
    };
    expect(urlsOf(studio)).toEqual({
      seloger:
        'https://www.seloger.com/classified-search?distributionTypes=Buy&estateTypes=Apartment&locations=AD08FR2038&numberOfRoomsMin=1&numberOfRoomsMax=1&priceMin=150000&priceMax=200000&spaceMin=17&spaceMax=23&projectTypes=Resale',
      bienici:
        'https://www.bienici.com/recherche/achat/nice-06000/appartement/1-piece?prix-min=150000&prix-max=200000&surface-min=17&surface-max=23',
      maisons_appartements:
        'https://www.maisonsetappartements.fr/views/Search.php?lang=fr&TypeAnnonce=VEN&TypeBien=APP&villes=2123&bdgMin=150000&bdgMax=200000&surfMin=17&surfMax=23&nb_piece=1',
      green_acres:
        'https://www.green-acres.fr/maison-a-vendre?searchQuery=cn-fr-lg-fr-city_id-gr_3668-type-properties-project_type-properties-hab_appartement-on-mn_p-150000-mx_p-200000-mn_h_s-17-mx_h_s-23-mn_rooms-1-mx_rooms-1',
    });
  });

  it('maison 5P de 150 m² : House, maisonvilla, MAI, hab_house-on ; M&A « 5 et plus » = 999', () => {
    const house = {
      ...base,
      propertyType: 'house',
      surfaceArea: 150,
      roomsCount: 5,
      advisorPriceMin: 650000,
      advisorPriceMax: 950000,
      landArea: 800,
    };
    expect(urlsOf(house)).toEqual({
      seloger:
        'https://www.seloger.com/classified-search?distributionTypes=Buy&estateTypes=House&locations=AD08FR2038&numberOfRoomsMin=5&numberOfRoomsMax=5&priceMin=650000&priceMax=950000&spaceMin=135&spaceMax=165&projectTypes=Resale',
      bienici:
        'https://www.bienici.com/recherche/achat/nice-06000/maisonvilla/5-pieces?prix-min=650000&prix-max=950000&surface-min=135&surface-max=165',
      maisons_appartements:
        'https://www.maisonsetappartements.fr/views/Search.php?lang=fr&TypeAnnonce=VEN&TypeBien=MAI&villes=2123&bdgMin=650000&bdgMax=950000&surfMin=135&surfMax=165&nb_piece=999',
      // Le terrain n'est PAS envoyé (mn_l_s absent) : il départage, il ne filtre pas.
      green_acres:
        'https://www.green-acres.fr/maison-a-vendre?searchQuery=cn-fr-lg-fr-city_id-gr_3668-type-properties-project_type-properties-hab_house-on-mn_p-650000-mx_p-950000-mn_h_s-135-mx_h_s-165-mn_rooms-5-mx_rooms-5',
    });
  });
});

describe('buildFilteredSearchUrls — identifiants inconnus et données absentes', () => {
  it('commune inconnue d’un portail : page de recherche de la commune, sans filtre, needsPlace', () => {
    const links = buildFilteredSearchUrls(base, { seloger: 'AD08FR2038' });
    const byPortal = Object.fromEntries(links.map((l) => [l.portal, l]));
    expect(byPortal.seloger.needsPlace).toBe(false);
    expect(byPortal.bienici.needsPlace).toBe(false); // Bien'ici se déduit du bien
    expect(byPortal.maisons_appartements).toMatchObject({
      needsPlace: true,
      url: 'https://www.maisonsetappartements.fr/fr/06/vente/nice/',
    });
    expect(byPortal.green_acres).toMatchObject({
      needsPlace: true,
      url: 'https://www.green-acres.fr/immobilier/nice',
    });
  });

  it('aucune valeur inventée : sans fourchette, surface ni pièces, ces filtres ne partent pas', () => {
    const bare = {
      ...base,
      surfaceArea: null,
      roomsCount: null,
      advisorPriceMin: null,
      advisorPriceMax: null,
    };
    const urls = urlsOf(bare);
    expect(urls.bienici).toBe('https://www.bienici.com/recherche/achat/nice-06000/appartement');
    expect(urls.seloger).toBe(
      'https://www.seloger.com/classified-search?distributionTypes=Buy&estateTypes=Apartment&locations=AD08FR2038&projectTypes=Resale',
    );
    expect(urls.green_acres).toBe(
      'https://www.green-acres.fr/maison-a-vendre?searchQuery=cn-fr-lg-fr-city_id-gr_3668-type-properties-project_type-properties-hab_appartement-on',
    );
  });

  it('l’ordre d’ouverture est stable : SeLoger, Bien’ici, M&A, Green Acres', () => {
    expect(buildFilteredSearchUrls(base, NICE).map((l) => l.portal)).toEqual([
      'seloger',
      'bienici',
      'maisons_appartements',
      'green_acres',
    ]);
  });
});

describe('placeCityKey', () => {
  it('commune + département ; sans code postal valable, pas de clé', () => {
    expect(placeCityKey('Nice', '06000')).toBe('nice|06');
    expect(placeCityKey('Saint-Laurent-du-Var', ' 06700 ')).toBe('saint-laurent-du-var|06');
    expect(placeCityKey('Nice', null)).toBeNull();
    expect(placeCityKey('Nice', '6000')).toBeNull();
  });
});

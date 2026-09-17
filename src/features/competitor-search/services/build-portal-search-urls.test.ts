import { describe, expect, it } from 'vitest';

import {
  assertAllowedSearchUrl,
  buildPortalSearchUrls,
  forbiddenSearchReason,
  slugifyCity,
} from '@/features/competitor-search/services/build-portal-search-urls';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';

// Les critères de recherche portent aussi surface, quartier et fourchette de
// prix (MISSION 36) ; ces tests ne s'intéressent qu'à la construction d'URL.
function criteria(overrides: Partial<CompetitorSearchCriteria> = {}): CompetitorSearchCriteria {
  return {
    city: 'Nice',
    postalCode: '06000',
    propertyType: 'apartment',
    district: null,
    surfaceArea: null,
    roomsCount: null,
    advisorPriceMin: null,
    advisorPriceMax: null,
    ...overrides,
  };
}

describe('slugifyCity', () => {
  it('normalises accents, apostrophes and spaces', () => {
    expect(slugifyCity('Lège-Cap-Ferret')).toBe('lege-cap-ferret');
    expect(slugifyCity("L'Haÿ-les-Roses")).toBe('l-hay-les-roses');
    expect(slugifyCity('Aix en Provence')).toBe('aix-en-provence');
    expect(slugifyCity('Nice')).toBe('nice');
  });
});

describe('buildPortalSearchUrls', () => {
  it('builds the four portal search URLs from city + postal code', () => {
    const links = buildPortalSearchUrls({
      city: 'Nice',
      postalCode: '06000',
      propertyType: 'apartment',
      district: null,
      surfaceArea: null,
      roomsCount: null,
      advisorPriceMin: null,
      advisorPriceMax: null,
    });
    const byPortal = Object.fromEntries(links.map((link) => [link.portal, link.url]));
    expect(byPortal.green_acres).toBe('https://www.green-acres.fr/immobilier/nice');
    expect(byPortal.seloger).toBe('https://www.seloger.com/immobilier/achat/immo-nice-06/');
    // Forme canonique mesurée : /recherche/achat/<commune>-<cp>/<type>.
    expect(byPortal.bienici).toBe('https://www.bienici.com/recherche/achat/nice-06000/appartement');
    expect(byPortal.maisons_appartements).toBe(
      'https://www.maisonsetappartements.fr/fr/06/vente/nice/',
    );
  });

  it('degrades gracefully without a postal code', () => {
    const links = buildPortalSearchUrls(
      criteria({ city: 'Nice', postalCode: null, propertyType: 'house' }),
    );
    const byPortal = Object.fromEntries(links.map((link) => [link.portal, link.url]));
    expect(byPortal.seloger).toBe('https://www.seloger.com/immobilier/achat/immo-nice/');
    expect(byPortal.bienici).toBe('https://www.bienici.com/recherche/achat/nice/maison');
    expect(byPortal.maisons_appartements).toBe(
      'https://www.maisonsetappartements.fr/fr/vente/nice/',
    );
  });

  it('omits the Bien’ici type segment when the property type is unknown', () => {
    const links = buildPortalSearchUrls(criteria({ propertyType: null }));
    const byPortal = Object.fromEntries(links.map((link) => [link.portal, link.url]));
    expect(byPortal.bienici).toBe('https://www.bienici.com/recherche/achat/nice-06000');
  });

  it('always returns the four supported portals (Figaro removed)', () => {
    const links = buildPortalSearchUrls(
      criteria({ city: 'Lyon', postalCode: '69006', propertyType: null }),
    );
    expect(links.map((link) => link.portal).sort()).toEqual([
      'bienici',
      'green_acres',
      'maisons_appartements',
      'seloger',
    ]);
  });

  it('never emits a forbidden address for any built URL', () => {
    const links = buildPortalSearchUrls(criteria());
    for (const link of links) {
      expect(forbiddenSearchReason(link.portal, link.url)).toBeNull();
    }
  });
});

// §11.5 — le constructeur REFUSE : une virgule ou un « & » chez Bien'ici, un
// paramètre chez SeLoger, un searchQuery=px-… chez Green Acres.
describe('forbiddenSearchReason / assertAllowedSearchUrl — les adresses interdites sont refusées', () => {
  it('Bien’ici refuse une virgule ou un « & » dans /recherche/', () => {
    expect(
      forbiddenSearchReason(
        'bienici',
        'https://www.bienici.com/recherche/achat/nice-06000,cannes-06400',
      ),
    ).not.toBeNull();
    expect(
      forbiddenSearchReason(
        'bienici',
        'https://www.bienici.com/recherche/achat/nice-06000?page=2&tri=prix',
      ),
    ).not.toBeNull();
    expect(() =>
      assertAllowedSearchUrl(
        'bienici',
        'https://www.bienici.com/recherche/achat/nice-06000/appartement,maison',
      ),
    ).toThrow();
    // Une pagination à paramètre unique reste autorisée.
    expect(
      forbiddenSearchReason('bienici', 'https://www.bienici.com/recherche/achat/nice-06000?page=2'),
    ).toBeNull();
  });

  it('SeLoger refuse toute adresse à paramètre et les formes /classified-search, /list.htm', () => {
    expect(
      forbiddenSearchReason('seloger', 'https://www.seloger.com/classified-search?types=1'),
    ).not.toBeNull();
    expect(forbiddenSearchReason('seloger', 'https://www.seloger.com/list.htm')).not.toBeNull();
    expect(
      forbiddenSearchReason(
        'seloger',
        'https://www.seloger.com/immobilier/achat/immo-nice-06/?page=2',
      ),
    ).not.toBeNull();
    expect(() =>
      assertAllowedSearchUrl(
        'seloger',
        'https://www.seloger.com/immobilier/achat/immo-nice-06/?LISTING-LISTpg=2',
      ),
    ).toThrow();
    // Le chemin propre sans paramètre est autorisé.
    expect(
      forbiddenSearchReason('seloger', 'https://www.seloger.com/immobilier/achat/immo-nice-06/'),
    ).toBeNull();
  });

  it('Green Acres refuse un searchQuery préfixé px- (et accepte cn-)', () => {
    expect(
      forbiddenSearchReason(
        'green_acres',
        'https://www.green-acres.fr/maison-a-vendre?searchQuery=px-fr-lg-fr',
      ),
    ).not.toBeNull();
    expect(() =>
      assertAllowedSearchUrl(
        'green_acres',
        'https://www.green-acres.fr/maison-a-vendre?searchQuery=sx-abc',
      ),
    ).toThrow();
    expect(
      forbiddenSearchReason(
        'green_acres',
        'https://www.green-acres.fr/maison-a-vendre?searchQuery=cn-fr-lg-fr-city_id-gr_3668',
      ),
    ).toBeNull();
  });
});

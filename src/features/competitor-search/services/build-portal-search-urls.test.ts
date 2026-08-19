import { describe, expect, it } from 'vitest';

import {
  buildPortalSearchUrls,
  slugifyCity,
} from '@/features/competitor-search/services/build-portal-search-urls';

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
    });
    const byPortal = Object.fromEntries(links.map((link) => [link.portal, link.url]));
    expect(byPortal.green_acres).toBe('https://www.green-acres.fr/immobilier/nice');
    expect(byPortal.seloger).toBe('https://www.seloger.com/immobilier/achat/immo-nice-06/');
    expect(byPortal.bienici).toBe('https://www.bienici.com/recherche/achat/nice-06000');
    expect(byPortal.figaro).toBe(
      'https://immobilier.lefigaro.fr/annonces/immobilier-vente-appartement-nice+06000.html',
    );
  });

  it('degrades gracefully without a postal code', () => {
    const links = buildPortalSearchUrls({ city: 'Nice', postalCode: null, propertyType: 'house' });
    const byPortal = Object.fromEntries(links.map((link) => [link.portal, link.url]));
    expect(byPortal.seloger).toBe('https://www.seloger.com/immobilier/achat/immo-nice/');
    expect(byPortal.bienici).toBe('https://www.bienici.com/recherche/achat/nice');
    expect(byPortal.figaro).toBe(
      'https://immobilier.lefigaro.fr/annonces/immobilier-vente-maison-nice.html',
    );
  });

  it('always returns the five portals', () => {
    const links = buildPortalSearchUrls({ city: 'Lyon', postalCode: '69006', propertyType: null });
    expect(links.map((link) => link.portal).sort()).toEqual([
      'bienici',
      'figaro',
      'green_acres',
      'maisons_appartements',
      'seloger',
    ]);
  });
});

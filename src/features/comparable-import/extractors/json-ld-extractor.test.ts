import { describe, expect, it } from 'vitest';

import { extractJsonLd } from '@/features/comparable-import/extractors/json-ld-extractor';

const wrap = (json: string) =>
  `<html><head><script type="application/ld+json">${json}</script></head></html>`;

describe('extractJsonLd', () => {
  it('extracts a single object with offer, address, surface, rooms, images', () => {
    const data = extractJsonLd(
      wrap(
        JSON.stringify({
          '@type': 'Apartment',
          name: 'Bel appartement',
          description: 'Lumineux',
          offers: { '@type': 'Offer', price: '450000', priceCurrency: 'EUR' },
          address: {
            '@type': 'PostalAddress',
            streetAddress: '12 rue de la Paix',
            postalCode: '75002',
            addressLocality: 'Paris',
          },
          floorSize: { '@type': 'QuantitativeValue', value: '82', unitText: 'MTK' },
          numberOfRooms: 4,
          numberOfBedrooms: 2,
          image: ['https://cdn.x/1.jpg', 'https://cdn.x/2.jpg'],
        }),
      ),
    );
    expect(data.title).toBe('Bel appartement');
    expect(data.price).toBe(450000);
    expect(data.address).toBe('12 rue de la Paix');
    expect(data.postalCode).toBe('75002');
    expect(data.city).toBe('Paris');
    expect(data.surfaceArea).toBe(82);
    expect(data.roomsCount).toBe(4);
    expect(data.bedroomsCount).toBe(2);
    expect(data.photoUrls).toEqual(['https://cdn.x/1.jpg', 'https://cdn.x/2.jpg']);
  });

  it('handles arrays and @graph', () => {
    const arr = extractJsonLd(wrap(JSON.stringify([{ name: 'X', price: 100000 }])));
    expect(arr.title).toBe('X');
    const graph = extractJsonLd(
      wrap(JSON.stringify({ '@graph': [{ name: 'Y', offers: { price: 200000 } }] })),
    );
    expect(graph.title).toBe('Y');
    expect(graph.price).toBe(200000);
  });

  it('extracts construction year and amenity features when present', () => {
    const data = extractJsonLd(
      wrap(
        JSON.stringify({
          '@type': 'Apartment',
          name: 'Avec prestations',
          yearBuilt: 1985,
          amenityFeature: [
            { '@type': 'LocationFeatureSpecification', name: 'Ascenseur' },
            { '@type': 'LocationFeatureSpecification', name: 'Exposition ouest' },
          ],
        }),
      ),
    );
    expect(data.constructionYear).toBe(1985);
    expect(data.listingFeatures).toEqual(['Ascenseur', 'Exposition ouest']);
  });

  it('ignores an implausible construction year', () => {
    const data = extractJsonLd(wrap(JSON.stringify({ name: 'X', yearBuilt: 5 })));
    expect(data.constructionYear).toBeUndefined();
  });

  it('ignores invalid JSON without throwing', () => {
    const data = extractJsonLd(wrap('{ this is not json'));
    expect(data.title).toBeUndefined();
    expect(data.price).toBeUndefined();
  });

  it('returns partial data', () => {
    const data = extractJsonLd(wrap(JSON.stringify({ name: 'Only title' })));
    expect(data.title).toBe('Only title');
    expect(data.price).toBeUndefined();
  });

  it('collects five images from an array and an object list', () => {
    const data = extractJsonLd(
      wrap(
        JSON.stringify({
          name: 'Bien',
          image: [
            'https://x/1.jpg',
            'https://x/2.jpg',
            { url: 'https://x/3.jpg' },
            { contentUrl: 'https://x/4.jpg' },
            'https://x/5.jpg',
          ],
        }),
      ),
    );
    expect(data.photoUrls).toEqual([
      'https://x/1.jpg',
      'https://x/2.jpg',
      'https://x/3.jpg',
      'https://x/4.jpg',
      'https://x/5.jpg',
    ]);
  });

  it('never takes the agency Organization address, name or logo as listing data', () => {
    // Real-world @graph shape (Figaro): the portal's Organization (Paris HQ,
    // Google-hosted logo) precedes the listing Offer.
    const data = extractJsonLd(
      wrap(
        JSON.stringify({
          '@graph': [
            {
              '@type': 'Organization',
              name: 'Propriétés Le Figaro',
              address: { '@type': 'PostalAddress', addressLocality: 'Paris', postalCode: '75009' },
              image: 'https://lh3.googleusercontent.com/logo.jpg',
            },
            { '@type': 'WebSite', name: 'Propriétés Le Figaro' },
            {
              '@type': 'Offer',
              name: 'Appartement avec terrasse',
              price: '990000',
              image: ['https://cdn.portail.fr/photo-1.jpg'],
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [{ '@type': 'ListItem', name: 'Accueil', position: 1 }],
            },
          ],
        }),
      ),
    );
    expect(data.title).toBe('Appartement avec terrasse');
    expect(data.price).toBe(990000);
    expect(data.city).toBeUndefined();
    expect(data.postalCode).toBeUndefined();
    expect(data.photoUrls).toEqual(['https://cdn.portail.fr/photo-1.jpg']);
  });

  it('collects images nested in itemListElement / gallery', () => {
    const data = extractJsonLd(
      wrap(
        JSON.stringify({
          '@type': 'ItemList',
          itemListElement: [
            { '@type': 'ListItem', item: { '@type': 'ImageObject', url: 'https://x/g1.jpg' } },
            {
              '@type': 'ListItem',
              item: { '@type': 'ImageObject', contentUrl: 'https://x/g2.jpg' },
            },
          ],
        }),
      ),
    );
    expect(data.photoUrls).toEqual(['https://x/g1.jpg', 'https://x/g2.jpg']);
  });
});

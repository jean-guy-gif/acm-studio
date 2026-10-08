import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractFigaro, isFigaro } from '@/features/comparable-import/extractors/figaro-extractor';
import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';

describe('isFigaro', () => {
  it('matches both Figaro real-estate hosts', () => {
    expect(isFigaro('proprietes.lefigaro.fr')).toBe(true);
    expect(isFigaro('www.proprietes.lefigaro.fr')).toBe(true);
    expect(isFigaro('immobilier.lefigaro.fr')).toBe(true);
    expect(isFigaro('www.seloger.com')).toBe(false);
    expect(isFigaro('lefigaro.fr')).toBe(false);
  });
});

describe('extractFigaro', () => {
  const prestigePage = `<html><head>
    <title>Vente Appartement / Penthouse de Luxe Lège-Cap-Ferret | 990 000 € | 98 m²</title>
    <meta property="og:description" content="Appartement avec terrasse face au bassin." />
    </head><body>
    <img src="https://cdn.immobilier.lefigaro.fr/media/104387285/photo-1.jpg" />
    <img src="https://cdn.immobilier.lefigaro.fr/media/104387285/photo-2.jpg" />
    <img src="https://lh3.googleusercontent.com/agency-logo.jpg" />
    <p>2 chambres</p>
    </body></html>`;

  it('reads price, surface and city from the prestige title', () => {
    const data = extractFigaro(prestigePage);
    expect(data.price).toBe(990000);
    expect(data.surfaceArea).toBe(98);
    expect(data.city).toBe('Lège-Cap-Ferret');
    expect(data.bedroomsCount).toBe(2);
    expect(data.listingDescription).toBe('Appartement avec terrasse face au bassin.');
  });

  it('keeps only Figaro CDN photos, never Google-hosted assets', () => {
    const data = extractFigaro(prestigePage);
    expect(data.photoUrls).toEqual([
      'https://cdn.immobilier.lefigaro.fr/media/104387285/photo-1.jpg',
      'https://cdn.immobilier.lefigaro.fr/media/104387285/photo-2.jpg',
    ]);
  });

  it('reads the classic host title format with postal code', () => {
    const data = extractFigaro(
      `<html><head><title>Appartement à vendre 3 pièces 65 m² Nice (06000) | 320 000 € | 65 m²</title></head><body></body></html>`,
    );
    expect(data.city).toBe('Nice');
    expect(data.postalCode).toBe('06000');
    expect(data.roomsCount).toBe(3);
    expect(data.price).toBe(320000);
    expect(data.surfaceArea).toBe(65);
  });

  it('returns partial data when the title has no separators', () => {
    const data = extractFigaro(
      `<html><head><title>Une annonce sans structure</title></head><body></body></html>`,
    );
    expect(data.title).toBe('Une annonce sans structure');
    expect(data.price).toBeUndefined();
    expect(data.surfaceArea).toBeUndefined();
    expect(data.city).toBeUndefined();
  });
});

// Mission 76 — real page captured on 07/10/2026 (annonce-109593037, « Voir les 12
// photos »). Third-party scripts, styles and tracking identifiers were removed from
// the capture; the application state « __NUXT_DATA__ » is untouched.
describe('extractFigaro — photos from the structured data (Nice, annonce-109593037)', () => {
  const url = 'https://immobilier.lefigaro.fr/annonces/annonce-109593037.html';
  const html = readFileSync(
    join(__dirname, '__fixtures__', 'figaro-nice-appartement.html'),
    'utf8',
  );

  it('reads the 12 photos the ad publishes, full size, without duplicate', () => {
    const photos = extractFigaro(html).photoUrls ?? [];
    expect(photos).toHaveLength(12);
    expect(new Set(photos).size).toBe(12);
    for (const photo of photos) {
      expect(photo).toMatch(/^https:\/\/lh3\.googleusercontent\.com\/[\w-]+=rw-w0-h1600-l80$/);
    }
  });

  it('through the pipeline: 12 photos, never a pictogram nor a photo of a similar ad', () => {
    const parts = extractListingData(html, url);
    const { data } = normalizeListingData(parts, url, 'Figaro Immobilier');
    expect(data.photoUrls).toHaveLength(12);
    expect(data.photoUrls).toEqual(parts.portal.photoUrls);
    expect(data.photoUrls.some((photo) => /\.svg|figarocms|cdn\.immobilier/.test(photo))).toBe(
      false,
    );
  });

  it('a Google-hosted image stays refused when it does not come from the ad data', () => {
    const page = `<html><head><title>Appartement à vendre 3 pièces 65 m² Nice (06000)</title>
      <meta property="og:image" content="https://lh3.googleusercontent.com/logo-agence=rw"></head>
      <body><img src="https://lh3.googleusercontent.com/avis-google=rw"></body></html>`;
    const parts = extractListingData(page, url);
    const { data } = normalizeListingData(parts, url, 'Figaro Immobilier');
    expect(data.photoUrls).toEqual([]);
  });

  it('a damaged application state gives no photo instead of failing', () => {
    const broken =
      '<script type="application/json" id="__NUXT_DATA__">[["ShallowReactive",1],{"data":</script>';
    expect(extractFigaro(broken).photoUrls).toBeUndefined();
  });
});

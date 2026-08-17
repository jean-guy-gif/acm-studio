import { describe, expect, it } from 'vitest';

import { extractFigaro, isFigaro } from '@/features/comparable-import/extractors/figaro-extractor';

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

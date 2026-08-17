import { describe, expect, it } from 'vitest';

import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import { detectSource } from '@/features/comparable-import/utils/detect-source';

// The "paste the page code" fallback feeds advisor-pasted HTML through the SAME
// pipeline as the URL import. These tests pin the paste-specific behaviours:
// relative photo resolution against the pasted listing URL, portal detection
// from the pasted URL, and the SPA (Bien'ici) embedded-JSON case.

function run(html: string, url: string) {
  const parts = extractListingData(html, url);
  const source = detectSource(new URL(url).hostname);
  return normalizeListingData(parts, url, source);
}

describe('paste fallback pipeline', () => {
  it('resolves relative photo URLs against the pasted listing URL', () => {
    const { data } = run(
      `<html><head><title>Maison 5 pièces</title></head><body>
        <div>Prix : 480 000 €</div>
        <img src="/photos/maison-1.jpg" />
        <img src="/photos/maison-2.jpg" />
      </body></html>`,
      'https://www.agence-exemple.fr/annonces/maison-123',
    );
    expect(data.price).toBe(480000);
    expect(data.photoUrls).toEqual([
      'https://www.agence-exemple.fr/photos/maison-1.jpg',
      'https://www.agence-exemple.fr/photos/maison-2.jpg',
    ]);
  });

  it('reads a Bien’ici-shaped page from its embedded ad JSON', () => {
    const ad = {
      price: 365000,
      surfaceArea: 68,
      roomsQuantity: 3,
      bedroomsQuantity: 2,
      city: 'Nice',
    };
    const { data, foundFields } = run(
      `<html><head><script type="application/json" data-ad>${JSON.stringify(ad)}</script></head><body></body></html>`,
      'https://www.bienici.com/annonce/vente/nice/appartement/3pieces/ag-123',
    );
    expect(data.source).toBe("Bien'ici");
    expect(data.price).toBe(365000);
    expect(data.surfaceArea).toBe(68);
    expect(data.roomsCount).toBe(3);
    expect(data.bedroomsCount).toBe(2);
    expect(data.city).toBe('Nice');
    expect(foundFields).toContain('price');
  });

  it('labels the source from the pasted URL for both Figaro hosts', () => {
    const html = '<html><head><title>Bien 200 000 € | 50 m²</title></head><body></body></html>';
    expect(run(html, 'https://proprietes.lefigaro.fr/annonces/x/1/').data.source).toBe(
      'Propriétés Le Figaro',
    );
    expect(run(html, 'https://immobilier.lefigaro.fr/annonces/annonce-1.html').data.source).toBe(
      'Figaro Immobilier',
    );
  });

  it('finds nothing exploitable in an empty page', () => {
    const { foundFields, data } = run(
      '<html><body><p>Bonjour</p></body></html>',
      'https://www.exemple.fr/annonce',
    );
    expect(foundFields.filter((field) => field !== 'title')).toEqual([]);
    expect(data.photoUrls).toEqual([]);
  });
});

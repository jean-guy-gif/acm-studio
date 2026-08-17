import { describe, expect, it } from 'vitest';

import {
  detectSearchPortal,
  extractSearchResults,
} from '@/features/competitor-search/services/extract-search-results';

describe('detectSearchPortal', () => {
  it('maps hosts to portals', () => {
    expect(detectSearchPortal('www.green-acres.fr')).toBe('green_acres');
    expect(detectSearchPortal('www.seloger.com')).toBe('seloger');
    expect(detectSearchPortal('www.bienici.com')).toBe('bienici');
    expect(detectSearchPortal('immobilier.lefigaro.fr')).toBe('figaro');
    expect(detectSearchPortal('proprietes.lefigaro.fr')).toBe('figaro');
    expect(detectSearchPortal('example.com')).toBeNull();
  });
});

describe('extractSearchResults', () => {
  it('extracts SeLoger listing cards with price, surface, rooms and photo', () => {
    // URL shapes observed on the real seloger.com results page (2026-08).
    const html = `
      <div class="card">
        <a href="https://www.seloger.com/annonces/achat/appartement/nice-06/cimiez/276092655.htm">Annonce 1</a>
        <img data-src="https://mms.seloger.com/a/b/c/photo-276092655.jpg" />
        <span>599 000 €</span><span>72 m²</span><span>3 pièces</span>
      </div>
      <div class="card">
        <a href="/annonces/achat/appartement/nice-06/275623133.htm">Annonce 2</a>
        <span>320 000 €</span><span>45 m²</span><span>2 pièces</span>
      </div>
    `;
    const results = extractSearchResults(html, 'https://www.seloger.com/recherche/', 'seloger');
    expect(results).toHaveLength(2);
    expect(results[0].url).toBe(
      'https://www.seloger.com/annonces/achat/appartement/nice-06/cimiez/276092655.htm',
    );
    expect(results[0].price).toBe(599000);
    expect(results[0].surfaceArea).toBe(72);
    expect(results[0].roomsCount).toBe(3);
    expect(results[0].photoUrl).toBe('https://mms.seloger.com/a/b/c/photo-276092655.jpg');
    expect(results[1].url).toBe(
      'https://www.seloger.com/annonces/achat/appartement/nice-06/275623133.htm',
    );
    expect(results[1].price).toBe(320000);
  });

  it('extracts Green Acres property links and deduplicates repeats', () => {
    const html = `
      <a href="https://www.green-acres.fr/fr/properties/appartement/nice/Aisoqyjgx4ecqbdi.htm">A</a>
      <span>699 000 €</span><span>111 m²</span><span>5 pièces</span>
      <a href="https://www.green-acres.fr/fr/properties/appartement/nice/Aisoqyjgx4ecqbdi.htm">A encore</a>
      <a href="https://www.green-acres.fr/fr/properties/maison/antibes/Bzzz123.htm">B</a>
      <span>450 000 €</span>
    `;
    const results = extractSearchResults(
      html,
      'https://www.green-acres.fr/immobilier/nice',
      'green_acres',
    );
    expect(results).toHaveLength(2);
    expect(results[0].price).toBe(699000);
    expect(results[0].surfaceArea).toBe(111);
    expect(results[1].url).toContain('Bzzz123.htm');
  });

  it('extracts Bien’ici announce links', () => {
    const html = `
      <a href="/annonce/vente/nice/appartement/5pieces/ag757613-543251441">X</a>
      <span>890 000 €</span><span>111 m²</span><span>5 pièces</span>
    `;
    const results = extractSearchResults(
      html,
      'https://www.bienici.com/recherche/achat/nice-06000',
      'bienici',
    );
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe(
      'https://www.bienici.com/annonce/vente/nice/appartement/5pieces/ag757613-543251441',
    );
    expect(results[0].price).toBe(890000);
  });

  it('extracts Figaro listing links (prestige id form)', () => {
    const html = `
      <a href="https://proprietes.lefigaro.fr/annonces/appartement-gironde-aquitaine-france/104387285/">Y</a>
      <span>990 000 €</span><span>98 m²</span>
    `;
    const results = extractSearchResults(
      html,
      'https://proprietes.lefigaro.fr/annonces/appartement-achat-prestige-france/',
      'figaro',
    );
    expect(results).toHaveLength(1);
    expect(results[0].price).toBe(990000);
    expect(results[0].surfaceArea).toBe(98);
  });

  it('ignores generic images and returns null fields when nothing is readable', () => {
    const html = `
      <a href="/annonces/achat/appartement/nice-06/999999.htm">Sans données</a>
      <img src="https://cdn.seloger.com/placeholder.jpg" />
    `;
    const results = extractSearchResults(html, 'https://www.seloger.com/', 'seloger');
    expect(results).toHaveLength(1);
    expect(results[0].price).toBeNull();
    expect(results[0].photoUrl).toBeNull();
  });

  it('caps the number of candidates', () => {
    const cards = Array.from(
      { length: 40 },
      (_, i) => `<a href="/annonces/achat/appartement/nice-06/10000${i}.htm">L${i}</a>`,
    ).join('\n');
    const results = extractSearchResults(cards, 'https://www.seloger.com/', 'seloger');
    expect(results.length).toBeLessThanOrEqual(20);
  });
});

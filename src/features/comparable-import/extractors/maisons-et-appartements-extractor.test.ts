import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  extractMaisonsEtAppartements,
  isMaisonsEtAppartements,
} from '@/features/comparable-import/extractors/maisons-et-appartements-extractor';

// Real page measured on 16/09/2026 (maisonsetappartements.fr/ads/4534734). A
// complete server-rendered page with a clean schema.org Product block.
const villeneuveHtml = readFileSync(
  join(__dirname, '__fixtures__', 'maisons-et-appartements-villeneuve.html'),
  'utf8',
);

describe('isMaisonsEtAppartements', () => {
  it('matches the domain and its subdomains', () => {
    expect(isMaisonsEtAppartements('www.maisonsetappartements.fr')).toBe(true);
    expect(isMaisonsEtAppartements('maisonsetappartements.fr')).toBe(true);
    expect(isMaisonsEtAppartements('seloger.com')).toBe(false);
  });
});

describe('extractMaisonsEtAppartements', () => {
  it('real page: reads price, surface, rooms and city from the Product block', () => {
    const data = extractMaisonsEtAppartements(villeneuveHtml);
    expect(data.price).toBe(388500);
    expect(data.surfaceArea).toBe(68);
    expect(data.roomsCount).toBe(3);
    expect(data.city).toBe('Villeneuve-Loubet');
    expect(data.title).toContain('Villeneuve-Loubet');
  });

  it('real page: leaves listingPublishedAt empty — this portal publishes no listing date', () => {
    const data = extractMaisonsEtAppartements(villeneuveHtml);
    // The three dates on the page (price validity 2027-09-16, today 16/09/2026, a
    // DPE mention 01 juillet 2021) are NOT a publication date. The age must come
    // from the first ACM observation, never from one of these.
    expect(data.listingPublishedAt).toBeUndefined();
  });

  it('real page: keeps only photos scoped to this listing', () => {
    const data = extractMaisonsEtAppartements(villeneuveHtml);
    expect(data.photoUrls && data.photoUrls.length).toBeGreaterThan(0);
    for (const url of data.photoUrls ?? []) {
      expect(url).toContain('5045398'); // the listing's own photo group
      expect(url).not.toContain(','); // never a comma-joined srcset run
    }
  });

  it('falls back to prix-ann when the structured Product block is absent', () => {
    const html = '<div><span class="prix-ann d-md-none">388&nbsp;500 €</span></div>';
    const data = extractMaisonsEtAppartements(html);
    expect(data.price).toBe(388500);
    // Nothing else is invented when the structured block is missing.
    expect(data.surfaceArea).toBeUndefined();
    expect(data.city).toBeUndefined();
  });

  it('reads the Offer price, never a neighbour price, and parses the name sub-values', () => {
    const html = `
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Agence"}</script>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product",
        "name":"Nice - Maison à vendre - 5 pièces - 120 m² - 750 000 €",
        "offers":{"@type":"Offer","priceCurrency":"EUR","price":750000}}</script>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"ItemList","itemListElement":[]}</script>
      <span class="prix-ann">999 999 €</span>`;
    const data = extractMaisonsEtAppartements(html);
    expect(data.price).toBe(750000); // the Product Offer, not the stray prix-ann
    expect(data.surfaceArea).toBe(120);
    expect(data.roomsCount).toBe(5);
    expect(data.city).toBe('Nice');
  });
});

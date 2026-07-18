import { describe, expect, it } from 'vitest';

import { extractHtml } from '@/features/comparable-import/extractors/html-extractor';

describe('extractHtml', () => {
  it('extracts visible price, surface, rooms, bedrooms and DPE', () => {
    const html = `
      <title>Appartement 300 000 €</title>
      <div>Prix : 300 000 €</div>
      <div>Surface 75 m²</div>
      <div>4 pièces</div>
      <div>2 chambres</div>
      <div>DPE : C</div>
    `;
    const data = extractHtml(html);
    expect(data.price).toBe(300000);
    expect(data.surfaceArea).toBe(75);
    expect(data.roomsCount).toBe(4);
    expect(data.bedroomsCount).toBe(2);
    expect(data.energyRating).toBe('C');
  });

  it('returns empty result for a page with no exploitable data', () => {
    const data = extractHtml('<html><body><p>Bienvenue</p></body></html>');
    expect(data.price).toBeUndefined();
    expect(data.surfaceArea).toBeUndefined();
    expect(data.roomsCount).toBeUndefined();
  });

  it('rejects an unlabeled price fragment (Green Acres 5070 regression)', () => {
    // A bare monetary fragment with no "prix" label must not be accepted.
    const data = extractHtml('<div>Charges 5 070 € / an</div><div>Honoraires 335 €</div>');
    expect(data.price).toBeUndefined();
  });

  it('accepts a price explicitly tied to a "prix" label', () => {
    const data = extractHtml('<div class="price">Prix : 335 000 €</div>');
    expect(data.price).toBe(335000);
  });

  it('rejects an unlabeled surface (SeLoger 352 regression)', () => {
    // "352 m²" with no "surface" label must not be accepted as the surface.
    const data = extractHtml('<div>Réf 352 m² de terrasse au loin</div>');
    expect(data.surfaceArea).toBeUndefined();
  });

  it('accepts a surface explicitly tied to a "surface" label', () => {
    const data = extractHtml('<div>Surface habitable : 57 m²</div>');
    expect(data.surfaceArea).toBe(57);
  });

  it('extracts DPE and GES from their own labels (SeLoger DPE C / GES C regression)', () => {
    // Real observed structure: the listing shows "DPE C" and "GES C". The former
    // must never leak into the latter and neither must be an isolated letter.
    const html = `
      <div class="diagnostics">
        <span>DPE C</span>
        <span>GES C</span>
      </div>
    `;
    const data = extractHtml(html);
    expect(data.energyRating).toBe('C');
    expect(data.gesRating).toBe('C');
  });

  it('does not grab an isolated letter from an A–G energy scale legend', () => {
    // The scale row "A B C D E F G" must not be mistaken for the actual rating.
    const data = extractHtml('<ul class="dpe-scale"><li>A</li><li>B</li><li>C</li></ul>');
    expect(data.energyRating).toBeUndefined();
    expect(data.gesRating).toBeUndefined();
  });

  it('reads the portal price/m² only when tied to a €/m² label', () => {
    const data = extractHtml('<div>Prix au m² : 5 827 €/m²</div>');
    expect(data.portalPricePerSquareMeter).toBe(5827);
  });
});

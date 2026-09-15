import { describe, expect, it } from 'vitest';

import { extractBienIci } from '@/features/comparable-import/extractors/bienici-extractor';

describe('extractBienIci', () => {
  it('returns nothing for the JS-rendered shell (no embedded ad data)', () => {
    const shell =
      '<html><body><div id="app"></div><script id="js-alternatives">[]</script></body></html>';
    const data = extractBienIci(shell);
    expect(data.price).toBeUndefined();
    expect(data.surfaceArea).toBeUndefined();
    expect(data.city).toBeUndefined();
  });

  it('reads an embedded ad JSON when present', () => {
    const html = `<script type="application/json" data-ad>{"price":455000,"surfaceArea":72,"roomsQuantity":3,"city":"Antibes"}</script>`;
    const data = extractBienIci(html);
    expect(data.price).toBe(455000);
    expect(data.surfaceArea).toBe(72);
    expect(data.roomsCount).toBe(3);
    expect(data.city).toBe('Antibes');
  });

  it('reads the lower-bound « Publiée il y a plus de 2 mois » (verbatim) and « Modifiée le 29 août 2026 »', () => {
    const html = `
      <span class="date-published">Publiée il y a plus de 2 mois</span>
      <span class="date-modified">Modifiée le 29 août 2026</span>
      <script type="application/json" data-ad>{"price":455000}</script>`;
    const data = extractBienIci(html);
    expect(data.publicationLowerBoundLabel).toBe('plus de 2 mois');
    expect(data.modifiedAt).toBe('2026-08-29T00:00:00.000Z');
    // A lower bound is NEVER an exact publication date.
    expect(data.listingPublishedAt).toBeUndefined();
  });
});

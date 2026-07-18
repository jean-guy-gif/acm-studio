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
});

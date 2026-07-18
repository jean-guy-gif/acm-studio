import { describe, expect, it } from 'vitest';

import { extractSeLoger } from '@/features/comparable-import/extractors/seloger-extractor';

const SERVED = `
<meta property="og:title" content="Appartement à vendre T3/F3 52 m² 303000 € L'Estagnol Antibes" />
<meta property="og:url" content="https://www.seloger.com/annonces/achat/appartement/antibes-06/l-estagnol/265939571.htm" />
`;

const ORIGINAL_URL =
  'https://www.seloger.com/annonces/achat/appartement/antibes-06/l-estagnol/265939571.htm';

const BLOCKED = '<html><head><title>DataDome</title></head><body>Access denied</body></html>';

describe('extractSeLoger', () => {
  it('parses price, surface and rooms from og:title', () => {
    const data = extractSeLoger(SERVED, ORIGINAL_URL);
    expect(data.price).toBe(303000);
    expect(data.surfaceArea).toBe(52);
    expect(data.roomsCount).toBe(3);
  });

  it('recovers city and district from the original advisor URL (Antibes / L’Estagnol)', () => {
    const data = extractSeLoger(SERVED, ORIGINAL_URL);
    expect(data.city).toBe('Antibes');
    expect(data.district).toBe("L'Estagnol");
  });

  it('prefers the original URL over the canonical og:url for the location', () => {
    // og:url points to a different (redirected) city; the advisor's URL must win.
    const html = `
<meta property="og:title" content="Appartement T3 52 m² 303000 €" />
<meta property="og:url" content="https://www.seloger.com/annonces/achat/appartement/nice-06/cimiez/999.htm" />
`;
    const data = extractSeLoger(html, ORIGINAL_URL);
    expect(data.city).toBe('Antibes');
    expect(data.district).toBe("L'Estagnol");
  });

  it('falls back to og:url when no original URL is provided', () => {
    const data = extractSeLoger(SERVED);
    expect(data.city).toBe('Antibes');
    expect(data.district).toBe("L'Estagnol");
  });

  it('does not extract DPE/GES itself (handled by the strict generic extractor)', () => {
    const data = extractSeLoger(SERVED, ORIGINAL_URL);
    expect(data.energyRating).toBeUndefined();
    expect(data.gesRating).toBeUndefined();
  });

  it('returns nothing usable for a blocked (DataDome) page', () => {
    const data = extractSeLoger(BLOCKED, ORIGINAL_URL);
    expect(data.price).toBeUndefined();
    expect(data.surfaceArea).toBeUndefined();
  });
});

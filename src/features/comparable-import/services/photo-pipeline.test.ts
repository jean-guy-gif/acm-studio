import { describe, expect, it } from 'vitest';

import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';

// End-to-end fixture proof: a realistic multi-image listing page (JSON-LD gallery
// + Open Graph + lazy-loaded <img>/srcset + a logo) flows through extract →
// normalize and yields a deduplicated, generic-filtered, ordered gallery.
const URL = 'https://portal.test/annonce/123';

const FIXTURE = `
<html><head>
  <script type="application/ld+json">${JSON.stringify({
    '@type': 'RealEstateListing',
    name: 'Appartement T3',
    image: [
      'https://portal.test/p1.jpg',
      'https://portal.test/p2.jpg',
      { url: 'https://portal.test/p3.jpg' },
    ],
  })}</script>
  <meta property="og:image" content="https://portal.test/p1.jpg" />
  <meta property="og:image:secure_url" content="https://portal.test/og-hero.jpg" />
</head><body>
  <img src="https://portal.test/logo.png" alt="logo" />
  <img src="/placeholder.gif" data-src="/gallery/g1.jpg" />
  <img srcset="https://portal.test/gallery/g2-640x480.jpg 640w, https://portal.test/gallery/g2-1280x960.jpg 1280w" />
  <img src="/gallery/g2-320x240.jpg" />
</body></html>`;

describe('photo aspiration pipeline (fixture)', () => {
  it('aspirates several photos, filters generic, dedupes size variants, keeps order', () => {
    const parts = extractListingData(FIXTURE, URL);
    // Raw counts, before combining / filtering (for the audit log).
    const raw =
      (parts.jsonLd.photoUrls?.length ?? 0) +
      (parts.openGraph.photoUrls?.length ?? 0) +
      (parts.html.photoUrls?.length ?? 0);
    expect(raw).toBeGreaterThanOrEqual(7);

    const { data, foundFields } = normalizeListingData(parts, URL, 'portal.test');
    expect(foundFields).toContain('photoUrls');
    expect(data.photoUrls).toEqual([
      'https://portal.test/p1.jpg',
      'https://portal.test/p2.jpg',
      'https://portal.test/p3.jpg',
      'https://portal.test/og-hero.jpg',
      'https://portal.test/gallery/g1.jpg',
      'https://portal.test/gallery/g2-1280x960.jpg',
    ]);
    // Logo filtered; the g2 size variants collapsed to one.
    expect(data.photoUrls.some((url) => url.includes('logo'))).toBe(false);
    expect(data.photoUrls.filter((url) => url.includes('/gallery/g2'))).toHaveLength(1);
  });

  it('reports no photos (not an error) when the page has none', () => {
    const parts = extractListingData('<html><body><p>Rien</p></body></html>', URL);
    const { data, missingFields } = normalizeListingData(parts, URL, 'portal.test');
    expect(data.photoUrls).toEqual([]);
    expect(missingFields).toContain('photoUrls');
  });
});

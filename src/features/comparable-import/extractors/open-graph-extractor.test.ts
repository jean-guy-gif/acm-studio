import { describe, expect, it } from 'vitest';

import { extractOpenGraph } from '@/features/comparable-import/extractors/open-graph-extractor';

describe('extractOpenGraph', () => {
  it('extracts title, description, price and images', () => {
    const html = `
      <meta property="og:title" content="Maison T4" />
      <meta property="og:description" content="Avec jardin" />
      <meta property="product:price:amount" content="320000" />
      <meta property="og:image" content="https://cdn.x/a.jpg" />
      <meta property="og:image:url" content="https://cdn.x/b.jpg" />
    `;
    const data = extractOpenGraph(html);
    expect(data.title).toBe('Maison T4');
    expect(data.listingDescription).toBe('Avec jardin');
    expect(data.price).toBe(320000);
    expect(data.photoUrls).toEqual(['https://cdn.x/a.jpg', 'https://cdn.x/b.jpg']);
  });

  it('returns partial data when tags are missing', () => {
    const data = extractOpenGraph('<meta property="og:title" content="Just a title" />');
    expect(data.title).toBe('Just a title');
    expect(data.price).toBeUndefined();
    expect(data.photoUrls).toBeUndefined();
  });
});

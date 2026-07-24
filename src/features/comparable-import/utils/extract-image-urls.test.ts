import { describe, expect, it } from 'vitest';

import { extractImageUrls } from '@/features/comparable-import/utils/extract-image-urls';

describe('extractImageUrls', () => {
  it('reads plain img src in document order', () => {
    const html = '<img src="https://x/a.jpg"><img src="https://x/b.jpg">';
    expect(extractImageUrls(html)).toEqual(['https://x/a.jpg', 'https://x/b.jpg']);
  });

  it('prefers lazy data-src / data-lazy-src over a placeholder src', () => {
    expect(
      extractImageUrls('<img src="https://x/placeholder.gif" data-src="https://x/real.jpg">'),
    ).toEqual(['https://x/real.jpg']);
    expect(extractImageUrls('<img src="p.gif" data-lazy-src="https://x/lazy.jpg">')).toEqual([
      'https://x/lazy.jpg',
    ]);
  });

  it('picks the highest-resolution candidate from srcset', () => {
    const html = '<img srcset="https://x/s.jpg 320w, https://x/m.jpg 640w, https://x/l.jpg 1280w">';
    expect(extractImageUrls(html)).toEqual(['https://x/l.jpg']);
  });

  it('reads <source srcset> inside <picture>', () => {
    const html =
      '<picture><source srcset="https://x/big.webp 2x, https://x/small.webp 1x"><img src="https://x/fallback.jpg"></picture>';
    expect(extractImageUrls(html)).toEqual(['https://x/big.webp', 'https://x/fallback.jpg']);
  });

  it('decodes HTML entities and skips data: URIs', () => {
    expect(extractImageUrls('<img src="https://x/a.jpg?w=1&amp;h=2">')).toEqual([
      'https://x/a.jpg?w=1&h=2',
    ]);
    expect(extractImageUrls('<img src="data:image/gif;base64,AAAA">')).toEqual([]);
  });

  it('keeps relative URLs (resolved later by the deduplicator)', () => {
    expect(extractImageUrls('<img data-src="/media/photo-1.jpg">')).toEqual(['/media/photo-1.jpg']);
  });
});

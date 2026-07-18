import { describe, expect, it } from 'vitest';

import { deduplicatePhotoUrls } from '@/features/comparable-import/utils/deduplicate-photo-urls';

describe('deduplicatePhotoUrls', () => {
  it('returns [] for no photos', () => {
    expect(deduplicatePhotoUrls([])).toEqual([]);
  });

  it('keeps a single absolute url', () => {
    expect(deduplicatePhotoUrls(['https://cdn.example.com/a.jpg'])).toEqual([
      'https://cdn.example.com/a.jpg',
    ]);
  });

  it('resolves relative urls against the base', () => {
    expect(deduplicatePhotoUrls(['/img/a.jpg'], 'https://example.com/listing/1')).toEqual([
      'https://example.com/img/a.jpg',
    ]);
  });

  it('deduplicates and drops empty/invalid/forbidden protocols', () => {
    const result = deduplicatePhotoUrls([
      'https://x.com/a.jpg',
      'https://x.com/a.jpg',
      '',
      '   ',
      'not a url',
      'ftp://x.com/b.jpg',
      'data:image/png;base64,AAAA',
      'http://x.com/c.jpg',
    ]);
    expect(result).toEqual(['https://x.com/a.jpg', 'http://x.com/c.jpg']);
  });

  it('caps the number of photos at 20', () => {
    const many = Array.from({ length: 30 }, (_, index) => `https://x.com/${index}.jpg`);
    expect(deduplicatePhotoUrls(many)).toHaveLength(20);
  });
});

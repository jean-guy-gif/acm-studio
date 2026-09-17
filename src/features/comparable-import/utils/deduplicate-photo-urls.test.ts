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

  it('collapses size variants keeping the LARGEST, in first-appearance order', () => {
    const result = deduplicatePhotoUrls([
      'https://x.com/photo.jpg?w=1280', // dimensions dans la requête (ignorée) : 1er gardé
      'https://x.com/photo.jpg?w=320',
      'https://x.com/img-640x480.jpg', // dimensions dans le chemin : on garde la plus grande
      'https://x.com/img-1024x768.jpg',
    ]);
    expect(result).toEqual(['https://x.com/photo.jpg?w=1280', 'https://x.com/img-1024x768.jpg']);
  });

  it('collapses glued dimension prefixes (Maisons et Appartements f600x400 / f1200x800)', () => {
    const result = deduplicatePhotoUrls([
      'https://medias.maisonsetappartements.fr/pict/f600x400/5/0/4/5/ext_0_5045398.jpg',
      'https://medias.maisonsetappartements.fr/pict/f1200x800/5/0/4/5/ext_0_5045398.jpg',
    ]);
    expect(result).toEqual([
      'https://medias.maisonsetappartements.fr/pict/f1200x800/5/0/4/5/ext_0_5045398.jpg',
    ]);
  });

  it('collapses a mini thumbnail directory against the full one (Green Acres Photos / miniPhotos)', () => {
    const result = deduplicatePhotoUrls([
      'https://lb1.green-acres.com/a/b/Photos/b_1.jpg',
      'https://lb1.green-acres.com/a/b/miniPhotos/b_1.jpg',
    ]);
    expect(result).toEqual(['https://lb1.green-acres.com/a/b/Photos/b_1.jpg']);
  });

  it('resolves relative URLs against the base and preserves order', () => {
    const result = deduplicatePhotoUrls(['/media/1.jpg', '/media/2.jpg'], 'https://x.com/annonce');
    expect(result).toEqual(['https://x.com/media/1.jpg', 'https://x.com/media/2.jpg']);
  });

  it('does not merge genuinely different index-named photos', () => {
    const result = deduplicatePhotoUrls(['https://x.com/p-1.jpg', 'https://x.com/p-2.jpg']);
    expect(result).toHaveLength(2);
  });
});

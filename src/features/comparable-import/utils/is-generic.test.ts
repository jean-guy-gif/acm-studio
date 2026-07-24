import { describe, expect, it } from 'vitest';

import { isGenericImageUrl, isGenericTitle } from '@/features/comparable-import/utils/is-generic';

describe('isGenericTitle', () => {
  it('rejects portal names and slogans', () => {
    expect(isGenericTitle('SeLoger')).toBe(true);
    expect(
      isGenericTitle("Toutes les annonces immobilières dans le neuf et l'ancien - Bien'ici"),
    ).toBe(true);
    expect(isGenericTitle('Green Acres')).toBe(true);
    expect(isGenericTitle('  ')).toBe(true);
    expect(isGenericTitle('SeLoger', 'SeLoger')).toBe(true);
  });

  it('accepts a real listing title', () => {
    expect(isGenericTitle('Antibes/Ames Du Purgatoire')).toBe(false);
    expect(isGenericTitle('Bel appartement T3 avec vue', 'SeLoger')).toBe(false);
  });
});

describe('isGenericImageUrl', () => {
  it('rejects share/placeholder/logo/default/favicon assets', () => {
    for (const url of [
      'https://res.bienici.com/cacheForever/abc/images/share.png',
      'https://x.com/placeholder.jpg',
      'https://x.com/logo.svg',
      'https://x.com/default.jpg',
      'https://x.com/favicon.ico',
    ]) {
      expect(isGenericImageUrl(url), url).toBe(true);
    }
  });

  it('accepts a real property photo', () => {
    expect(isGenericImageUrl('https://lb1.green-acres.com/4221/A509112/Photos/A509112_1.jpg')).toBe(
      false,
    );
  });

  it('filters logos, placeholders, sprites, icons and pixels', () => {
    for (const url of [
      'https://x/logo.png',
      'https://x/placeholder.jpg',
      'https://x/sprite.svg',
      'https://x/icon-24.png',
      'https://x/pixel.gif',
      'https://x/favicon.ico',
    ]) {
      expect(isGenericImageUrl(url)).toBe(true);
    }
  });
});

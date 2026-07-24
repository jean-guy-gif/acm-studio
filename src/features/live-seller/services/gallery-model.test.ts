import { describe, expect, it } from 'vitest';

import { buildMosaic, wrapIndex } from '@/features/live-seller/services/gallery-model';

const photos = (n: number) => Array.from({ length: n }, (_v, i) => `p${i}.jpg`);

describe('buildMosaic', () => {
  it('handles a single photo (main only, no thumbs, no overlay)', () => {
    expect(buildMosaic(photos(1))).toEqual({ main: 'p0.jpg', thumbs: [], extraCount: 0 });
  });

  it('shows 4 photos as main + 3 thumbnails, no overlay', () => {
    const m = buildMosaic(photos(4));
    expect(m.main).toBe('p0.jpg');
    expect(m.thumbs).toEqual(['p1.jpg', 'p2.jpg', 'p3.jpg']);
    expect(m.extraCount).toBe(0);
  });

  it('shows 6 photos as main + 5 thumbnails, no overlay', () => {
    const m = buildMosaic(photos(6));
    expect(m.thumbs).toHaveLength(5);
    expect(m.extraCount).toBe(0);
  });

  it('surfaces the remainder as a "+N" overlay when more than 6', () => {
    const m = buildMosaic(photos(9));
    expect(m.thumbs).toHaveLength(5);
    expect(m.extraCount).toBe(3);
  });

  it('is empty for no photos', () => {
    expect(buildMosaic([])).toEqual({ main: null, thumbs: [], extraCount: 0 });
  });
});

describe('wrapIndex', () => {
  it('wraps forward and backward', () => {
    expect(wrapIndex(0, -1, 5)).toBe(4);
    expect(wrapIndex(4, 1, 5)).toBe(0);
    expect(wrapIndex(2, 1, 5)).toBe(3);
  });
  it('is safe on empty length', () => {
    expect(wrapIndex(0, 1, 0)).toBe(0);
  });
});

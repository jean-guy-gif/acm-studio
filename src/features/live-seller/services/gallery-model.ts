// Pure model behind the Live gallery mosaic + lightbox. Deterministic and
// DOM-free so it can be unit-tested.

export const MOSAIC_THUMBS = 5; // main photo + up to 5 thumbnails

export type Mosaic = {
  main: string | null;
  thumbs: string[];
  // Photos beyond the mosaic, surfaced as a "+N" overlay on the last thumbnail.
  extraCount: number;
};

export function buildMosaic(photos: string[]): Mosaic {
  if (photos.length === 0) {
    return { main: null, thumbs: [], extraCount: 0 };
  }
  const [main, ...rest] = photos;
  const thumbs = rest.slice(0, MOSAIC_THUMBS);
  const extraCount = Math.max(0, photos.length - (1 + thumbs.length));
  return { main, thumbs, extraCount };
}

// Circular index for the lightbox prev/next navigation.
export function wrapIndex(current: number, delta: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return (((current + delta) % length) + length) % length;
}

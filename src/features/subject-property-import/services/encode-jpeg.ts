import jpeg from 'jpeg-js';

import { BROCHURE_JPEG_QUALITY } from '@/features/subject-property-import/constants';

// Re-encodes decoded pixels (from pdfjs) into a JPEG. These are PHOTOS shown in a
// full-screen gallery during a seller meeting, not screenshots — JPEG at quality
// 82 keeps them ~10× lighter than a lossless PNG for no visible loss. Pure JS
// (jpeg-js): no native binary, so it builds and runs identically on Vercel and in
// tests. jpeg-js encodes from RGBA, so RGB pixels are widened first.

export type PixelKind = 'rgb' | 'rgba';

function toRgba(width: number, height: number, pixels: Uint8Array, kind: PixelKind): Uint8Array {
  if (kind === 'rgba') {
    return pixels;
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let src = 0, dst = 0; dst < rgba.length; src += 3, dst += 4) {
    rgba[dst] = pixels[src];
    rgba[dst + 1] = pixels[src + 1];
    rgba[dst + 2] = pixels[src + 2];
    rgba[dst + 3] = 255;
  }
  return rgba;
}

export function encodeJpeg(
  width: number,
  height: number,
  pixels: Uint8Array,
  kind: PixelKind,
): Uint8Array {
  const data = toRgba(width, height, pixels, kind);
  const encoded = jpeg.encode({ width, height, data }, BROCHURE_JPEG_QUALITY);
  return new Uint8Array(encoded.data);
}

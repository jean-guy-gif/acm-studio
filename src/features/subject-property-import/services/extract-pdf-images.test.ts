import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { extractPdfImages } from '@/features/subject-property-import/services/extract-pdf-images';
import { MIN_BROCHURE_IMAGE_DIMENSION } from '@/features/subject-property-import/constants';
import { validatePhotoBytes } from '@/features/subject-property-photos/services/validate-photo-upload';

function realBrochure(): Uint8Array {
  const url = new URL('./__fixtures__/brochure-le-cannet.pdf', import.meta.url);
  return new Uint8Array(readFileSync(fileURLToPath(url)));
}

describe('extractPdfImages — real brochure PDF', () => {
  it('rejects a non-PDF', async () => {
    const result = await extractPdfImages(new TextEncoder().encode('nope'));
    expect(result.ok).toBe(false);
  });

  it('returns deduplicated, above-threshold photos as valid images', async () => {
    const result = await extractPdfImages(realBrochure());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // The sheet embeds ~22 images (logos, DPE/GES vignettes, portrait, photos); the
    // three filters keep only the real photos — several, but well fewer than 22.
    expect(result.images.length).toBeGreaterThan(5);
    expect(result.images.length).toBeLessThan(22);

    for (const image of result.images) {
      // Filter 1: every kept image clears the size floor.
      expect(Math.max(image.width, image.height)).toBeGreaterThanOrEqual(
        MIN_BROCHURE_IMAGE_DIMENSION,
      );
      // Each recovered image is a real, deposit-valid photo (JPEG magic bytes).
      const validation = validatePhotoBytes(image.bytes);
      expect(validation.ok).toBe(true);
      if (validation.ok) {
        expect(validation.format).toBe('jpeg');
      }
    }

    // Filter 2: no two kept images are byte-identical (the repeated logo is gone).
    const signatures = new Set(
      result.images.map((i) => `${i.width}x${i.height}:${i.bytes.length}`),
    );
    expect(signatures.size).toBeGreaterThan(1);
  });
});

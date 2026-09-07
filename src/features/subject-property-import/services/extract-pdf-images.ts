import 'server-only';

import { createHash } from 'node:crypto';

import {
  MAX_BROCHURE_BYTES,
  MAX_BROCHURE_PAGES,
  MIN_BROCHURE_IMAGE_DIMENSION,
  PDF_MAGIC,
} from '@/features/subject-property-import/constants';
import {
  encodeJpeg,
  type PixelKind,
} from '@/features/subject-property-import/services/encode-jpeg';
import { pdfDocumentParams } from '@/features/subject-property-import/services/pdf-document-params';

// Extracts the embedded PHOTOS from a brochure PDF, in pure JavaScript (pdfjs).
// Three filters, exactly as the brief asks:
//   1. minimum dimensions — the agency logo (512 px) and DPE/GES vignettes (~311 px)
//      are smaller than the 1024 px photos;
//   2. de-duplication by checksum — the logo repeats identically on every page, so
//      its decoded pixels hash to the same value and it is dropped after the first;
//   3. decodable only — anything pdfjs cannot decode into pixels is skipped.
//
// pdfjs returns DECODED pixels (RGB/RGBA), never the original JPEG, so each kept
// image is re-encoded to JPEG — a real, magic-byte-valid photo the deposit step
// validates exactly like a manual upload. The PDF is DATA: nothing is executed.

// pdfjs ImageKind: 1 = GRAYSCALE, 2 = RGB (24bpp), 3 = RGBA (32bpp).
const IMAGE_KIND_RGB = 2;
const IMAGE_KIND_RGBA = 3;

export type BrochureImage = { bytes: Uint8Array; width: number; height: number };

export type BrochureImagesResult =
  { ok: true; images: BrochureImage[] } | { ok: false; error: string };

function hasPdfMagic(bytes: Uint8Array): boolean {
  return bytes.byteLength >= PDF_MAGIC.length && PDF_MAGIC.every((b, i) => bytes[i] === b);
}

export async function extractPdfImages(bytes: Uint8Array): Promise<BrochureImagesResult> {
  if (bytes.byteLength === 0) {
    return { ok: false, error: 'Fichier PDF vide.' };
  }
  if (bytes.byteLength > MAX_BROCHURE_BYTES) {
    return { ok: false, error: 'Le PDF est trop volumineux.' };
  }
  if (!hasPdfMagic(bytes)) {
    return { ok: false, error: 'Ce fichier n’est pas un PDF.' };
  }

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  let doc;
  try {
    doc = await pdfjs.getDocument(pdfDocumentParams(bytes)).promise;
  } catch (error) {
    console.error('[extractPdfImages] getDocument failed:', error);
    return { ok: false, error: 'Le PDF n’a pas pu être lu.' };
  }
  if (doc.numPages > MAX_BROCHURE_PAGES) {
    await doc.destroy();
    return { ok: false, error: 'Le PDF comporte trop de pages.' };
  }

  const seen = new Set<string>();
  const images: BrochureImage[] = [];
  try {
    // In pdfjs v4 every embedded image (JPEG included) is painted via
    // paintImageXObject; the old paintJpegXObject op no longer exists.
    const paintImage = pdfjs.OPS.paintImageXObject;
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const operatorList = await page.getOperatorList();

      const names = new Set<string>();
      for (let i = 0; i < operatorList.fnArray.length; i += 1) {
        if (operatorList.fnArray[i] === paintImage) {
          const arg = operatorList.argsArray[i][0];
          if (typeof arg === 'string') {
            names.add(arg);
          }
        }
      }

      for (const name of names) {
        // Filter 3 — decodable only: skip anything pdfjs cannot hand back.
        let image: { width?: number; height?: number; kind?: number; data?: Uint8Array } | null =
          null;
        try {
          image = await new Promise((resolve) => page.objs.get(name, resolve));
        } catch {
          image = null;
        }
        if (!image?.data || !image.width || !image.height) {
          continue;
        }
        const { width, height, data } = image;

        // Filter 1 — minimum dimensions.
        if (Math.max(width, height) < MIN_BROCHURE_IMAGE_DIMENSION) {
          continue;
        }

        // Filter 2 — de-duplicate by checksum of the decoded pixels.
        const checksum = createHash('sha1').update(data).digest('hex');
        if (seen.has(checksum)) {
          continue;
        }
        seen.add(checksum);

        let kind: PixelKind | null = null;
        if (image.kind === IMAGE_KIND_RGB && data.length >= width * height * 3) {
          kind = 'rgb';
        } else if (image.kind === IMAGE_KIND_RGBA && data.length >= width * height * 4) {
          kind = 'rgba';
        }
        if (!kind) {
          continue; // grayscale masks / unexpected layouts are not photos
        }

        images.push({ bytes: encodeJpeg(width, height, data, kind), width, height });
      }
      page.cleanup();
    }
    return { ok: true, images };
  } catch {
    return { ok: false, error: 'Les images du PDF n’ont pas pu être extraites.' };
  } finally {
    await doc.destroy();
  }
}

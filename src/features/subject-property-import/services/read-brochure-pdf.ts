// Mission 43 — reads the seller's brochure PDF in the ADVISOR'S BROWSER. pdfjs is a
// browser library here: its worker and data files are served as static assets from
// /pdfjs/ (copied by scripts/copy-pdfjs-assets.mjs), so there is nothing to resolve
// on a disk and nothing to trace into a serverless function. The PDF never leaves
// the advisor's machine — only the extracted text and re-encoded photos are sent.
//
// The heavy work (decode + JPEG re-encode of ~20 images) runs on the advisor's
// machine, which also removes the serverless execution-time question entirely.

import {
  BROCHURE_JPEG_QUALITY,
  MAX_BROCHURE_BYTES,
  MAX_BROCHURE_PAGES,
  MIN_BROCHURE_IMAGE_DIMENSION,
} from '@/features/subject-property-import/constants';
import {
  reconstructPageText,
  type PdfTextItem,
} from '@/features/subject-property-import/services/reconstruct-page-text';

const STANDARD_FONT_DATA_URL = '/pdfjs/standard_fonts/';
const CMAP_URL = '/pdfjs/cmaps/';
const WORKER_SRC = '/pdfjs/pdf.worker.min.mjs';

// pdfjs ImageKind: 1 = GRAYSCALE, 2 = RGB (24bpp), 3 = RGBA (32bpp).
const IMAGE_KIND_RGB = 2;
const IMAGE_KIND_RGBA = 3;

type PdfjsModule = typeof import('pdfjs-dist');
let pdfjsPromise: Promise<PdfjsModule> | null = null;

async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

async function openDocument(pdfjs: PdfjsModule, file: File) {
  if (file.size > MAX_BROCHURE_BYTES) {
    throw new Error('Le PDF est trop volumineux.');
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({
    data,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;
  if (doc.numPages > MAX_BROCHURE_PAGES) {
    await doc.destroy();
    throw new Error('Le PDF comporte trop de pages.');
  }
  return doc;
}

// Extracts the text layer, page by page, using the SAME reconstruction as before —
// the committed .txt fixtures must reproduce identically.
export async function readBrochurePages(file: File): Promise<string[]> {
  const pdfjs = await loadPdfjs();
  const doc = await openDocument(pdfjs, file);
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const raw of content.items) {
        if (!('str' in raw) || !('transform' in raw)) {
          continue;
        }
        const item = raw as { str: string; transform: number[]; width?: number };
        items.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width ?? 0,
        });
      }
      pages.push(reconstructPageText(items));
      page.cleanup();
    }
    return pages;
  } finally {
    await doc.destroy();
  }
}

type DecodedImage = {
  width: number;
  height: number;
  kind?: number;
  data?: Uint8ClampedArray;
  bitmap?: ImageBitmap;
};

function drawToCanvas(image: DecodedImage): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  if (image.bitmap) {
    ctx.drawImage(image.bitmap, 0, 0);
    return canvas;
  }
  if (!image.data) {
    return null;
  }
  // Raw pixels: widen RGB to RGBA for putImageData; RGBA is used as-is.
  const pixelCount = image.width * image.height;
  const rgba = new Uint8ClampedArray(pixelCount * 4);
  if (image.kind === IMAGE_KIND_RGBA && image.data.length >= pixelCount * 4) {
    rgba.set(image.data.subarray(0, pixelCount * 4));
  } else if (image.kind === IMAGE_KIND_RGB && image.data.length >= pixelCount * 3) {
    for (let src = 0, dst = 0; dst < rgba.length; src += 3, dst += 4) {
      rgba[dst] = image.data[src];
      rgba[dst + 1] = image.data[src + 1];
      rgba[dst + 2] = image.data[src + 2];
      rgba[dst + 3] = 255;
    }
  } else {
    return null; // grayscale masks / unexpected layouts are not photos
  }
  ctx.putImageData(new ImageData(rgba, image.width, image.height), 0, 0);
  return canvas;
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', BROCHURE_JPEG_QUALITY));
}

async function sha1(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Extracts the embedded PHOTOS as JPEG blobs, with the same three filters as the
// old server path: minimum dimensions, de-duplication by checksum (the logo repeats
// identically), and decodable only. Encoding is native (canvas.toBlob) — no library.
export async function extractBrochurePhotos(file: File): Promise<Blob[]> {
  const pdfjs = await loadPdfjs();
  const doc = await openDocument(pdfjs, file);
  const seen = new Set<string>();
  const photos: Blob[] = [];
  try {
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
        let image: DecodedImage | null = null;
        try {
          image = await new Promise((resolve) => page.objs.get(name, resolve));
        } catch {
          image = null;
        }
        if (!image?.width || !image.height) {
          continue;
        }
        if (Math.max(image.width, image.height) < MIN_BROCHURE_IMAGE_DIMENSION) {
          continue;
        }
        const canvas = drawToCanvas(image);
        if (!canvas) {
          continue;
        }
        const blob = await canvasToJpeg(canvas);
        if (!blob) {
          continue;
        }
        const checksum = await sha1(await blob.arrayBuffer());
        if (seen.has(checksum)) {
          continue;
        }
        seen.add(checksum);
        photos.push(blob);
      }
      page.cleanup();
    }
    return photos;
  } finally {
    await doc.destroy();
  }
}

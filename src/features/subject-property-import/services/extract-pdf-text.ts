import 'server-only';

import {
  MAX_BROCHURE_BYTES,
  MAX_BROCHURE_PAGES,
  PDF_MAGIC,
} from '@/features/subject-property-import/constants';

// Reads the TEXT LAYER of a PDF, page by page, preserving reading order. Pure
// JavaScript (pdfjs-dist): Vercel has no system binary, so pdftotext / mupdf are
// out. We read text and recognise labels elsewhere — this is not a layout engine.
//
// The bytes are DATA: nothing here is executed, and no text is ever re-injected as
// HTML. Size and page count are bounded before we read a single glyph.

export type PdfTextResult = { ok: true; pages: string[] } | { ok: false; error: string };

// A minimal, testable view of a pdfjs text item (position + width + string). Kept
// separate so the reading-order reconstruction can be unit-tested without a PDF.
export type PdfTextItem = { str: string; x: number; y: number; width: number };

// Two glyphs sitting on the same visual line whose horizontal gap exceeds this
// (PDF user-space units) belong to DIFFERENT cells — the agency sheet is laid out
// in two columns, and splitting on the gap keeps each "Libellé : valeur" on its
// own line instead of merging the left and right columns.
const COLUMN_GAP = 10;
// Glyphs within this vertical distance share a line.
const LINE_TOLERANCE = 3;

// Pure. Rebuilds one page's text from its positioned items: cluster into lines by
// Y (top→bottom), order each line by X (left→right), and split a line wherever a
// wide horizontal gap marks a column boundary. Deterministic — same input, same
// output — which is exactly what the committed .txt fixtures capture.
export function reconstructPageText(items: PdfTextItem[]): string {
  const glyphs = items.filter((it) => it.str != null && it.str.trim() !== '');
  const lines: { y: number; cells: PdfTextItem[] }[] = [];
  for (const glyph of glyphs) {
    let line = lines.find((l) => Math.abs(l.y - glyph.y) <= LINE_TOLERANCE);
    if (!line) {
      line = { y: glyph.y, cells: [] };
      lines.push(line);
    }
    line.cells.push(glyph);
  }
  lines.sort((a, b) => b.y - a.y);

  const out: string[] = [];
  for (const line of lines) {
    line.cells.sort((a, b) => a.x - b.x);
    let segment = '';
    let previousEnd: number | null = null;
    const flush = () => {
      const text = segment.replace(/\s+/g, ' ').trim();
      if (text) {
        out.push(text);
      }
      segment = '';
    };
    for (const cell of line.cells) {
      if (previousEnd != null && cell.x - previousEnd > COLUMN_GAP) {
        flush();
      }
      segment += (segment ? ' ' : '') + cell.str;
      previousEnd = cell.x + cell.width;
    }
    flush();
  }
  return out.join('\n');
}

function hasPdfMagic(bytes: Uint8Array): boolean {
  if (bytes.byteLength < PDF_MAGIC.length) {
    return false;
  }
  return PDF_MAGIC.every((byte, index) => bytes[index] === byte);
}

export async function extractPdfText(bytes: Uint8Array): Promise<PdfTextResult> {
  if (bytes.byteLength === 0) {
    return { ok: false, error: 'Fichier PDF vide.' };
  }
  if (bytes.byteLength > MAX_BROCHURE_BYTES) {
    return { ok: false, error: 'Le PDF est trop volumineux.' };
  }
  if (!hasPdfMagic(bytes)) {
    return { ok: false, error: 'Ce fichier n’est pas un PDF.' };
  }

  // Legacy build + no worker: runs inside a Node serverless function. eval and
  // system fonts are disabled — we only need character codes, not rendering.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: bytes,
      isEvalSupported: false,
      useSystemFonts: false,
    }).promise;
  } catch {
    return { ok: false, error: 'Le PDF n’a pas pu être lu.' };
  }

  if (doc.numPages > MAX_BROCHURE_PAGES) {
    await doc.destroy();
    return { ok: false, error: 'Le PDF comporte trop de pages.' };
  }

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const raw of content.items) {
        // TextItem carries str/transform/width; TextMarkedContent does not.
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
    return { ok: true, pages };
  } catch {
    return { ok: false, error: 'Le PDF n’a pas pu être lu.' };
  } finally {
    await doc.destroy();
  }
}

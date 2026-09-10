import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseAgencyBrochure } from '@/features/subject-property-import/services/parse-agency-brochure';
import {
  reconstructPageText,
  type PdfTextItem,
} from '@/features/subject-property-import/services/reconstruct-page-text';

describe('reconstructPageText', () => {
  it('splits two columns on the horizontal gap so each cell is its own line', () => {
    // Left cell at x=50, right cell at x=300, same line (y=700).
    const text = reconstructPageText([
      { str: 'Étage : 2ème', x: 50, y: 700, width: 40 },
      { str: 'État : Bon', x: 300, y: 700, width: 40 },
      { str: 'Charges : 97', x: 50, y: 680, width: 40 },
    ]);
    expect(text.split('\n')).toEqual(['Étage : 2ème', 'État : Bon', 'Charges : 97']);
  });

  it('orders lines top-to-bottom by Y', () => {
    const text = reconstructPageText([
      { str: 'bottom', x: 0, y: 100, width: 10 },
      { str: 'top', x: 0, y: 500, width: 10 },
    ]);
    expect(text).toBe('top\nbottom');
  });
});

// NON-REGRESSION (Mission 43). Moving the text source from the server to the browser
// must not change a single character. Here we re-extract the real brochure PDF with
// pdfjs + the SHARED reconstructPageText, and assert the result is byte-for-byte the
// committed .txt fixture — and that the (untouched) parser yields the same fields.
describe('reconstructPageText reproduces the committed fixture', () => {
  it('rebuilds brochure-le-cannet.txt exactly from the PDF, and the parser output is unchanged', async () => {
    const pdfUrl = new URL('./__fixtures__/brochure-le-cannet.pdf', import.meta.url);
    const txtUrl = new URL('./__fixtures__/brochure-le-cannet.txt', import.meta.url);
    const data = new Uint8Array(readFileSync(fileURLToPath(pdfUrl)));
    const committed = readFileSync(fileURLToPath(txtUrl), 'utf8');

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: false })
      .promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const raw of content.items) {
        if (!('str' in raw) || !('transform' in raw)) continue;
        const item = raw as { str: string; transform: number[]; width?: number };
        items.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width ?? 0,
        });
      }
      pages.push(reconstructPageText(items));
    }
    await doc.destroy();

    // The fixture joins pages with a form-feed marker.
    expect(pages.join('\n\f\n')).toBe(committed);

    // And the untouched parser produces exactly the same fields as before the switch.
    const fields = parseAgencyBrochure(pages);
    expect(fields.surfaceArea).toBe(24);
    expect(fields.city).toBe('Le Cannet');
    expect(fields.energyRating).toBe('C');
    expect(fields.totalLots).toBe(245);
    expect(fields.readPrice).toBe(139900);
  });
});

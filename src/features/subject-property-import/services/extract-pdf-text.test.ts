import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  extractPdfText,
  reconstructPageText,
} from '@/features/subject-property-import/services/extract-pdf-text';
import { mapBrochureToProperty } from '@/features/subject-property-import/services/map-brochure-to-property';
import { parseAgencyBrochure } from '@/features/subject-property-import/services/parse-agency-brochure';

function realBrochure(): Uint8Array {
  const url = new URL('./__fixtures__/brochure-le-cannet.pdf', import.meta.url);
  return new Uint8Array(readFileSync(fileURLToPath(url)));
}

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

describe('extractPdfText — real brochure PDF, end to end', () => {
  it('rejects a non-PDF before parsing', async () => {
    const result = await extractPdfText(new TextEncoder().encode('not a pdf'));
    expect(result.ok).toBe(false);
  });

  it('extracts the text layer and the full chain parses the real fiche', async () => {
    const result = await extractPdfText(realBrochure());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.pages).toHaveLength(10);
    const fields = parseAgencyBrochure(result.pages);
    // The exact values verified by hand on this fiche.
    expect(fields.surfaceArea).toBe(24);
    expect(fields.city).toBe('Le Cannet');
    expect(fields.energyRating).toBe('C');
    expect(fields.totalLots).toBe(245);

    const imported = mapBrochureToProperty(fields);
    expect(imported.property.surface_area).toBe(24);
    expect(imported.condominium.is_condominium).toBe(true);
    expect(imported.diagnostics.energy_consumption).toBe(159);
    // Guardrail: the read price is information only, never in the property prefill.
    expect(imported.info.readPrice).toBe(139900);
    expect('price' in imported.property).toBe(false);
  });
});

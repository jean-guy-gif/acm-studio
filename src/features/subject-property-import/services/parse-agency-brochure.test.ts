import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  parseAgencyBrochure,
  readBrochureLayout,
} from '@/features/subject-property-import/services/parse-agency-brochure';

// The fixtures are the TEXT LAYER of three real agency brochures, extracted by
// extract-pdf-text and committed as .txt (pages joined by a form-feed marker). The
// parser is exercised against real data, never a hand-written mock.
function loadPages(name: string): string[] {
  const url = new URL(`./__fixtures__/${name}.txt`, import.meta.url);
  return readFileSync(fileURLToPath(url), 'utf8')
    .split('\f')
    .map((page) => page.replace(/^\n|\n$/g, ''));
}

describe('readBrochureLayout (generic reader)', () => {
  it('extracts "Libellé : valeur" pairs regardless of the field meaning', () => {
    const layout = readBrochureLayout(loadPages('brochure-le-cannet'));
    const byLabel = (label: string) =>
      layout.pairs.find((p) => p.label.toLowerCase() === label.toLowerCase())?.value;
    expect(byLabel('État')).toBe('Excellent état');
    expect(byLabel('Taxe foncière')).toBe('629 €/an');
    expect(byLabel('Exposition')).toBe('Est');
  });
});

describe('parseAgencyBrochure — Le Cannet (studio, has copro lots)', () => {
  const f = parseAgencyBrochure(loadPages('brochure-le-cannet'));

  it('maps the seller-property fields from known labels', () => {
    expect(f.surfaceArea).toBe(24);
    expect(f.generalCondition).toBe('excellent');
    expect(f.exposure).toBe('east');
    expect(f.constructionYear).toBe(1970);
    expect(f.postalCode).toBe('06110');
    expect(f.city).toBe('Le Cannet');
    expect(f.outdoorSpaces).toEqual(['terrace']);
    expect(f.bedroomsCount).toBeNull(); // a studio: no "Chambre" line
  });

  it('reads DPE/GES value AND letter from the footer', () => {
    expect(f.energyConsumption).toBe(159);
    expect(f.energyRating).toBe('C');
    expect(f.gesEmissions).toBe(35);
    expect(f.gesRating).toBe('D');
  });

  it('reads the condominium fields from the footer legal mention', () => {
    expect(f.totalLots).toBe(245);
    expect(f.isCondominium).toBe(true);
    expect(f.annualCharges).toBe(1164);
  });

  it('keeps the price and tax as information only, and cross-checks the charges', () => {
    expect(f.readPrice).toBe(139900);
    expect(f.agencyReference).toBe('86020239');
    expect(f.taxeFonciere).toBe(629);
    expect(f.monthlyCharges).toBe(97);
    // 97 × 12 = 1164 → the two figures agree.
    expect(f.chargesConsistent).toBe(true);
  });
});

describe('parseAgencyBrochure — Cannes (3 bedrooms, garage, no copro lots)', () => {
  const f = parseAgencyBrochure(loadPages('brochure-cannes'));

  it('counts bedrooms from the Surfaces section and detects garage + outdoor', () => {
    expect(f.surfaceArea).toBe(78.31);
    expect(f.bedroomsCount).toBe(3);
    expect(f.outdoorSpaces).toEqual(expect.arrayContaining(['balcony', 'terrace']));
    expect(f.parkingTypes).toEqual(['garage']);
    expect(f.generalCondition).toBe('good');
    expect(f.exposure).toBe('south_east');
  });

  it('reads DPE/GES and the annual quote-part; no lots → is_condominium stays null', () => {
    expect(f.energyConsumption).toBe(107);
    expect(f.energyRating).toBe('B');
    expect(f.gesRating).toBe('C');
    expect(f.annualCharges).toBe(3492);
    expect(f.totalLots).toBeNull();
    expect(f.isCondominium).toBeNull();
    // 291 × 12 = 3492.
    expect(f.chargesConsistent).toBe(true);
  });
});

describe('parseAgencyBrochure — Villeneuve-Loubet (decimal charges, garden)', () => {
  const f = parseAgencyBrochure(loadPages('brochure-villeneuve-loubet'));

  it('parses French decimal charges and cross-checks against the monthly figure', () => {
    expect(f.monthlyCharges).toBe(255.56);
    expect(f.annualCharges).toBe(3066.72);
    // 255.56 × 12 = 3066.72.
    expect(f.chargesConsistent).toBe(true);
    expect(f.surfaceArea).toBe(60);
    expect(f.exposure).toBe('south');
    expect(f.bedroomsCount).toBe(2);
    expect(f.outdoorSpaces).toEqual(expect.arrayContaining(['garden']));
  });
});

describe('the generic reader never invents unknown labels', () => {
  it('ignores an unrecognised label without error', () => {
    const fields = parseAgencyBrochure(['Libellé inconnu : quelque chose', 'Autre : 42']);
    expect(fields.surfaceArea).toBeNull();
    expect(fields.city).toBeNull();
    expect(fields.readPrice).toBeNull();
  });
});

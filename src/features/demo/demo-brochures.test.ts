import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEMO_COMMUNES } from '@/features/demo/data/communes';
import { DEMO_SCENARIOS } from '@/features/demo/data/scenarios';
import { MIN_BROCHURE_IMAGE_DIMENSION } from '@/features/subject-property-import/constants';
import { mapBrochureToProperty } from '@/features/subject-property-import/services/map-brochure-to-property';
import { parseAgencyBrochure } from '@/features/subject-property-import/services/parse-agency-brochure';
import {
  reconstructPageText,
  type PdfTextItem,
} from '@/features/subject-property-import/services/reconstruct-page-text';

// Mission 114 (A2.4) — « l'import d'une fiche PDF : la fiche de démo, lue comme une vraie ». Chaque
// fiche de `public/demo` est relue ici comme le navigateur le fait (M43) : le même pdfjs, la même
// reconstruction du texte, le même lecteur de fiche ; puis ses photos, comme « Déposer les photos
// de la fiche » les retrouve. Les fiches se refont par `npm run demo:fiches`.

type Pdfjs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

async function openBrochure(pdfjs: Pdfjs, scenarioId: string) {
  const data = new Uint8Array(
    readFileSync(join(process.cwd(), 'public', 'demo', `fiche-${scenarioId}.pdf`)),
  );
  return pdfjs.getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise;
}

async function readPages(pdfjs: Pdfjs, scenarioId: string): Promise<string[]> {
  const doc = await openBrochure(pdfjs, scenarioId);
  try {
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
    return pages;
  } finally {
    await doc.destroy();
  }
}

async function countLargeImages(pdfjs: Pdfjs, scenarioId: string): Promise<number> {
  const doc = await openBrochure(pdfjs, scenarioId);
  try {
    let count = 0;
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const operatorList = await page.getOperatorList();
      const names = new Set<string>();
      for (let i = 0; i < operatorList.fnArray.length; i += 1) {
        if (operatorList.fnArray[i] === pdfjs.OPS.paintImageXObject) {
          const arg = operatorList.argsArray[i][0];
          if (typeof arg === 'string') names.add(arg);
        }
      }
      for (const name of names) {
        const image = await new Promise<{ width?: number; height?: number } | null>((resolve) =>
          page.objs.get(name, resolve),
        );
        if (
          image?.width &&
          image.height &&
          Math.max(image.width, image.height) >= MIN_BROCHURE_IMAGE_DIMENSION
        ) {
          count += 1;
        }
      }
      page.cleanup();
    }
    return count;
  } finally {
    await doc.destroy();
  }
}

const TYPE_LABEL = { apartment: 'Appartement', house: 'Maison' } as const;

describe('les fiches PDF de démonstration, lues comme de vraies fiches', () => {
  for (const scenario of DEMO_SCENARIOS) {
    const { subject } = scenario;
    const commune = DEMO_COMMUNES.find((entry) => entry.code === subject.inseeCode)!;

    it(`${scenario.label} : la fiche remplit le bien vendeur, le prix reste une information`, async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const pages = await readPages(pdfjs, scenario.id);
      expect(pages.join('\n')).toContain('DÉMONSTRATION');
      const fields = parseAgencyBrochure(pages);
      expect(fields.propertyType).toBe(TYPE_LABEL[subject.propertyType]);
      expect(fields.surfaceArea).toBe(subject.surfaceArea);
      expect(fields.roomsCount).toBe(subject.roomsCount);
      expect(fields.bedroomsCount).toBe(subject.bedroomsCount);
      expect(fields.bathroomsCount).toBe(subject.bathroomsCount);
      expect(fields.floor).toBe(subject.floor);
      expect(fields.postalCode).toBe(commune.codesPostaux[0]);
      expect(fields.city).toBe(commune.nom);
      expect(fields.constructionYear).toBe(subject.constructionYear);
      expect(fields.energyRating).toBe(subject.energyRating);
      expect(fields.gesRating).toBe(subject.gesRating);
      expect(fields.generalCondition).toBe(subject.generalCondition);
      expect(fields.exposure).toBe(subject.exposure);
      expect(fields.outdoorSpaces).toEqual(expect.arrayContaining(subject.outdoorSpaces));
      // Le lecteur de fiche ne lit qu'un garage ou un box (M44 : un libellé inconnu est ignoré,
      // jamais deviné) : une place extérieure reste à saisir par le conseiller.
      expect(fields.parkingTypes).toEqual(
        subject.parkingTypes.filter((kind) => kind === 'garage' || kind === 'closed_box'),
      );
      expect(fields.strengths).toEqual(expect.arrayContaining(subject.strengths));
      expect(fields.propertyTax).toBe(subject.propertyTax);
      expect(fields.monthlyCharges).toBe(subject.monthlyCharges);
      expect(fields.readPrice).toBe(subject.listedPrice);
      expect(fields.isCondominium).toBe(subject.propertyType === 'apartment' ? true : null);
      expect(fields.description).toContain('fictif');

      // Le prix lu ne remplit aucun champ (M38, M44) : il voyage « pour information ».
      const mapped = mapBrochureToProperty(fields);
      expect(JSON.stringify(mapped.property)).not.toContain(String(subject.listedPrice));
      expect(mapped.info.readPrice).toBe(subject.listedPrice);
      expect(mapped.property.city).toBe(commune.nom);
    });

    it(`${scenario.label} : ses photos se déposent (au moins ${subject.photos.length}, ≥ ${MIN_BROCHURE_IMAGE_DIMENSION} px)`, async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      expect(await countLargeImages(pdfjs, scenario.id)).toBeGreaterThanOrEqual(
        subject.photos.length,
      );
    });
  }
});

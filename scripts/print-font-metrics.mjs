// Correctifs 163 — la largeur de chaque caractère dans les polices embarquées, pour que l'Étude
// imprimée sache combien de lignes prend un texte (`study-print.ts`) : compter les caractères ne
// tient ni d'une langue à l'autre, ni d'une police à l'autre. Lancé À LA MAIN, quand une police est
// ajoutée ou change : `node scripts/print-font-metrics.mjs`. Jamais pendant un build.
//
// Il charge les polices du dépôt dans Chromium (celui de Playwright) et mesure l'avance de chaque
// caractère, en millièmes de cadratin, aux graisses que l'Étude emploie. Le crénage n'est pas
// compté : le texte réel est un peu plus étroit, jamais plus large.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';

const FONTS = resolve(import.meta.dirname, '..', 'src', 'features', 'branding', 'fonts');
const OUT = resolve(
  import.meta.dirname,
  '..',
  'src',
  'features',
  'market-study',
  'services',
  'print-font-metrics.generated.json',
);

// slug (= dossier, = clé de la charte), famille telle que la feuille de la police la nomme.
const FAMILIES = {
  montserrat: 'Montserrat',
  inter: 'Inter',
  poppins: 'Poppins',
  'source-sans': 'Source Sans 3',
  'work-sans': 'Work Sans',
  'nunito-sans': 'Nunito Sans',
  rajdhani: 'Rajdhani',
};
const WEIGHTS = [400, 600, 700];

// Les caractères des textes de l'Étude, en français et en anglais : l'ASCII imprimable, les
// lettres accentuées, la ponctuation typographique, les espaces insécables.
const CHARS = [
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
  ...'àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒÆ',
  ...'’‘“”«»–—…€²³·×°•→↗✓½',
  ' ',
  ' ',
  '‑',
].join('');

const dir = mkdtempSync(join(tmpdir(), 'print-font-metrics-'));
const html = join(dir, 'index.html');
writeFileSync(
  html,
  `<!doctype html><meta charset="utf-8">${Object.keys(FAMILIES)
    .map((slug) => `<link rel="stylesheet" href="file://${FONTS}/${slug}/${slug}.css">`)
    .join('')}<body></body>`,
);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${html}`);
const widths = await page.evaluate(
  async ({ families, weights, chars }) => {
    const out = {};
    const context = document.createElement('canvas').getContext('2d');
    for (const [slug, family] of Object.entries(families)) {
      out[slug] = {};
      for (const weight of weights) {
        await document.fonts.load(`${weight} 40px "${family}"`, chars);
        context.font = `${weight} 1000px "${family}"`;
        out[slug][weight] = [...chars].map((char) => Math.round(context.measureText(char).width));
      }
    }
    await document.fonts.ready;
    return out;
  },
  { families: FAMILIES, weights: WEIGHTS, chars: CHARS },
);
await browser.close();

writeFileSync(OUT, `${JSON.stringify({ chars: CHARS, widths })}\n`);
console.log(
  `${OUT} : ${[...CHARS].length} caractères × ${Object.keys(FAMILIES).length} polices × ${WEIGHTS.length} graisses`,
);
for (const [slug, table] of Object.entries(widths))
  console.log(
    slug.padEnd(12),
    WEIGHTS.map(
      (weight) =>
        `${weight}: a=${table[weight][CHARS.indexOf('a')]} m=${table[weight][CHARS.indexOf('m')]} espace=${table[weight][0]}`,
    ).join('  '),
  );

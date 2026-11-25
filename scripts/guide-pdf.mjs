// Lancement, mission 13 — le PDF du guide de prise en main, tiré de son HTML
// (`docs/guide/guide-de-prise-en-main.html`, la source : on corrige le HTML, puis on relance).
// Format A4 en millimètres, fonds imprimés, aucune marge : chaque page du HTML est une feuille.
//
//   npm run guide:pdf                         le PDF, à côté du HTML
//   npm run guide:pdf -- --pages <dossier>    en plus, une image par page, pour relire avant d'envoyer
//
// Le script s'arrête, sans rien écrire, si une police ne s'est pas chargée ou si le texte d'une page
// dépasse de sa feuille : un guide coupé ou dans une police de repli ne part jamais.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(ROOT, 'docs', 'guide', 'guide-de-prise-en-main.html');
const PDF = join(ROOT, 'docs', 'guide', 'guide-de-prise-en-main.pdf');

const at = process.argv.indexOf('--pages');
const shots = at > 0 ? process.argv[at + 1] : null;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1400 },
    deviceScaleFactor: 2,
  });
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });

  const problems = await page.evaluate(async () => {
    await document.fonts.ready;
    const found = [...document.fonts]
      .filter((face) => face.status !== 'loaded')
      .map((face) => `police non chargée : ${face.family}`);
    document.querySelectorAll('.page').forEach((sheet, index) => {
      const foot = sheet.querySelector('.foot');
      const limit = foot ? foot.getBoundingClientRect().top : sheet.getBoundingClientRect().bottom;
      const last = [...sheet.children].filter((child) => child !== foot).at(-1);
      const over = last ? Math.round(last.getBoundingClientRect().bottom - limit) : 0;
      if (over > 0) found.push(`page ${index + 1} : le texte dépasse de ${over} px`);
    });
    return found;
  });
  if (problems.length > 0) {
    console.error(`✖ Guide non imprimé :\n  ${problems.join('\n  ')}`);
    process.exitCode = 1;
  } else {
    const sheets = page.locator('.page');
    const count = await sheets.count();
    if (shots) {
      mkdirSync(shots, { recursive: true });
      for (let index = 0; index < count; index += 1) {
        await sheets.nth(index).screenshot({ path: join(shots, `guide-page-${index + 1}.png`) });
      }
    }
    await page.pdf({
      path: PDF,
      width: '210mm',
      height: '297mm',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    console.log(`✔ ${count} page(s) : ${PDF}`);
  }
} finally {
  await browser.close();
}

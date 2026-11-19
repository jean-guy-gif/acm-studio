// Mission 162 — une image PNG de chaque page des PDF d'un dossier (`etude.pdf`, `synthese.pdf`),
// en couleur et en niveaux de gris, rendue par pdf.js dans Chromium (aucun outil du poste) :
//   node missions/maquettes/M162-generateur/rendre-pages.mjs missions/maquettes/M162-avant
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const dir = path.resolve(process.argv[2] ?? 'missions/maquettes/M162-avant');
const pdfjs = path.resolve('node_modules/pdfjs-dist/build');
const SCALE = 1.5; // 595 pt de large → environ 893 px

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('http://pages.local/**', (route) => {
  const name = new URL(route.request().url()).pathname.slice(1);
  if (name === 'index.html') {
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
  }
  if (name.endsWith('.pdf')) {
    return route.fulfill({ contentType: 'application/pdf', body: readFileSync(path.join(dir, name)) });
  }
  return route.fulfill({
    contentType: 'text/javascript',
    body: readFileSync(path.join(pdfjs, name)),
  });
});
await page.goto('http://pages.local/index.html');

for (const doc of ['etude', 'synthese']) {
  const pages = await page.evaluate(
    async ({ doc, scale }) => {
      const pdfjsLib = await import('http://pages.local/pdf.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'http://pages.local/pdf.worker.mjs';
      const pdf = await pdfjsLib.getDocument(`http://pages.local/${doc}.pdf`).promise;
      const out = [];
      for (let n = 1; n <= pdf.numPages; n += 1) {
        const p = await pdf.getPage(n);
        const viewport = p.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await p.render({ canvasContext: ctx, viewport }).promise;
        const color = canvas.toDataURL('image/png');
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < img.data.length; i += 4) {
          const g = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
          img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
        }
        ctx.putImageData(img, 0, 0);
        out.push({ color, gray: canvas.toDataURL('image/png') });
      }
      return out;
    },
    { doc, scale: SCALE },
  );
  pages.forEach(({ color, gray }, i) => {
    const n = String(i + 1).padStart(2, '0');
    writeFileSync(path.join(dir, `${doc}-p${n}.png`), Buffer.from(color.split(',')[1], 'base64'));
    writeFileSync(path.join(dir, `${doc}-p${n}-gris.png`), Buffer.from(gray.split(',')[1], 'base64'));
  });
  console.log(`${doc} : ${pages.length} pages`);
}
await browser.close();

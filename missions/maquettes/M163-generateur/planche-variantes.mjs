// Mission 163 (maquette) — la planche des variantes de l'Étude imprimée, une rangée par version :
//   node missions/maquettes/M163-generateur/planche-variantes.mjs <dossier des variantes> <sortie.png>
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const [dir, out] = process.argv.slice(2);
const ROWS = [
  {
    name: 'aujourdhui',
    title: 'Aujourd’hui — 10 pages',
    note: 'Une page par concurrent (p. 4 à 8), la moitié basse vide. Page 3 : environ un cinquième vide.',
  },
  {
    name: 'A',
    title: 'Variante A — 10 pages : une page par concurrent, remplie',
    note: 'La fiche prend toute la hauteur : les photos grandissent (environ 12 cm de haut au lieu de 5), la grille respire. Rien d’autre ne bouge ; la page 3 reste comme aujourd’hui.',
  },
  {
    name: 'B',
    title: 'Variante B — 8 pages : deux concurrents par page, comme la synthèse',
    note: 'Une seule photo, à gauche, sur la hauteur de la fiche ; la grille resserrée. Les ventes réelles montent en page 6 ; la page 7 n’a que la fin du tableau, « Où en est votre prix » commençant toujours une page neuve (M129). La page 3 reste comme aujourd’hui : la première fiche n’y tient pas.',
  },
];
const page = (row, f) =>
  `<figure><img src="data:image/png;base64,${readFileSync(path.join(dir, row, f)).toString('base64')}"><figcaption>p. ${Number(f.match(/p(\d+)/)[1])}</figcaption></figure>`;
const html = ROWS.map((row) => {
  const files = readdirSync(path.join(dir, row.name))
    .filter((f) => /^etude-p\d+\.png$/.test(f))
    .sort();
  return `<section><h2>${row.title}</h2><p>${row.note}</p><main>${files.map((f) => page(row.name, f)).join('')}</main></section>`;
}).join('');
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 2400, height: 900 } });
await tab.setContent(
  `<style>body{margin:16px;font:20px/1.3 Helvetica,Arial,sans-serif;background:#e4e4e7;color:#18181b}
  h1{font-size:30px;margin:0 0 4px}h2{font-size:24px;margin:22px 0 2px}p{margin:0 0 8px;color:#3f3f46}
  main{display:grid;grid-template-columns:repeat(10,1fr);gap:8px}img{width:100%;border:1px solid #a1a1aa;background:#fff}
  figure{margin:0}figcaption{text-align:center;font-size:15px;color:#52525b}</style>
  <h1>Étude de marché imprimée — les concurrents, deux variantes (maquette M163, à choisir)</h1>
  <p>Le même dossier de démonstration (Mme Garcia, Vence, 5 concurrents, tous les blocs du quartier, 24 ventes), imprimé en A4 par Chrome.</p>${html}`,
);
await tab.screenshot({ path: out, fullPage: true });
await browser.close();

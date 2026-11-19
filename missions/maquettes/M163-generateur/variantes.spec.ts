import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { demoCredentials, login } from '../../../tests/e2e/support';

// Mission 163 (maquette, rien n'est codé dans l'application) — l'Étude de marché imprimée d'un
// dossier déjà mené (`M163_ID`, fait par le générateur de la M162 avec `M162_KEEP=1`), telle
// qu'aujourd'hui et en deux variantes simulées par du CSS injecté dans la page avant l'impression :
// A, une page par concurrent, remplie ; B, deux concurrents par page, à la manière de la synthèse.
const OUT = process.env.M163_OUT ?? path.resolve('missions/maquettes/M163-variantes');
const ID = process.env.M163_ID!;

const CARD = 'article[data-testid="market-study-competitor"]';
// La page imprimable fait 269 mm de haut (marges de 12 et 16 mm, `@page` de l'Étude).
const VARIANT_A = `
  ${CARD} { break-before: page; height: 262mm; }
  [data-testid="market-study-competitors"] > div:first-child ${CARD} { break-before: auto; height: 236mm; }
  ${CARD} > div:nth-child(2) { flex: 1 1 auto; min-height: 0; grid-template-rows: 1fr; }
  ${CARD} > div:nth-child(2) > *, ${CARD} > div:nth-child(2) > div > * { height: 100% !important; min-height: 0 !important; }
  ${CARD} td { padding-top: 5px !important; padding-bottom: 5px !important; }
  ${CARD} { gap: 14px; }
`;
const VARIANT_B = `
  ${CARD} {
    display: grid !important; grid-template-columns: 52mm 1fr; grid-template-rows: auto auto 1fr;
    column-gap: 14px; row-gap: 6px; padding: 0 12px 0 0 !important;
  }
  ${CARD} > div:nth-child(1) { grid-column: 2; grid-row: 1; padding-top: 10px; }
  ${CARD} > div:nth-child(2) { grid-column: 1; grid-row: 1 / span 3; display: block !important; position: relative; }
  ${CARD} > div:nth-child(2) > :not(:first-child) { display: none !important; }
  ${CARD} > div:nth-child(2) > :first-child { position: absolute; inset: 0; height: 100% !important; min-height: 0 !important; }
  ${CARD} > div:nth-child(3) { grid-column: 2; grid-row: 2; }
  ${CARD} > :nth-child(4) { grid-column: 2; grid-row: 3; padding-bottom: 10px; }
  ${CARD} td { padding-top: 1px !important; padding-bottom: 1px !important; }
  ${CARD} [data-testid="market-study-prices"] > div:last-child > div { padding: 6px 10px !important; }
`;

async function print(page: Page, name: string, css: string | null) {
  await page.goto(`/builder/${ID}/etude-de-marche`);
  await expect(page.getByTestId('market-study')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1_500);
  await page.emulateMedia({ media: 'print' });
  if (css) await page.addStyleTag({ content: `@media print { ${css} }` });
  await page.evaluate(async () => {
    for (const img of document.images) img.loading = 'eager';
    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? null
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            }),
      ),
    );
    await document.fonts.ready;
  });
  const dir = path.join(OUT, name);
  mkdirSync(dir, { recursive: true });
  await page.pdf({
    path: path.join(dir, 'etude.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.emulateMedia({ media: 'screen' });
}

test('l’Étude imprimée : aujourd’hui, variante A, variante B', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, demoCredentials());
  await print(page, 'aujourdhui', null);
  await print(page, 'A', VARIANT_A);
  await print(page, 'B', VARIANT_B);
});

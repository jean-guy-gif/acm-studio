import { expect, test } from '@playwright/test';

import {
  demoCredentials,
  expectStudyPrintedWell,
  login,
  printedStudyFrames,
  resetDemoByScreen,
} from './support';

// Correctifs 163 — l'Étude de marché imprimée, sur les vrais PDF A4 de la démo remise à zéro (retours
// de Jean-Guy du 23/11 sur M. Lefebvre et Mme Garcia). Pour chaque dossier de démo qui a une Étude,
// les règles de `expectStudyPrintedWell` : des pages pleines, le classement entier, l'avis avec le
// dernier bloc de son chapitre, un numéro « N / T » écrit dans chaque page, des renvois du résumé qui
// tombent juste ; puis les mêmes pages avec chaque police de charte. Le quartier coché (Academia) est
// joué par `quartier-au-vendeur`, avec les mêmes règles ; ici, les dossiers tels que la démo les
// prépare.

// Les polices de charte au choix d'une agence (M57, M95) : la pagination ne dépend pas d'elles.
const FONTS = ['montserrat', 'inter', 'poppins', 'source-sans', 'work-sans', 'nunito-sans'];

test('l’Étude imprimée : pages pleines, numérotées, renvois justes', async ({ page }) => {
  test.setTimeout(9 * 60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  const ids = await page
    .locator('[data-testid="demo-dossier"]:not([data-stage="to_prepare"]) a')
    .evaluateAll((links) => [
      ...new Set(
        links
          .map((link) => /\/builder\/([^/?#]+)/.exec(link.getAttribute('href') ?? '')?.[1])
          .filter((id): id is string => Boolean(id)),
      ),
    ]);
  expect(ids.length).toBeGreaterThanOrEqual(10);

  for (const id of ids) {
    await test.step(`l’Étude ${id}`, async () => {
      await page.goto(`/builder/${id}/etude-de-marche`);
      await expect(page.getByTestId('market-study')).toBeVisible({ timeout: 60_000 });
      await expectStudyPrintedWell(page);

      // Les pages sont décidées pour toutes les polices de charte : aucune ne fait déborder une
      // page (sinon le numéro et les renvois seraient faux).
      for (const font of FONTS) {
        const style = await page.addStyleTag({
          content: `[data-synthesis]{--font-sans:var(--font-${font})!important;--font-title:var(--font-${font})!important}`,
        });
        await page.evaluate(() => document.fonts.ready);
        // La police est bien celle demandée, pas une police de repli.
        const family = await page
          .locator('[data-print-body] h2')
          .first()
          .evaluate((node) => getComputedStyle(node).fontFamily);
        expect(family.toLowerCase().replace(/[^a-z]/g, '')).toContain(font.replace(/-/g, ''));
        const withFont = await printedStudyFrames(page);
        for (const frame of withFont.slice(1)) {
          expect(
            frame.used,
            `${font}, page ${frame.number} : ${frame.units.join(', ')}`,
          ).toBeLessThanOrEqual(frame.room + 1);
        }
        await style.evaluate((node) => (node as HTMLElement).remove());
      }
    });
  }
});

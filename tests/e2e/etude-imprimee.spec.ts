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
// les règles de `expectStudyPrintedWell` : des pages pleines, le classement et « La suite » entiers,
// l'avis avec son chapitre ou en tête de la page suivante (jamais seul), un numéro « N / T » écrit
// dans chaque page, des renvois du résumé qui tombent juste ; puis les mêmes pages avec chaque police
// de charte. Le quartier coché (Academia) est
// joué par `quartier-au-vendeur`, avec les mêmes règles ; ici, les dossiers tels que la démo les
// prépare.

// Les polices de charte au choix d'une agence (M57, M95) : la pagination ne dépend pas d'elles.
const FONTS = ['montserrat', 'inter', 'poppins', 'source-sans', 'work-sans', 'nunito-sans'];

// Le nombre de pages de ces dossiers de démo (Jean-Guy, 23/11) : faire descendre la dernière fiche
// avec son avis leur ajoutait une page aux deux tiers blanche ; l'avis ouvre la page du chapitre
// suivant, et ils gardent ce nombre.
const PAGES: [RegExp, number][] = [
  [/Bernard/, 4],
  [/Garnier/, 5],
  [/Lambert-Duval/, 5],
  [/Lopez/, 5],
  [/Castel/, 6],
];

test('l’Étude imprimée : pages pleines, numérotées, renvois justes', async ({ page }) => {
  test.setTimeout(9 * 60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  const dossiers = await page
    .locator('[data-testid="demo-dossier"]:not([data-stage="to_prepare"])')
    .evaluateAll((rows) =>
      rows.map((row) => ({
        id:
          /\/builder\/([^/?#]+)/.exec(row.querySelector('a')?.getAttribute('href') ?? '')?.[1] ??
          '',
        name: (row.textContent ?? '').replace(/\s+/g, ' ').trim(),
      })),
    );
  // Le dossier à relancer (M. et Mme Lambert-Duval) s'ouvre depuis le Suivi : « Ma démo » y mène.
  await page.goto('/suivi');
  const followUp = /\/builder\/([^/?#]+)/.exec(
    (await page
      .getByTestId('suivi-row')
      .filter({ hasText: 'Lambert-Duval' })
      .getByTestId('suivi-open-project')
      .first()
      .getAttribute('href', { timeout: 60_000 })) ?? '',
  )?.[1];
  expect(followUp, 'Le dossier de M. et Mme Lambert-Duval est introuvable au Suivi').toBeTruthy();
  dossiers.push({ id: followUp as string, name: 'M. et Mme Lambert-Duval' });
  const ids = [...new Set(dossiers.map((dossier) => dossier.id).filter(Boolean))];
  expect(ids.length).toBeGreaterThanOrEqual(11);
  const counted: string[] = [];

  for (const id of ids) {
    const name = dossiers.findLast((dossier) => dossier.id === id)?.name ?? '';
    await test.step(`l’Étude ${id}`, async () => {
      await page.goto(`/builder/${id}/etude-de-marche`);
      await expect(page.getByTestId('market-study')).toBeVisible({ timeout: 60_000 });
      const printed = await expectStudyPrintedWell(page);
      const expected = PAGES.find(([seller]) => seller.test(name));
      if (expected) {
        expect(printed.length, `${name} : le nombre de pages de l’Étude`).toBe(expected[1]);
        counted.push(String(expected[0]));
      }

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
  // Les cinq dossiers ont bien été trouvés et comptés.
  expect(counted.sort()).toEqual(PAGES.map(([seller]) => String(seller)).sort());
});

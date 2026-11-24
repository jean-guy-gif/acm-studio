import { expect, test } from './test';

import { demoCredentials, expectStudyPrintedWell, login, resetDemoByScreen } from './support';

// Correctifs 163 — l'Étude de marché imprimée, sur les vrais PDF A4 de la démo remise à zéro (retours
// de Jean-Guy du 23/11 sur M. Lefebvre et Mme Garcia). Pour chaque Étude de la démo, les règles de
// `expectStudyPrintedWell` : des pages pleines, le classement et « La suite » entiers, l'avis avec son
// chapitre ou en tête de la page suivante (jamais seul), un numéro « N / T » écrit dans chaque page,
// des renvois du résumé qui tombent juste. Le quartier coché (Academia) est joué par
// `quartier-au-vendeur`, avec les mêmes règles ; ici, les Études telles que la démo les prépare.
// Les autres Études (chaque jeu de blocs du quartier, l'anglais, les polices de charte) sont mesurées
// par le banc `npm run banc:etude`, hors de l'essai.

// Le nombre de pages de ces Études de la démo (Jean-Guy, 23/11) : faire descendre la dernière fiche
// avec son avis leur ajoutait une page aux deux tiers blanche ; l'avis ouvre la page du chapitre
// suivant, et elles gardent ce nombre.
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
  const studies = await page
    .locator('[data-testid="demo-dossier"]:not([data-stage="to_prepare"])')
    .evaluateAll((rows) =>
      rows.map((row) => ({
        id:
          /\/builder\/([^/?#]+)/.exec(row.querySelector('a')?.getAttribute('href') ?? '')?.[1] ??
          '',
        seller: (row.textContent ?? '').replace(/\s+/g, ' ').trim(),
      })),
    );
  // Le vendeur à relancer (M. et Mme Lambert-Duval) s'ouvre depuis le Suivi : « Ma démo » y mène.
  await page.goto('/suivi');
  const followUp = /\/builder\/([^/?#]+)/.exec(
    (await page
      .getByTestId('suivi-row')
      .filter({ hasText: 'Lambert-Duval' })
      .getByTestId('suivi-open-project')
      .first()
      .getAttribute('href', { timeout: 60_000 })) ?? '',
  )?.[1];
  expect(followUp, 'L’Étude de M. et Mme Lambert-Duval est introuvable au Suivi').toBeTruthy();
  studies.push({ id: followUp as string, seller: 'M. et Mme Lambert-Duval' });
  const ids = [...new Set(studies.map((study) => study.id).filter(Boolean))];
  expect(ids.length).toBeGreaterThanOrEqual(11);
  const counted: string[] = [];

  for (const id of ids) {
    const seller = studies.findLast((study) => study.id === id)?.seller ?? '';
    await test.step(`l’Étude ${id}`, async () => {
      await page.goto(`/builder/${id}/etude-de-marche`);
      await expect(page.getByTestId('market-study')).toBeVisible({ timeout: 60_000 });
      const printed = await expectStudyPrintedWell(page);
      const expected = PAGES.find(([name]) => name.test(seller));
      if (expected) {
        expect(printed.length, `${seller} : le nombre de pages de l’Étude`).toBe(expected[1]);
        counted.push(String(expected[0]));
      }
    });
  }
  // Les cinq Études ont bien été trouvées et comptées.
  expect(counted.sort()).toEqual(PAGES.map(([name]) => String(name)).sort());
});

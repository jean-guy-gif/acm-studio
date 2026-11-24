import { expect, test } from './test';

import {
  demoCredentials,
  expectNoHorizontalScroll,
  expectNoVerticalScroll,
  login,
  resetDemoByScreen,
} from './support';

// Lancement, mission 1 (24/11) — le vendeur n'a aucune idée des prix. Sur « Votre valeur perçue »,
// la première question du Live, « Voir d'abord les biens et leurs prix » passe en présentation
// directe : le premier concurrent s'affiche avec son prix, et « Voir l'annonce » est à un toucher.
// Joué sur le Live interactif de Mme Garcia (démo de Vence), aux trois fenêtres de la tablette :
// rien ne défile avec le bouton en plus (M148 B). `E2E_CAPTURES=1` range deux captures dans
// `missions/maquettes/`.

const TABLETS = [
  { width: 1024, height: 700 },
  { width: 1180, height: 750 },
  { width: 820, height: 1110 },
] as const;

test('le vendeur n’a aucune idée des prix : un bouton ouvre les biens avec leurs prix', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  page.on('dialog', (dialog) => void dialog.accept());
  await page.setViewportSize(TABLETS[0]);
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  const href = await page
    .locator('[data-testid="demo-dossier"][data-stage="ready"] a')
    .first()
    .getAttribute('href');
  const projectId = /\/builder\/([^/]+)\//.exec(href ?? '')?.[1];
  expect(projectId, 'Le Live interactif de la démo est introuvable').toBeTruthy();

  try {
    await page.goto(`/live/${projectId}`);
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/lancer-le-live$`));
    await page.getByTestId('launch-for-real').click();
    const start = page.locator('main button.btn-filled').first();
    await expect(start).toBeVisible({ timeout: 90_000 });
    await start.click();
    const main = page.locator('main');
    await expect(main).not.toHaveAttribute('data-live-page', 'intro', { timeout: 30_000 });

    // « Votre bien » : oui, puis la première question.
    if ((await main.getAttribute('data-live-page')) !== 'seller_perceived_price') {
      const yes = main.locator('input[name="seller_property_confirmed"][value="yes"]');
      await yes.first().locator('xpath=ancestor::label[1]').click();
      await page.getByTestId('live-validate').click();
    }
    await expect(main).toHaveAttribute('data-live-page', 'seller_perceived_price', {
      timeout: 30_000,
    });

    const button = page.getByTestId('live-see-prices-first');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Voir d’abord les biens et leurs prix');
    // Le seul bouton plein reste « Valider », et rien ne défile avec le bouton en plus.
    await expect(main.locator('.btn-filled')).toHaveCount(0);
    for (const size of TABLETS) {
      await page.setViewportSize(size);
      await expectNoVerticalScroll(page, `Votre valeur perçue (${size.width} × ${size.height})`);
      await expectNoHorizontalScroll(page, `Votre valeur perçue (${size.width} × ${size.height})`);
    }
    await page.setViewportSize(TABLETS[0]);
    if (process.env.E2E_CAPTURES === '1') {
      await page.screenshot({ path: 'missions/maquettes/L1-live-valeur-percue.png' });
    }

    await button.click();
    // Le premier concurrent, en présentation directe : son prix est là, sans rien deviner.
    await expect(main).toHaveAttribute('data-live-page', 'comparable_direct', { timeout: 30_000 });
    await expect(main).toContainText('€');
    await expect(main.locator('input[data-price-for]')).toHaveCount(0);
    await expect(page.getByTestId('live-listing-open').first()).toBeVisible();
    for (const size of TABLETS) {
      await page.setViewportSize(size);
      await expectNoVerticalScroll(page, `Premier bien (${size.width} × ${size.height})`);
    }
    await page.setViewportSize(TABLETS[0]);
    if (process.env.E2E_CAPTURES === '1') {
      await page.screenshot({ path: 'missions/maquettes/L1-live-premier-bien.png' });
    }

    // Le choix est gardé : rechargé, le Live reste en présentation directe, sans « Votre valeur perçue ».
    await page.reload();
    await expect(page.locator('main')).toHaveAttribute('data-live-page', 'comparable_direct', {
      timeout: 60_000,
    });
  } finally {
    await page.goto('/builder');
    await resetDemoByScreen(page);
  }
});

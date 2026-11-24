import { expect, test } from './test';

import {
  demoCredentials,
  expectNoHorizontalScroll,
  expectNoVerticalScroll,
  login,
  resetDemoByScreen,
} from './support';

// Lancement, mission 1 (24/11) — le vendeur n'a aucune idée des prix. Sur « Votre valeur perçue »,
// la première question du Live, « Voir les biens et leurs prix » (un toucher demande, un second
// confirme) passe en présentation directe : le premier concurrent s'affiche avec son prix, et
// « Voir l'annonce » l'ouvre d'un toucher (dans la démo : la copie d'ACM, M152 A).
// Joué sur le Live interactif de Mme Garcia (démo de Vence), aux trois fenêtres de la tablette :
// rien ne défile avec le bouton en plus (M148 B). `E2E_CAPTURES=1` range deux captures dans
// `missions/maquettes/`.

// Pour les captures : la barre d'outils de Vercel, posée sur toute prévisualisation, n'est pas l'outil.
const HIDE_PREVIEW_TOOLBAR = 'vercel-live-feedback { display: none !important; }';

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
    // La scène du Live, sur son introduction (et non la page de lancement, qui a aussi un bouton plein).
    const main = page.locator('main');
    await expect(main).toHaveAttribute('data-live-page', 'intro', { timeout: 90_000 });
    await main.locator('button.btn-filled').first().click();
    await expect(main).not.toHaveAttribute('data-live-page', 'intro', { timeout: 30_000 });

    // Jusqu'à la première question (« Votre bien » : oui ; un écran sans question : continuer).
    for (let step = 0; step < 8; step += 1) {
      const type = (await main.getAttribute('data-live-page')) ?? '';
      if (type === 'seller_perceived_price') break;
      const yes = main.locator('input[name="seller_property_confirmed"][value="yes"]');
      if ((await yes.count()) > 0 && !(await yes.first().isChecked())) {
        await yes.first().locator('xpath=ancestor::label[1]').click();
      }
      await page.getByTestId('live-validate').click();
      await expect(main).not.toHaveAttribute('data-live-page', type, { timeout: 30_000 });
    }
    await expect(main).toHaveAttribute('data-live-page', 'seller_perceived_price', {
      timeout: 30_000,
    });

    const button = page.getByTestId('live-see-prices-first');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Voir les biens et leurs prix');
    // Le seul bouton plein reste « Valider », et rien ne défile avec le bouton en plus.
    await expect(main.locator('.btn-filled')).toHaveCount(0);
    for (const size of TABLETS) {
      await page.setViewportSize(size);
      await expectNoVerticalScroll(page, `Votre valeur perçue (${size.width} × ${size.height})`);
      await expectNoHorizontalScroll(page, `Votre valeur perçue (${size.width} × ${size.height})`);
    }
    await page.setViewportSize(TABLETS[0]);
    if (process.env.E2E_CAPTURES === '1') {
      await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
      await page.screenshot({ path: 'missions/maquettes/L1-live-valeur-percue.png' });
    }

    // Un premier toucher ne change rien : il demande. « Revenir à la question » le referme.
    await button.click();
    await expect(page.getByTestId('live-see-prices-confirm')).toHaveText('Oui, voir les prix');
    await expect(main).toHaveAttribute('data-live-page', 'seller_perceived_price');
    for (const size of TABLETS) {
      await page.setViewportSize(size);
      await expectNoVerticalScroll(page, `La confirmation (${size.width} × ${size.height})`);
    }
    await page.setViewportSize(TABLETS[0]);
    await page.getByTestId('live-see-prices-back').click();
    await expect(page.getByTestId('live-see-prices-confirm')).toHaveCount(0);
    await page.getByTestId('live-see-prices-first').click();
    await page.getByTestId('live-see-prices-confirm').click();

    // Le premier concurrent, en présentation directe : son prix est là, sans rien deviner.
    await expect(main).toHaveAttribute('data-live-page', 'comparable_direct', { timeout: 30_000 });
    await expect(main).toContainText('€');
    await expect(main.locator('input[data-price-for]')).toHaveCount(0);
    await expect(page.locator('[data-live-step]')).toContainText('1');
    for (const size of TABLETS) {
      await page.setViewportSize(size);
      await expectNoVerticalScroll(page, `Premier bien (${size.width} × ${size.height})`);
    }
    await page.setViewportSize(TABLETS[0]);
    if (process.env.E2E_CAPTURES === '1') {
      await page.screenshot({ path: 'missions/maquettes/L1-live-premier-bien.png' });
    }

    // « Voir l'annonce », d'un toucher : dans la démo, la copie d'ACM s'ouvre (aucun portail).
    await page.getByTestId('live-listing-open').first().click();
    await expect(page.getByTestId('live-listing-copy')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('live-listing-price')).toContainText('€');
    if (process.env.E2E_CAPTURES === '1') {
      await page.screenshot({ path: 'missions/maquettes/L1-live-voir-l-annonce.png' });
    }
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('live-listing-copy')).toHaveCount(0);

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

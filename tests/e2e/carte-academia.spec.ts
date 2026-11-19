import { expect, test, type Page } from '@playwright/test';

import { demoCredentials, expectOneFilled, login, resetDemoByScreen } from './support';

// Correctifs 161 — la carte « Le bien dans Academia » de Bien vendeur (maquette C161-1), sur l'URL
// d'essai, avec le compte de l'agence de démonstration (qui a l'accès à l'API, par sa clé d'essai) :
//   1. ni « Dossier d'adresse ↗ », ni « Vivre ici ↗ », ni l'adresse copiée ; la phrase du haut mène
//      à « Avant le rendez-vous » ; pas de « Coller le lien à la main » tant qu'Academia répond ;
//   2. une adresse tapée et pas encore enregistrée : « Enregistrez d'abord la fiche » ;
//   3. après « Enregistrer », la carte se met à jour seule, sans recharger.
// Aucun appel à Academia : le lien n'est jamais créé ici.

async function dossierId(page: Page, stage: string): Promise<string> {
  await page.goto('/ma-demo');
  const href = await page
    .locator(`[data-testid="demo-dossier"][data-stage="${stage}"]`)
    .first()
    .locator('a')
    .getAttribute('href');
  const id = /\/builder\/([^/]+)/.exec(href ?? '')?.[1];
  expect(id, `Le dossier de démo « ${stage} » est introuvable`).toBeTruthy();
  return id as string;
}

test('la carte Academia : sans les boutons, « Enregistrez d’abord la fiche », à jour après « Enregistrer »', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  const garcia = await dossierId(page, 'ready');
  const toPrepare = await dossierId(page, 'to_prepare');

  await test.step('Une adresse enregistrée : la carte sans les deux boutons', async () => {
    await page.goto(`/builder/${garcia}/property`);
    const card = page.getByTestId('academia-card');
    await expect(card).toContainText('Le dossier d’adresse d’Academia se lit sur');
    await expect(card.getByRole('link', { name: 'Avant le rendez-vous' })).toHaveAttribute(
      'href',
      `/builder/${garcia}/avant-rendez-vous`,
    );
    await expect(card.getByTestId('academia-address')).toHaveCount(0);
    await expect(card.getByTestId('academia-living')).toHaveCount(0);
    await expect(card).not.toContainText('Adresse copiée en un toucher');
    await expect(card.getByTestId('living-here-create')).toBeVisible();
    await expect(card.getByTestId('living-here-fallback')).toHaveCount(0);
    await expectOneFilled(page, 'Bien vendeur');
  });

  await test.step('L’adresse modifiée, pas encore enregistrée : le dire', async () => {
    const card = page.getByTestId('academia-card');
    const street = page.locator('#champ-address');
    const saved = await street.inputValue();
    await street.fill(`${saved} bis`);
    await expect(card.getByTestId('living-here-save-first')).toHaveText(
      'Enregistrez d’abord la fiche : le lien se crée sur l’adresse enregistrée du bien (vous l’avez modifiée).',
    );
    await expect(card.getByTestId('living-here-create')).toHaveCount(0);
    // Revenue à l'adresse enregistrée : la carte d'avant, sans rien enregistrer.
    await street.fill(saved);
    await expect(card.getByTestId('living-here-create')).toBeVisible();
  });

  try {
    await test.step('Sans adresse : tapée, « Enregistrez d’abord la fiche » ; enregistrée, à jour', async () => {
      await page.goto(`/builder/${toPrepare}/property`);
      const card = page.getByTestId('academia-card');
      await expect(card.getByTestId('living-here-no-address')).toContainText(
        'Il faut l’adresse du bien pour créer le lien.',
      );
      await page.locator('#champ-address').fill('9 avenue des Mimosas');
      await page.locator('#champ-city').fill('Antibes');
      await expect(card.getByTestId('living-here-save-first')).toHaveText(
        'Enregistrez d’abord la fiche : le lien se crée sur l’adresse enregistrée du bien.',
      );
      await expect(card.getByTestId('living-here-no-address')).toHaveCount(0);
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
      // Sans recharger : la carte relit l'adresse enregistrée.
      await expect(card.getByTestId('living-here-create')).toBeVisible({ timeout: 30_000 });
      await expect(card.getByTestId('living-here-save-first')).toHaveCount(0);
      await expect(card.getByTestId('living-here-no-address')).toHaveCount(0);
    });

    await test.step('Avant le rendez-vous : plus de « Ventes réelles dans Academia ↗ »', async () => {
      await page.goto(`/builder/${garcia}/avant-rendez-vous`);
      await expect(page.getByRole('heading', { name: /Votre décision de prix/ })).toBeVisible();
      await expect(page.getByTestId('academia-sales')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText('Ventes réelles dans Academia');
    });
  } finally {
    // La démo garde son dossier « à préparer » sans adresse : remise à zéro par l'écran, même en
    // échec.
    await resetDemoByScreen(page);
  }
});

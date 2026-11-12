import { expect, test, type Page } from '@playwright/test';

import { demoCredentials, login, resetDemoByScreen } from './support';

// Mission 154 (point 3, planche M154-2) — le bon de la tournée, ouvert sur l'essai seulement
// (éteint en production) : la tournée des Keller réunit le mandat de Mougins (mandat de vente de
// l'agence), la maison de Mougins en exclusivité chez « Agence Littoral & Pins » (collaboration)
// et celle de Mouans-Sartoux (mandat de recherche) ; chaque bien sa ligne et son titre, les trois
// phrases une fois chacune.

async function draw(page: Page, testId: string): Promise<void> {
  const canvas = page.getByTestId(testId);
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + box.height / 2);
  await page.mouse.down();
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(box.x + 30 + step * 15, box.y + box.height / 2 + (step % 2 ? 18 : -18));
  }
  await page.mouse.up();
}

test('le bon de la tournée : trois titres sur un seul bon', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  await page.goto('/acquereurs?vue=agence');
  await page.getByRole('link', { name: 'Famille Keller', exact: true }).click();
  await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}$/);
  await page.goto(`${new URL(page.url()).pathname}/bon-de-visite`);
  const form = page.getByTestId('voucher-form');
  await expect(form).toBeVisible();

  const mandate = form.getByTestId('voucher-visit').filter({ hasText: /210\sm²/ });
  const colleague = form.getByTestId('voucher-visit').filter({ hasText: /220\sm²/ });
  const search = form.getByTestId('voucher-visit').filter({ hasText: 'Mouans-Sartoux' });

  await test.step('La tournée cochée d’office ; le mandat, déjà visité, se coche à la main', async () => {
    await expect(colleague.getByRole('checkbox')).toBeChecked();
    await expect(search.getByRole('checkbox')).toBeChecked();
    await expect(mandate.getByRole('checkbox')).not.toBeChecked();
    await expect(mandate.getByRole('checkbox')).toBeEnabled();
    await mandate.getByRole('checkbox').check();
    await expect(mandate.getByTestId('voucher-mandate')).toHaveValue('M-2026-0142');
    // Deux blocs « À quel titre ? », un par bien hors mandat ; rien de coché d'avance.
    await expect(form.getByTestId('outside-title')).toHaveCount(2);
    await expect(form.getByTestId('voucher-missing-titles')).toContainText('Il manque : le titre');
    await expect(form.getByTestId('voucher-sign')).toBeDisabled();
  });

  await test.step('Un titre par bien, chacun sa ligne', async () => {
    const colleagueTitle = colleague.getByTestId('outside-title');
    await colleagueTitle.getByTestId('outside-title-colleague').check();
    await colleagueTitle.getByTestId('outside-colleague-agency').fill('Agence Littoral & Pins');
    await colleagueTitle.getByTestId('outside-colleague-number').fill('V-4471');
    const searchTitle = search.getByTestId('outside-title');
    await searchTitle.getByTestId('outside-title-search').check();
    await searchTitle.getByTestId('outside-search-number').fill('R-2026-031');
    await searchTitle.getByTestId('outside-search-date').fill('2026-11-04');
    for (const bien of [colleague, search]) {
      const address = bien.getByTestId('voucher-bien-address');
      if ((await address.inputValue()).trim() === '') {
        await address.fill('8 allée des Cistes Blancs, 06370 Mouans-Sartoux');
      }
    }
    await expect(form.getByTestId('voucher-missing-titles')).toHaveCount(0);
    const preview = form.getByTestId('voucher-outside-preview');
    await expect(preview).toContainText("Mandat de vente de l'Agence n° M-2026-0142");
    await expect(preview).toContainText('En collaboration avec Agence Littoral & Pins');
    await expect(preview).toContainText('Mandat de recherche n° R-2026-031 du 04/11/2026');
    for (const kind of ['sale', 'search', 'colleague']) {
      await expect(preview.getByTestId(`voucher-tour-phrase-${kind}`)).toHaveCount(1);
    }
  });

  await test.step('Signé : le document de la tournée', async () => {
    await expect(form.getByTestId('voucher-visitor-1')).not.toHaveValue('');
    await form.getByTestId('voucher-approved').check();
    await draw(page, 'voucher-signature-1');
    await form.getByTestId('voucher-sign').click();
    await expect(page.getByTestId('voucher-signed')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('link', { name: 'Voir et imprimer le bon' }).click();
    const document = page.getByTestId('voucher-document');
    await expect(document).toContainText(
      "que l'Agence me présente en vertu du titre indiqué pour chacun d'eux.",
    );
    await expect(document).toContainText("Mandat de vente de l'Agence n° M-2026-0142");
    await expect(document).toContainText(
      'En collaboration avec Agence Littoral & Pins, mandat de vente n° V-4471',
    );
    await expect(document).toContainText('Mandat de recherche n° R-2026-031 du 04/11/2026');
    await expect(document).toContainText(
      "Pour les biens que l'Agence a en mandat de vente, je suis informé(e)",
    );
    await expect(document).toContainText(
      'Pour les biens présentés au titre de mon mandat de recherche, je reconnais',
    );
    await expect(document).toContainText(
      "Pour chaque bien présenté en collaboration, je suis informé(e) que le vendeur a confié un mandat de vente à l'agence indiquée sur sa ligne",
    );
    await expect(document).not.toContainText('Numéro du mandat');
  });

  // La page du bon signé n'a pas le menu : la remise à zéro part d'une page de l'application.
  await page.goto('/aujourdhui');
  await resetDemoByScreen(page);
});

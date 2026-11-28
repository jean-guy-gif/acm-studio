import { expect, test, type Page } from './test';

import { demoCredentials, expectOneFilled, login, resetDemoByScreen, reveal } from './support';

// Lot C (maquette C0, validée par Jean-Guy le 28/11) — la vie du mandat côté vendeur, jouée sur la
// démo remise à zéro :
// - M. Lefebvre (Mougins), l'offre de la famille Keller acceptée : « Noter le compromis » est la
//   prochaine étape et le seul bouton plein ; la saisie s'ouvre sur place et le prend ; le
//   compromis noté, le dossier passe « Sous compromis » et l'acte est à préparer ; « Le compromis
//   est tombé » ramène l'offre acceptée ;
// - M. et Mme Castel (Valbonne), mandat signé : la fin du mandat en mois, avec la reconduction
//   tacite ; un avenant de baisse refusé au-dessus du prix, posé dessous, puis retiré ; la fin
//   sans vente, puis annulée.

const parisDay = (offset = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
    new Date(Date.now() + offset * 86_400_000),
  );

async function dossierId(page: Page, seller: string): Promise<string> {
  await page.goto('/ma-demo');
  const href = await page
    .locator('[data-testid="demo-dossier"][data-stage="signed"]')
    .filter({ hasText: seller })
    .first()
    .locator('a')
    .getAttribute('href');
  const id = /\/builder\/([^/?#]+)/.exec(href ?? '')?.[1];
  expect(id, `Le mandat de démo de ${seller} est introuvable`).toBeTruthy();
  return id as string;
}

test('la vie du mandat : le compromis, la fin du mandat, un avenant, la fin sans vente', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  await page.setViewportSize({ width: 1280, height: 1100 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  const mougins = await dossierId(page, 'M. Lefebvre');
  const valbonne = await dossierId(page, 'M. et Mme Castel');

  const section = page.getByTestId('son-mandat');
  const nextTitle = page.getByTestId('overview-next-step-title');
  const current = section.locator('[data-testid="mandate-step"][data-status="current"]');

  // M. Lefebvre : l'offre acceptée, le Point marché arrêté.
  await page.goto(`/builder/${mougins}`);
  await expect(nextTitle).toHaveText('Noter le compromis');
  await expect(current).toContainText('Offre acceptée');
  await expect(section.locator('[data-row="market"]')).toContainText('arrêté à l’offre acceptée');
  await expect(section.locator('[data-row="offer"]')).toContainText('Famille Keller');
  await expectOneFilled(page, 'Le dossier à l’offre acceptée');

  // « Noter le compromis » : la saisie, sur place, porte le seul bouton plein.
  await page.getByTestId('mandate-next-action').click();
  const compromise = page.getByTestId('mandate-form-compromis');
  await expect(compromise).toBeVisible();
  await expectOneFilled(page, 'La saisie du compromis');
  await expect(
    compromise.getByRole('radio', { name: /Famille Keller · offre acceptée/ }),
  ).toBeChecked();
  await compromise.getByTestId('mandate-compromise-date').fill(parisDay());
  await compromise.getByTestId('mandate-deed-planned').fill(parisDay(45));
  await compromise.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(compromise).toBeHidden();
  await expect(current).toContainText('Sous compromis');
  await expect(nextTitle).toContainText('Préparer l’acte');
  await expect(section.locator('[data-row="compromise"]')).toContainText('Famille Keller');
  await expect(section.locator('[data-row="market"]')).toContainText('arrêté à l’offre acceptée');
  await expectOneFilled(page, 'Le dossier sous compromis');

  // Côté acquéreur (question 17) : la fiche des Keller voit le compromis ; il ne quitte plus la
  // vente d'ici (question 18).
  await page.goto('/acquereurs?vue=agence&q=keller');
  await page.getByRole('link', { name: 'Famille Keller', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('Famille Keller');
  const keller = page.url();
  await expect(page.getByTestId('buyer-compromise')).toContainText('Compromis signé');
  const held = page.getByTestId('buyer-status-held');
  await reveal(held);
  await expect(held).toContainText('Un compromis est noté pour lui');
  await expect(
    page.getByTestId('buyer-status').getByRole('button', { name: /L’offre est tombée/ }),
  ).toHaveCount(0);
  await page.goto(`/builder/${mougins}`);

  // « Le compromis est tombé », confirmé dans l'écran : l'offre acceptée revient.
  await section.getByTestId('mandate-confirm-tombe').click();
  await page.getByTestId('mandate-confirm-tombe-yes').click();
  await expect(nextTitle).toHaveText('Noter le compromis');
  await expect(current).toContainText('Offre acceptée');
  await expect(section.locator('[data-row="compromise"]')).toHaveCount(0);
  // La fiche des Keller : « Noter le compromis » de nouveau, et « L'offre est tombée » revient.
  await page.goto(keller);
  await expect(page.getByTestId('buyer-note-compromise')).toBeVisible();
  const status = page.getByTestId('buyer-status');
  await reveal(status);
  await expect(status.getByRole('button', { name: /L’offre est tombée/ })).toBeVisible();

  // M. et Mme Castel : la fin du mandat, trois mois après la signature, reconduction tacite.
  await page.goto(`/builder/${valbonne}`);
  await expect(current).toContainText('Mandat signé');
  await section.getByTestId('mandate-open-fin').click();
  const end = page.getByTestId('mandate-form-fin');
  await end.getByTestId('mandate-end-months').fill('3');
  await expect(end.getByTestId('mandate-end-date')).not.toHaveValue('');
  await end.getByTestId('mandate-end-tacit').check();
  await end.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(end).toBeHidden();
  const endRow = section.locator('[data-row="end"]');
  await expect(endRow).toContainText('3 mois après la signature');
  await expect(endRow).toContainText('reconduction tacite');

  // Un avenant de baisse : refusé au-dessus du prix du mandat, posé dessous, puis retiré.
  const priceRow = section.locator('[data-row="price"]');
  const signedPrice = await priceRow.getByTestId('mandate-row-value').textContent();
  await section.getByTestId('mandate-open-avenant').click();
  const amendment = page.getByTestId('mandate-form-avenant');
  const price = amendment.locator('[data-price-for="mandate_amendment_price"]');
  await price.fill('9999999');
  await amendment.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(amendment.getByTestId('mandate-error')).toContainText('sous le prix du mandat');
  await price.fill('1500000');
  await amendment.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(amendment).toBeHidden();
  await expect(priceRow.getByTestId('mandate-row-value')).toHaveText(
    /^1\s500\s000\s€ depuis l’avenant du /,
  );
  await priceRow.getByTestId('mandate-confirm-retirer-avenant').click();
  await page.getByTestId('mandate-confirm-retirer-avenant-yes').click();
  await expect(priceRow.getByTestId('mandate-row-value')).toHaveText(signedPrice ?? '');

  // La fin sans vente : le dossier rejoint le Suivi ; « Annuler » la défait.
  await section.getByTestId('mandate-open-terminer').click();
  const ended = page.getByTestId('mandate-form-terminer');
  await ended.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(ended).toBeHidden();
  await expect(nextTitle).toHaveText('Voir le Suivi');
  await expect(section.locator('[data-row="ended"]')).toContainText('Mandat terminé sans vente');
  await expectOneFilled(page, 'Le mandat terminé sans vente');
  await section.getByTestId('mandate-confirm-annuler-fin').click();
  await page.getByTestId('mandate-confirm-annuler-fin-yes').click();
  await expect(current).toContainText('Mandat signé');
});

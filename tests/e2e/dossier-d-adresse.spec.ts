import { expect, test, type Page } from '@playwright/test';

import { demoCredentials, goViaAccountMenu, login } from './support';

// Mission 141 — le dossier d'adresse, sur l'URL d'essai, avec le compte de l'agence de
// démonstration : aucun appel aux sources publiques (le jeu figé de Vence, M114). Le dossier « Prêt
// pour le Live » (Vence) : « Construire le dossier d'adresse » sur l'onglet Bien vendeur, ses blocs
// et leurs sources, puis la ligne des ventes réelles sur « Avant le rendez-vous », qui suit la
// frappe de l'analyse de valeur. La démo est remise à zéro d'abord.

async function freshReadyDossier(page: Page): Promise<string> {
  await goViaAccountMenu(page, 'Ma démo');
  await expect(page).toHaveURL(/\/ma-demo$/);
  const hrefs = () =>
    page
      .getByTestId('demo-dossier')
      .evaluateAll((items) => items.map((item) => item.querySelector('a')?.getAttribute('href')));
  const before = await hrefs();
  if (before.length === 0) {
    await page.getByRole('button', { name: 'Préparer ma démo' }).click();
  } else {
    await page.getByRole('button', { name: 'Remettre ma démo à zéro' }).click();
    await page
      .getByTestId('demo-reset-confirm')
      .getByRole('button', { name: 'Remettre à zéro' })
      .click();
    await expect.poll(async () => (await hrefs())[0], { timeout: 180_000 }).not.toBe(before[0]);
  }
  await expect(page.getByTestId('demo-dossier')).toHaveCount(6, { timeout: 180_000 });
  const href = await page
    .locator('[data-testid="demo-dossier"][data-stage="ready"] a')
    .first()
    .getAttribute('href');
  const id = /\/builder\/([^/]+)\//.exec(href ?? '')?.[1];
  expect(id, 'Le dossier de démo « Prêt pour le Live » est introuvable').toBeTruthy();
  return id as string;
}

const plain = (text: string) => text.replace(/[  ]/g, ' ');

test('le dossier d’adresse : construit sur Bien vendeur, lu sur « Avant le rendez-vous »', async ({
  page,
}) => {
  await login(page, demoCredentials());
  const projectId = await freshReadyDossier(page);

  await test.step('Avant construction, « Avant le rendez-vous » mène à l’onglet Bien vendeur', async () => {
    await page.goto(`/builder/${projectId}/avant-rendez-vous`);
    await expect(page.getByTestId('real-sales-missing')).toContainText(
      'construisez le dossier d’adresse sur l’onglet Bien vendeur',
    );
  });

  await test.step('Construire le dossier d’adresse, sur l’onglet Bien vendeur', async () => {
    await page.goto(`/builder/${projectId}/property`);
    const dossier = page.getByTestId('address-dossier');
    await expect(dossier).toContainText('pour vous seul, rien n’en est montré au vendeur');
    await dossier.getByTestId('address-dossier-build').click();
    await expect(dossier.getByTestId('address-dossier-built')).toBeVisible({ timeout: 60_000 });
    await expect(dossier.getByTestId('address-dossier-build')).toHaveText('Actualiser');

    const sales = dossier.getByTestId('address-dossier-sales');
    await expect(sales).toHaveAttribute('data-state', 'ok');
    expect(plain(await sales.innerText())).toContain('Médiane 4 896 €/m²');
    expect(plain(await sales.innerText())).toContain(
      'La moitié des ventes entre 4 623 €/m² et 6 654 €/m² · 12 ventes',
    );
    await expect(sales).toContainText('Ventes de maisons à 500 m');
    await expect(sales).toContainText('DVF');
    await expect(sales.locator('tbody tr')).toHaveCount(12);

    await expect(dossier.getByTestId('address-dossier-risks')).toContainText('Sismicité : zone 4');
    await expect(dossier.getByTestId('address-dossier-urbanism')).toContainText(
      'Zone du PLU : UFb4',
    );
    // Une adresse inventée : rien trouvé, et la parcelle n'est jamais devinée.
    await expect(dossier.getByTestId('address-dossier-dpe')).toContainText(
      'Rien trouvé à cette adresse.',
    );
    await expect(dossier.getByTestId('address-dossier-parcel')).toContainText(
      'Parcelle à vérifier au cadastre.',
    );
    await expect(dossier.getByTestId('address-dossier-condo')).toContainText(
      'Aucune copropriété immatriculée à cette adresse.',
    );
    // Jamais une estimation, jamais « fourchette » : ce sont les mots du conseiller seul.
    await expect(dossier).not.toContainText(/estimation|fourchette/i);
  });

  await test.step('La ligne des ventes réelles suit la frappe de l’analyse de valeur', async () => {
    await page.goto(`/builder/${projectId}/avant-rendez-vous`);
    const line = page.getByTestId('real-sales-line');
    await expect(line).toBeVisible();
    expect(plain(await line.innerText())).toContain(
      'Ventes réelles à 500 m : médiane 4 896 €/m² (12 ventes)',
    );
    const analysis = page.getByPlaceholder('Votre avis, en euros');
    await analysis.fill('735000');
    await expect
      .poll(async () => plain(await line.innerText()))
      .toContain('votre analyse de valeur : 5 444 €/m², au-dessus de la médiane.');
    await analysis.fill('950000');
    await expect
      .poll(async () => plain(await line.innerText()))
      .toContain('dans le quart le plus cher.');
  });
});

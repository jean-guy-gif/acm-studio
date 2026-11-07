import { expect, test, type Page } from '@playwright/test';

import { demoCredentials, goViaAccountMenu, login } from './support';

// Mission 140 B — l'acquéreur dans sa langue, sur l'URL d'essai, avec le compte de l'agence de
// démonstration (rien d'extérieur, rien de payant : le marché y est simulé). « Mr and Mrs Wilson »
// préfèrent l'anglais : leurs biens idéaux retenus, leur dossier, son lien et son message, son lien
// ouvert sur un téléphone et la présentation sont en anglais ; l'écran du conseiller reste en
// français. La démo est remise à zéro d'abord.

async function resetDemo(page: Page): Promise<void> {
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
}

test('la langue de l’acquéreur : les Wilson, leur dossier, son lien et la présentation en anglais', async ({
  page,
}) => {
  await login(page, demoCredentials());
  await resetDemo(page);

  let buyerUrl = '';
  await test.step('Les biens idéaux des Wilson, retenus (l’écran du conseiller en français)', async () => {
    await page.goto('/acquereurs');
    const link = page.getByRole('link', { name: 'Mr and Mrs Wilson' }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]+$/);
    buyerUrl = new URL(page.url()).pathname;
    await page.goto(`${buyerUrl}/biens-ideaux`);
    await page.getByRole('button', { name: 'Trouver sur le marché' }).click();
    await page
      .getByTestId('ideal-paid-confirm')
      .getByRole('button', { name: 'Lancer et payer' })
      .click();
    await expect(page.getByTestId('ideal-market-summary')).toBeVisible({ timeout: 60_000 });
    const hits = page.getByTestId('ideal-market-hit');
    await expect(hits.first()).toBeVisible();
    // Mission 142 — « Préparer ma démo » leur a déjà retenu l'appartement d'Antibes qu'ils vont
    // visiter : un bien du marché s'y ajoute.
    await expect(page.getByTestId('ideal-current-item')).toHaveCount(1);
    await hits.first().getByRole('checkbox').click();
    await expect(page.getByTestId('ideal-current-item')).toHaveCount(2);
    await page.getByTestId('ideal-retain').click();
    await expect(page.getByTestId('ideal-saved')).toContainText('Sélection retenue : 2 biens.');
  });

  let dossierLink = '';
  await test.step('Le dossier en anglais, son message en anglais', async () => {
    await page.goto(`${buyerUrl}/dossier`);
    const dossier = page.getByTestId('buyer-dossier');
    await expect(dossier).toContainText('Your selection of');
    await expect(dossier).toContainText('You told me:');
    await expect(dossier).toContainText('My choices');
    await expect(dossier.getByText('Vous m’avez dit')).toHaveCount(0);
    // Les mentions légales de l'agence restent en français.
    await expect(dossier).toContainText(/Carte professionnelle|Ne peut recevoir aucun fonds/);
    await page.getByRole('button', { name: /Créer un lien pour l’acquéreur/ }).click();
    dossierLink = (await page.getByTestId('dossier-link').innerText()).trim();
    expect(dossierLink).toMatch(/\/dossier\/[A-Za-z0-9_-]{43}$/);
    await expect(page.getByTestId('dossier-link-message')).toContainText(
      `Hello, here are the properties I have selected for you: ${dossierLink}`,
    );
  });

  await test.step('Le lien, ouvert sur un téléphone, en anglais', async () => {
    const bypass = process.env.E2E_VERCEL_BYPASS;
    const phone = await page
      .context()
      .browser()!
      .newContext({
        viewport: { width: 390, height: 844 },
        ...(bypass ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': bypass } } : {}),
      });
    try {
      const visitor = await phone.newPage();
      await visitor.goto(dossierLink);
      await expect(visitor).toHaveTitle(/Your selection/);
      await expect(visitor.getByTestId('dossier-link-cover')).toContainText('Your selection of');
      await visitor.getByTestId('dossier-start').click();
      await expect(visitor.getByText('Your criteria').first()).toBeVisible();
      await expect(visitor.getByTestId('grid-legend').first()).toContainText('must-have');
      await expect(visitor.getByText('Vos critères')).toHaveCount(0);
    } finally {
      await phone.close();
    }
  });

  await test.step('La présentation en anglais, sa préparation en français', async () => {
    const buyerId = buyerUrl.split('/').pop();
    await page.goto(`/presentation/${buyerId}`);
    await expect(page.getByTestId('deck-prelude')).toBeVisible();
    // Les écrans du conseiller restent en français, critères compris (décision du 07/11).
    const header = page.getByTestId('deck-prepare-item').first().locator('div').first();
    await expect(header).toContainText(/^Bien A · .*pièces?/);
    await expect(header).toContainText(/critères? sur/);
    await expect(header).not.toContainText(/Apartment|House|rooms?\b/);
    await page.getByRole('button', { name: 'Commencer la présentation' }).click();
    await expect(page.getByRole('heading', { name: 'You told me:' })).toBeVisible();
    await expect(page.getByTestId('deck-kicker')).toContainText('Your selection · 2 properties');
    await page.getByTestId('presentation-next').click();
    await expect(page.getByTestId('deck-kicker')).toHaveText('Your criteria');
  });
});

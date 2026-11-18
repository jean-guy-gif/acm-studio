import { expect, test } from '@playwright/test';

import {
  demoCredentials,
  expectPhotosLoaded,
  goViaAccountMenu,
  login,
  resetDemoByScreen,
} from './support';

// Mission 147 (partie B) — chaque concurrent semé par la démo a une photo qui se charge : sur la
// page Concurrents de chaque dossier, dans chaque courrier de Prospection (les photos de l'annonce,
// à choisir), et dans le Dossier acquéreur des Keller (le document que reçoit l'acquéreur). La
// démo est remise à zéro par l'écran d'abord. Rien d'extérieur, rien de payant.

test('la démo : une photo chargée pour chaque concurrent montré', async ({ page }) => {
  // Mission 155 — douze dossiers, huit mandats : plus de pages à parcourir.
  test.setTimeout(10 * 60_000);
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  await goViaAccountMenu(page, 'Ma démo');
  await expect(page.getByTestId('demo-dossier')).toHaveCount(12);
  const ids = (
    await page
      .locator('[data-testid="demo-dossier"]:not([data-stage="to_prepare"]) a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
  )
    .map((href) => /\/builder\/([^/]+)/.exec(href)?.[1])
    .filter((id): id is string => Boolean(id));
  // Le dossier à relancer s'ouvre depuis le Suivi (« Ma démo » y mène).
  await page.goto('/suivi');
  const followUp = page.getByTestId('suivi-row').filter({ hasText: 'M. et Mme Lambert-Duval' });
  // Mission 160 — « Ouvrir le dossier → » est sur la carte, en dernier de ses liens.
  const followUpHref = await followUp.getByTestId('suivi-open-project').getAttribute('href');
  ids.push(/\/builder\/([^/]+)/.exec(followUpHref ?? '')?.[1] ?? '');
  expect(ids.filter(Boolean)).toHaveLength(11);
  for (const id of ids) {
    await page.goto(`/builder/${id}/comparables`);
    await expect(page.locator('main li img').first()).toBeVisible();
    await expectPhotosLoaded(page.locator('main'), `Concurrents ${id}`, 5);
  }
  // Prospection : chaque courrier propose les photos de l'annonce de son concurrent.
  await page.goto('/prospection');
  const letters = await page
    .getByRole('link', { name: 'Préparer le dossier', exact: true })
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  expect(letters.length).toBeGreaterThan(0);
  for (const href of letters) {
    await page.goto(href);
    await expect(page.getByRole('img', { name: /de son annonce$/ }).first()).toBeVisible();
    await expectPhotosLoaded(page.locator('body'), `Courrier ${href}`, 2);
    const listing = await page
      .getByRole('img', { name: /de son annonce$/ })
      .evaluateAll((images) =>
        (images as HTMLImageElement[]).map((image) => image.naturalWidth > 0),
      );
    expect(listing.length, `Courrier ${href} : aucune photo de l’annonce`).toBeGreaterThan(0);
    expect(listing.every(Boolean), `Courrier ${href} : une photo de l’annonce cassée`).toBe(true);
  }
  await page.goto('/acquereurs?vue=agence');
  await page.getByRole('link', { name: 'Famille Keller' }).first().click();
  await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]+$/);
  await page.goto(`${new URL(page.url()).pathname}/dossier`);
  await expectPhotosLoaded(page.locator('body'), 'Dossier acquéreur des Keller', 3);
});
